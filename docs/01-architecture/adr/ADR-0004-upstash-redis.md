---
title: ADR-0004 — Upstash Redis (REST + TCP) cho cache, rate-limit, BullMQ, socket adapter
status: accepted
owner: Tech Lead
updated: 2026-09-16
related: [docs/01-architecture/adr/ADR-0003-rabbitmq-bullmq.md, docs/01-architecture/realtime.md, docs/05-infra/environments.md]
---

# ADR-0004 — Upstash Redis cho cache, rate-limit, BullMQ, socket adapter

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Tech Lead (người dùng chỉ định dùng Upstash)

## Bối cảnh

Cần Redis cho bốn việc khác nhau: cache (session, dữ liệu tra cứu nóng), rate limiting, hàng đợi BullMQ, và adapter
cho Socket.IO (đồng bộ realtime giữa nhiều instance gateway). Người dùng đã chỉ định Upstash. Điểm cần làm rõ: Upstash
có **hai giao thức truy cập khác nhau**, và không phải mọi việc dùng được cả hai.

## Hai giao thức của Upstash

| Giao thức | Dùng được cho | Không dùng được cho |
|---|---|---|
| **REST API** | Cache đơn giản (get/set/expire), phù hợp môi trường serverless/edge không giữ kết nối lâu | **BullMQ** — BullMQ cần kết nối Redis bền (`ioredis`) hỗ trợ blocking command (`BLPOP`), Lua script, pub/sub; REST không đáp ứng được |
| **TCP (tương thích Redis chuẩn qua `ioredis`)** | Mọi thứ, bao gồm BullMQ, Socket.IO adapter | Không tận dụng được lợi thế "không giữ kết nối" của REST ở môi trường edge |

**Ghi chú quan trọng cần nhớ khi cấu hình**: nếu chọn nhầm biến môi trường REST cho một service dùng BullMQ, job sẽ
không bao giờ được worker nhặt (không lỗi rõ ràng, chỉ đơn giản là hàng đợi không bao giờ chạy) — đây là lỗi cấu hình
dễ mắc và khó phát hiện nhất liên quan tới Upstash.

## Quyết định

Dùng Upstash Redis, phân theo mục đích:

| Việc | Giao thức | Package |
|---|---|---|
| Cache tra cứu (session, dữ liệu ít đổi) từ service chạy trên serverless/edge | REST | `@upstash/redis` |
| Cache từ service chạy dài hạn trong container (không ở edge) | TCP | `ioredis` |
| Rate limiting | REST (dùng `@upstash/ratelimit`, có sẵn thuật toán sliding window) | `@upstash/ratelimit` |
| **BullMQ** | **Bắt buộc TCP** | `ioredis` |
| Socket.IO Redis adapter (đồng bộ realtime đa instance) | **Bắt buộc TCP** | `ioredis` + `@socket.io/redis-adapter` |

Mọi service NestJS trong repo chạy dài hạn trong container (không phải edge function), nên trong thực tế phần lớn
dùng **TCP** cho nhất quán; REST chỉ cân nhắc nếu sau này có phần chạy trên Vercel Edge Function.

## Hệ quả

- `environments.md` phải tách rõ hai biến: `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (REST) và
  `REDIS_TCP_URL` (TCP, dùng cho BullMQ + socket adapter) — không dùng chung một tên biến cho cả hai.
- Test tích hợp BullMQ trong CI dùng Redis thật (testcontainers hoặc Redis service container), không mock, vì hành vi
  blocking command khác nhau đáng kể giữa REST giả lập và TCP thật.
