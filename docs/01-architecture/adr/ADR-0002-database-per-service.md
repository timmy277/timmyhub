---
title: ADR-0002 — Database-per-service + transactional outbox
status: superseded
owner: Tech Lead
updated: 2026-09-19
related: [docs/01-architecture/adr/ADR-0001-microservices.md, docs/01-architecture/data-architecture.md, docs/01-architecture/communication-patterns.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# ADR-0002 — Database-per-service + transactional outbox

> **Superseded bởi [ADR-0015](ADR-0015-modular-monolith.md) (2026-09-19)** cùng với ADR-0001. Modular monolith dùng
> một database duy nhất; outbox chỉ còn giữ cho hệ quả bất đồng bộ cần đảm bảo (email, webhook, audit), không còn cho
> mọi domain event. Nội dung dưới đây giữ lại để tham chiếu lịch sử, **không còn là quyết định hiệu lực**.

**Trạng thái:** superseded · **Ngày:** 2026-09-16 · **Người quyết:** Tech Lead

## Bối cảnh

ADR-0001 chọn full microservices. Câu hỏi kế tiếp: các service có dùng chung một Postgres instance (schema riêng)
hay chia sẻ hoàn toàn dữ liệu không? Nếu service A query thẳng bảng của service B, ranh giới microservices chỉ còn là
hình thức — deploy tách nhưng dữ liệu vẫn khoá chặt như monolith, mất hết lợi ích cô lập lỗi và scale độc lập.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Một Postgres, schema chung, service tự do query chéo bảng | Đơn giản, giao dịch dễ | Ranh giới ảo; đổi schema của A làm gãy B mà không ai biết trước khi chạy; chính là vấn đề microservices sinh ra để giải quyết |
| B. Một Postgres instance, **schema Postgres riêng cho mỗi service**, cấm query chéo schema bằng quyền DB | Một instance để vận hành (rẻ ở giai đoạn đầu); vẫn ép được ranh giới bằng `GRANT`/`REVOKE` | Vẫn là điểm lỗi đơn (SPOF) cấp instance; nếu sau này cần tách instance theo tải, phải migrate dữ liệu thật |
| **C. Database-per-service** (schema riêng ở dev, sẵn sàng tách instance ở production khi cần) + **transactional outbox** cho mọi event phát ra | Ranh giới dữ liệu thật, ép buộc bởi hạ tầng chứ không chỉ quy ước; scale từng DB độc lập theo tải; outbox đảm bảo event không bao giờ mất dù broker down | Không còn `JOIN` xuyên domain — mọi tổng hợp dữ liệu liên service phải qua read model riêng hoặc gọi API; phải tự xây outbox poller + idempotent consumer |

## Quyết định

Chọn **C**. Dev dùng schema riêng trên cùng cụm Postgres để tiết kiệm chi phí hạ tầng lúc phát triển; production sẵn
sàng tách instance riêng cho service nào cần (trước hết là `order`, `payment`, `catalog` — tải cao nhất).

Mọi service phát event **chỉ** qua outbox: ghi bản ghi event vào bảng `outbox_events` trong **cùng transaction** với
thay đổi nghiệp vụ, một poller riêng đọc bảng này và publish lên RabbitMQ, đánh dấu đã gửi. Vì vậy event không bao giờ
"biến mất" nếu service crash ngay sau khi commit transaction — đây là vấn đề kinh điển của cách phát event "publish
rồi mới commit" hoặc ngược lại.

Consumer phải idempotent: bảng `processed_events(eventId)` kiểm tra trước khi xử lý, tránh xử lý trùng khi RabbitMQ
gửi lại (at-least-once delivery).

## Hệ quả

- **Cấm tuyệt đối**: `service A` mở kết nối trực tiếp tới `database` của `service B`. Vi phạm phát hiện bằng kiểm tra
  `DATABASE_URL` lúc khởi động (chỉ được trỏ tới DB của chính mình) + network policy ở K8s.
- Đọc dữ liệu tổng hợp từ nhiều service (vd trang chi tiết đơn hàng cần cả `order`, `catalog`, `seller`) giải bằng
  **BFF ở gateway gọi song song nhiều service** hoặc **read model không chuẩn hoá** dựng từ event, tuỳ độ phức tạp —
  chốt cụ thể theo từng trường hợp ở `design.md` của domain đó.
- Mọi thay đổi schema là việc nội bộ của một service, không cần đồng bộ với service khác — đây là lợi ích chính đổi
  lấy chi phí ở ADR-0001.

## Điều kiện xem lại

Nếu một cặp service cần đọc dữ liệu của nhau với tần suất quá cao đến mức read model luôn lệch pha đáng kể so với
nguồn, cân nhắc gộp hai service đó lại (hiếm khi cần, nhưng trung thực hơn là ép saga cho mọi thứ).
