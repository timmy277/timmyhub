---
title: ADR-0011 — Chiến lược audit log
status: accepted
owner: Backend Lead
updated: 2026-09-16
related: [docs/01-architecture/observability.md, docs/01-architecture/rbac-advanced.md, docs/01-architecture/adr/ADR-0002-database-per-service.md]
---

# ADR-0011 — Chiến lược audit log

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Backend Lead

## Bối cảnh

Bản gốc ghi audit bằng `AuditLogInterceptor` gọi thủ công qua decorator `@AuditAction` ở từng controller muốn được
ghi, ghi chung vào log ứng dụng. Hai vấn đề: (1) **thiếu** — quên gắn decorator ở đâu, chỗ đó không có vết, không có
cách nào phát hiện thiếu sót này ngoài review thủ công; (2) **không sống sót** — audit trộn với log ứng dụng nên bị
xoay vòng/xoá theo chính sách retention của log thường (14-30 ngày), trong khi audit trail cần giữ hàng năm.

So sánh chi tiết các phương án nằm ở `docs/01-architecture/observability.md` §4.2 — ADR này chỉ ghi lại quyết định và
lý do chọn, không lặp lại bảng so sánh đầy đủ.

## Quyết định

**`nestjs-cls`** (AsyncLocalStorage giữ `actorId`, `requestId`, `traceId` xuyên suốt request) kết hợp
**Prisma Client Extension** (`$extends` hook vào mọi query ghi) tự động sinh audit record cho danh sách model đã khai
báo, ghi qua **transactional outbox** (cùng transaction với thay đổi nghiệp vụ), publish `EVT-audit.recorded` qua
RabbitMQ, `audit-service` nhận và ghi vào Postgres (bảng partition theo tháng) + index Elasticsearch để tra cứu.

Lý do chọn thay vì cách thủ công kiểu bản gốc: cơ chế này bắt được **mọi** thay đổi qua Prisma tự động, không phụ
thuộc việc ai đó nhớ gắn decorator. Lý do không chọn thư viện cộng đồng có sẵn (`audit-log-nestjs`,
`typeorm-auditing`, `prisma-audit`): sai stack ORM hoặc gần như không còn bảo trì, rủi ro phụ thuộc vào package chết.

## Hệ quả

- Danh sách model nào bắt buộc audit là whitelist tường minh trong extension, không audit mặc định mọi bảng — bảng
  cấu hình ít quan trọng (`FeatureFlag` đọc) không cần audit mỗi lần đọc, chỉ audit khi ghi.
- Bảng audit **không có API sửa/xoá**, chỉ `INSERT` qua consumer.
- `@AuditAction` giữ lại như cơ chế **override tên hành động** cho trường hợp đặc biệt (một request tạo nhiều thay
  đổi Prisma nhưng nghiệp vụ chỉ nên ghi 1 audit record), không phải cơ chế chính.
- Retention ≥ 2 năm, không xoá trừ yêu cầu pháp lý xoá PII — chi tiết đầy đủ ở `observability.md` §4.4.
