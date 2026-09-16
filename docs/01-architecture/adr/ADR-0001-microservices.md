---
title: ADR-0001 — Full microservices thay monolith
status: accepted
owner: Tech Lead
updated: 2026-09-16
related: [docs/01-architecture/service-catalog.md, docs/01-architecture/communication-patterns.md, docs/01-architecture/adr/ADR-0002-database-per-service.md]
---

# ADR-0001 — Full microservices thay monolith

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Tech Lead (người dùng đã chốt phương án khi lên plan)

## Bối cảnh

Bản gốc là một NestJS monolith duy nhất, một Postgres duy nhất, ~29 module trong cùng process. Việc này chạy được và
đơn giản để phát triển, nhưng timmy-hub đặt mục tiêu mới: đội nhiều người làm song song trên các domain khác nhau,
scale độc lập (media transcode và catalog có đặc tính tải rất khác nhau), và cô lập lỗi (một domain lỗi không kéo sập
toàn hệ thống).

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ monolith, tách module rõ ràng hơn | Không tốn chi phí vận hành phân tán; giao dịch dễ (1 DB, 1 transaction) | Không scale độc lập được; một lỗi/leak ở một domain ảnh hưởng toàn bộ; đội lớn dễ đụng nhau khi merge |
| B. Modular monolith (module ranh giới rõ, vẫn 1 process/1 DB, chuẩn bị tách sau) | Bước đệm an toàn, chi phí thấp | Ranh giới dễ bị xói mòn nếu không ép buộc bằng hạ tầng; không đạt được scale độc lập ngay |
| **C. Full microservices, database-per-service** | Scale độc lập theo tải thật; cô lập lỗi; đội làm song song không đụng nhau; đúng yêu cầu "trung tâm trao đổi admin-user-seller" quy mô lớn | Chi phí vận hành cao hơn hẳn: cần event bus, outbox, service discovery, nhiều pipeline CI/CD, nhiều DB; giao dịch xuyên domain phải giải bằng saga thay vì transaction DB |

## Quyết định

Chọn **C**. Chấp nhận chi phí vận hành cao hơn để đổi lấy khả năng scale và cô lập lỗi, vì đây là yêu cầu rõ ràng của
dự án ("full microservices 10+ service" — quyết định đã chốt với người dùng trước khi viết plan).

## Chi phí phải trả (nói thẳng, không né)

- **Giao dịch xuyên domain không còn atomic**: checkout chạm `catalog` (kiểm tồn kho), `cart`, `order`, `payment` —
  phải giải bằng saga + compensating action, phức tạp hơn nhiều so với một `$transaction` trong monolith.
- **Độ trễ tăng**: gọi qua RabbitMQ RPC có overhead mạng, khác hẳn gọi hàm trong cùng process.
- **Vận hành nặng hơn**: 17 service (theo `service-catalog.md`) nghĩa là 17 Dockerfile, 17 Deployment K8s, 17 pipeline
  CI/CD theo dõi thay đổi, nhiều DB cần backup/restore riêng.
- **Debug khó hơn**: một lỗi có thể xuyên qua 3-4 service; bắt buộc phải có trace phân tán tốt (`observability.md`)
  ngay từ đầu, không phải "làm sau".
- **Trùng lặp code khó tránh hoàn toàn**: một số logic nhỏ (validate địa chỉ, format tiền) sẽ lặp ở nhiều service dù
  đã có `@timmyhub/common`.

## Điều kiện để coi quyết định này là sai và cần xem lại

Nếu sau 2 sprint đầu, chi phí vận hành (thời gian debug sự cố xuyên service, thời gian thêm 1 tính năng chạm 2+
service) vượt quá lợi ích scale thực tế đo được, cân nhắc gộp lại các service tải thấp, ít thay đổi (`masterdata`,
`audit`) vào chung một deployment unit — vẫn giữ ranh giới code và DB riêng, chỉ gộp process để giảm chi phí vận hành.
