---
title: ADR-0015 — Modular monolith thay full microservices
status: accepted
owner: Tech Lead
updated: 2026-09-19
related: [docs/01-architecture/adr/ADR-0001-microservices.md, docs/01-architecture/adr/ADR-0002-database-per-service.md, docs/01-architecture/adr/ADR-0003-rabbitmq-event-bus.md, docs/01-architecture/service-catalog.md, docs/01-architecture/communication-patterns.md, docs/01-architecture/data-architecture.md]
---

# ADR-0015 — Modular monolith thay full microservices

**Trạng thái:** accepted · **Ngày:** 2026-09-19 · **Người quyết:** Tech Lead (người dùng đã chốt sau khi cân nhắc chi
phí vận hành thực tế của ADR-0001)

**Supersedes:** [ADR-0001](ADR-0001-microservices.md), [ADR-0002](ADR-0002-database-per-service.md),
[ADR-0003](ADR-0003-rabbitmq-event-bus.md)

## Bối cảnh

ADR-0001 chọn full microservices (17 đơn vị triển khai, database-per-service, RabbitMQ event bus + RPC) với lý do
scale độc lập và cô lập lỗi. ADR-0001 cũng tự ghi nhận điều kiện xem lại: "nếu chi phí vận hành vượt quá lợi ích scale
thực tế đo được". Trước khi viết một dòng code microservice nào, chi phí đã hiện rõ chỉ qua việc lên kế hoạch dựng
hạ tầng: 16+ database cần backup/restore riêng, RabbitMQ topology (outbox, DLX, idempotent consumer) phải đúng ngay
từ service đầu tiên, distributed tracing bắt buộc "ngay từ đầu, không phải làm sau", và bài toán Supabase không hỗ
trợ tạo nhiều database trong một project (mỗi service muốn có database thật cần một project Supabase riêng, tốn kém
với quy mô đội hiện tại).

Đội hiện tại nhỏ, chưa có áp lực scale độc lập theo tải thật (chưa có traffic để đo), và giá trị chính người dùng cần
lúc này là **giao hàng nhanh, ranh giới domain rõ trong code** — chưa cần ranh giới ở cấp hạ tầng.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ nguyên ADR-0001 (full microservices) | Đúng kế hoạch gốc; scale độc lập nếu sau này cần | Chi phí vận hành cao ngay từ ngày đầu (16+ DB, RabbitMQ, saga, tracing) trong khi chưa có tải thật để chứng minh cần thiết; đội nhỏ dễ sa lầy vào hạ tầng thay vì tính năng |
| B. Tách một phần (`payment` cô lập, còn lại gộp) | Cô lập được domain nhạy cảm nhất (tiền) | Vẫn phải dựng RabbitMQ + outbox cho ít nhất một cặp service; phức tạp vận hành không giảm nhiều so với A |
| **C. Modular monolith** — một NestJS app, module theo domain, một database, gọi module-to-module trong process | Chi phí vận hành thấp nhất (1 Dockerfile, 1 Deployment, 1 database); giao dịch xuyên domain là `$transaction` thật, không cần saga; giữ ranh giới code rõ để tách sau nếu đo được nhu cầu thật | Không scale độc lập theo tải (phải scale cả app); một module leak/crash có thể ảnh hưởng app; cần kỷ luật code để ranh giới module không xói mòn |

## Quyết định

Chọn **C**. Toàn bộ 16 domain trong `service-catalog.md` cũ trở thành **module** trong một NestJS app duy nhất
(`backend/apps/api`), không còn là đơn vị triển khai riêng.

### Ranh giới module (thay cho ranh giới service)

- Mỗi domain vẫn là một **thư mục module riêng** (`src/modules/<domain>/`) với `module`, `controller`, `service`,
  `repository`. Module khác **không được** import thẳng repository/Prisma model của module khác — chỉ được gọi qua
  service đã export (`exports: [XxxService]`). Vi phạm phát hiện bằng ESLint boundary rule
  (`@nx/enforce-module-boundaries` hoặc tương đương), không phải bằng network policy như bản microservice.
- Đây là ranh giới **logic**, không phải ranh giới **vật lý** — mục đích là giữ khả năng tách module đó ra thành
  service riêng sau này nếu đo được nhu cầu thật (tải cao, cần scale độc lập, cần đội riêng phụ trách), không phải để
  tách ngay bây giờ.

### Dữ liệu

