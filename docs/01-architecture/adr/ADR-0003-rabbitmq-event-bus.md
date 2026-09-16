---
title: ADR-0003 — RabbitMQ làm event bus, BullMQ cho job nội bộ
status: accepted
owner: Tech Lead
updated: 2026-09-16
related: [docs/01-architecture/communication-patterns.md, docs/01-architecture/adr/ADR-0002-database-per-service.md, docs/01-architecture/adr/ADR-0004-upstash-redis.md]
---

# ADR-0003 — RabbitMQ làm event bus, BullMQ cho job nội bộ

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Tech Lead

## Bối cảnh

Hai nhu cầu khác nhau cần được phân biệt rõ, vì gộp chung là nguồn nhầm lẫn phổ biến:

1. **Event liên service** — "chuyện đã xảy ra", nhiều service có thể quan tâm, cần đảm bảo thứ tự tương đối theo
   routing key và cần topology linh hoạt (topic exchange, nhiều consumer trên cùng event).
2. **Job nội bộ của một service** — "việc cần làm sau", chỉ chính service đó xử lý (gửi mail, transcode, reindex),
   cần retry có backoff, cần xem hàng đợi trực quan, không cần phát cho ai khác.

## Các phương án đã cân nhắc (cho event bus)

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Kafka | Throughput cực cao, replay log tốt, chuẩn công nghiệp cho event streaming quy mô lớn | Vận hành nặng (Zookeeper/KRaft, partition, consumer group phức tạp); quá cỡ so với tải thực tế của một sàn TMĐT mới; đội nhỏ khó vận hành đúng |
| **B. RabbitMQ (topic exchange)** | Vận hành đơn giản hơn Kafka nhiều; routing key linh hoạt đúng nhu cầu domain event (`order.paid`, `product.approved`); hỗ trợ RPC pattern tiện cho gọi đồng bộ giữa service; đủ throughput cho quy mô dự kiến | Không có replay log dài hạn như Kafka; throughput trần thấp hơn Kafka ở quy mô rất lớn |
| C. NATS / Redis Streams | Nhẹ, nhanh | Hệ sinh thái NestJS cho NATS kém hơn RabbitMQ/Kafka; Redis Streams không có exchange/routing linh hoạt, phải tự xây |

## Quyết định

**RabbitMQ** với topic exchange `timmyhub.events`, routing key dạng `<domain>.<action>` (vd `order.paid`,
`product.approved`). Lý do chính: quy mô hiện tại không cần throughput cấp Kafka, và RabbitMQ có `@golevelup/nestjs-rabbitmq`
tích hợp tốt với NestJS, giảm code hạ tầng phải tự viết. Nếu sau này throughput vượt trần RabbitMQ thực đo được,
đây là ADR đầu tiên cần xem lại — không đoán trước, đo rồi mới đổi.

**BullMQ** (trên Upstash Redis, kết nối TCP — xem ADR-0004) cho job nội bộ: gửi mail, transcode video, reindex
Elasticsearch, tổng hợp báo cáo doanh số định kỳ. BullMQ cho dashboard theo dõi hàng đợi, retry có exponential
backoff, và giới hạn concurrency theo worker — đúng nhu cầu của các job nặng CPU/IO như `media.transcode`.

## Ranh giới rõ giữa hai công cụ

| | RabbitMQ (event) | BullMQ (job) |
|---|---|---|
| Ai phát | Service khi có thay đổi trạng thái nghiệp vụ, qua outbox | Chính service đó, khi cần trì hoãn việc chậm |
| Ai xử lý | Bất kỳ service nào quan tâm (0, 1, hoặc nhiều consumer) | Chỉ worker của chính service đó |
| Đảm bảo | At-least-once, idempotent consumer bắt buộc | At-least-once, có cơ chế retry/backoff/dead-letter của BullMQ |
| Ví dụ | `order.paid` → `notification-service` gửi mail, `analytics-service` cộng doanh số | `notification-service` tự đẩy job "gửi email xác nhận đơn X" vào hàng đợi riêng của nó |

**Sai lầm cần tránh**: dùng BullMQ để "phát sự kiện" cho service khác nghe (BullMQ không có concept nhiều consumer
độc lập trên cùng queue theo kiểu pub/sub — dùng sai mục đích sẽ mất event khi có 2 worker cùng nghe 1 queue).