- **Một database Postgres** thay vì 16. Dùng Prisma multi-file schema (`prisma/schema/<domain>.prisma`) để giữ mô
  hình dữ liệu tách theo domain trong code, nhưng migrate chung một database.
- Bảng của module A **không bị cấm** join với bảng của module B ở tầng SQL (cùng database), nhưng **quy ước code**
  vẫn giữ nguyên: chỉ query bảng của module mình trong service của module đó; cần dữ liệu domain khác thì gọi service
  đã export, không tự viết Prisma query xuyên module. Lý do giữ quy ước dù không còn bị ép bởi hạ tầng: giữ khả năng
  tách database sau này rẻ hơn nhiều nếu code chưa từng phụ thuộc ngầm vào việc "cùng DB nên join được".
- Giao dịch xuyên domain (ví dụ checkout chạm `cart`, `catalog`, `order`, `payment`) dùng **một `$transaction` Prisma
  thật**, không cần saga/compensating action nữa — đây là lợi ích chính đổi lấy việc mất khả năng scale độc lập.

### Giao tiếp module-to-module

- Thay RPC qua RabbitMQ bằng **gọi hàm trực tiếp** (inject service qua DI của Nest).
- Domain event (việc "đã xảy ra", nhiều module quan tâm) dùng **event emitter trong process**
  (`@nestjs/event-emitter`, `EventEmitter2`) thay cho publish lên `timmyhub.events`. Không cần transactional outbox
  cho các sự kiện chỉ có tác dụng trong process, vì listener chạy trong cùng process — không có rủi ro "publish rồi
  crash trước khi gửi" như khi qua broker riêng.
- Outbox pattern **vẫn giữ lại** cho đúng một trường hợp: khi hệ quả của sự kiện phải chắc chắn xảy ra dù process
  crash ngay sau đó, và việc đó không thể làm đồng bộ trong cùng transaction (gửi email, đẩy webhook ra ngoài, ghi
  audit log bất biến). Cơ chế: bảng `outbox_events` trong cùng database, một BullMQ worker (không phải RabbitMQ
  relay) quét và xử lý — xem cập nhật ở `data-architecture.md` và `communication-patterns.md`.
- **BullMQ giữ nguyên vai trò cũ**: hàng đợi job nội bộ (gửi mail, transcode video, reindex Elasticsearch, rollup báo
  cáo) không đổi, vì đây vốn đã là công việc trong một service, không phụ thuộc vào việc có bao nhiêu service.
- **RabbitMQ bị loại bỏ khỏi tech stack bắt buộc.** Không còn lý do giữ một event bus phân tán khi chỉ có một
  process phát và nhận sự kiện.

### WebSocket

`api-gateway` (module `realtime`) vẫn là nơi giữ kết nối WebSocket, nhưng không cần Redis pub/sub để đồng bộ giữa các
service nữa vì mọi module đã ở cùng process — Redis adapter chỉ còn cần thiết nếu app scale ngang nhiều pod (vẫn hợp
lý giữ, nhưng lý do khác: đồng bộ giữa các **instance** của cùng một app, không phải giữa các **service** khác nhau).

## Chi phí phải trả

- **Không scale độc lập theo domain.** Nếu `media-transcode` cần nhiều CPU hơn `identity`, phải scale cả app (bù lại:
  transcode vốn đã được tách thành job BullMQ chạy trên worker riêng trong cùng app, có thể scale số lượng worker
  process độc lập với web process mà không cần tách microservice).
- **Một lỗi nghiêm trọng (memory leak, deadlock) có thể ảnh hưởng toàn app**, không còn cô lập theo service. Bù lại
  bằng kỷ luật module boundary + test coverage, không bù bằng hạ tầng.
- **Đội làm song song trên nhiều module dễ đụng merge conflict hơn** so với repo riêng — chấp nhận được ở quy mô đội
  hiện tại, cần xem lại nếu đội lớn lên nhiều.

## Điều kiện xem lại

Tách một module cụ thể ra thành service riêng khi **đo được** (không phải đoán) một trong các điều sau: module đó cần
scale độc lập rõ rệt so với phần còn lại (ví dụ `media-transcode` chiếm CPU vượt trội), module đó cần đội riêng phụ
trách với vòng đời phát hành khác hẳn phần còn lại, hoặc module đó có yêu cầu cô lập bắt buộc (ví dụ `payment` vì lý
do tuân thủ/audit độc lập). Vì ranh giới code đã giữ sẵn (service export rõ, không query chéo), việc tách sau này là
tách theo từng module một, không phải viết lại toàn bộ kiến trúc giao tiếp.
