---
title: Danh mục module
status: approved
owner: Backend Lead
updated: 2026-09-19
related: [docs/01-architecture/system-architecture.md, docs/01-architecture/event-catalog.md, docs/02-domain/domain-model.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/08-handoff/migration-from-legacy.md]
---

# Danh mục module

> Trước ngày 2026-09-19, tài liệu này mô tả 17 service triển khai độc lập. Theo [ADR-0015](adr/ADR-0015-modular-monolith.md),
> kiến trúc đã chuyển sang **modular monolith**: một ứng dụng NestJS duy nhất (`backend/apps/api`), 16 domain dưới đây
> giờ là **module trong cùng process**, không còn là đơn vị triển khai riêng. Nội dung nghiệp vụ (trách nhiệm, event,
> job) giữ nguyên giá trị tham chiếu; phần RPC/database riêng/K8s resource per-service đã được thay bằng mô tả tương
> đương cho module.

Một ứng dụng NestJS (`backend/apps/api`), một database Postgres, 16 module domain + 1 module `platform` (gateway/HTTP
entry, không phải service riêng nữa). Job nặng (transcode video, gửi mail, reindex) vẫn chạy trên BullMQ worker
process riêng, tách khỏi web process để scale độc lập số lượng worker — nhưng vẫn là **cùng một codebase**, không
phải một service khác.

## 1. Bảng tổng hợp

| # | Module | Sở hữu dữ liệu chính | Nguồn ở bản cũ |
|---|---|---|---|
| 0 | `platform` (gateway cũ) | — (guard, filter, interceptor, WebSocket) | `main.ts`, toàn bộ controller |
| 1 | `identity` | `User`, `Profile`, `Device`, `RefreshToken`, `SystemRole`, `Permission` | `auth/`, `users/`, `rbac/`, `casl/` |
| 2 | `seller` | `SellerProfile`, `SellerApplication`, `BrandProfile`, `ShopFollow` | `seller/`, `brands/` |
| 3 | `catalog` | `Category`, `Product`, `ProductVariant`, `Inventory`, `InventoryLedger` | `products/`, `categories/` |
| 4 | `cart` | `Cart`, `CartItem` | `cart/` |
| 5 | `order` | `Order`, `OrderItem`, `OrderStatusHistory`, `Address`, `ReturnRequest` | `orders/`, `addresses/` |
| 6 | `payment` | `Payment`, `PaymentAttempt`, `Wallet`, `WalletTransaction`, `Withdrawal` | `payments/` (+ model `Wallet` chưa có API) |
| 7 | `promotion` | `Voucher`, `UserVoucher`, `VoucherUsageLog`, `PromotionCampaign`, `CampaignProduct` | `vouchers/`, `promotion-campaigns/` |
| 8 | `content` | `Post`, `PostProduct`, `PostLike`, `PostComment`, `AdCampaign`, `AdCreative`, `AdEvent` | `posts/` (mở rộng) |
| 9 | `engagement` | `Review`, `ReviewComment`, `ReviewHelpfulVote`, `WishlistItem` | `reviews/`, `wishlists/` |
| 10 | `chat` | `Conversation`, `ChatMessage`, `SupportTicket`, `Dispute` | `chat/` (mở rộng) |
| 11 | `notification` | `Notification`, `NotificationPreference`, `NotificationTemplate` | `notifications/`, `common/mail/` |
| 12 | `search` | Chỉ mục ES, `IndexJob` | `search/` |
| 13 | `media` | `MediaAsset`, `MediaVariant` | `files/`, `common/supabase/` |
| 14 | `analytics` | `DailyRollup`, `FunnelEvent`, `ReportJob` | `dashboard/` (mở rộng) |
| 15 | `audit` | `AuditLog`, `SystemLog` | `system-logs/`, `AuditLogInterceptor` |
| 16 | `master-data` | `Province`, `District`, `Ward`, `SystemConfig`, `FeatureFlag`, `ShippingRate`, `ReasonCode` | `location/` |

Tất cả bảng ở trên nằm trong **một database**, tổ chức bằng Prisma multi-file schema
(`prisma/schema/<module>.prisma`) — xem [data-architecture.md](data-architecture.md).

## 2. Chi tiết từng module

Quy ước đọc: **"Gọi"** thay cho RPC — nghĩa là module này inject thẳng service của module kia qua Nest DI, gọi hàm
trong cùng process, không qua network. **"Phát/Nghe sự kiện"** dùng `EventEmitter2` trong process
(xem [communication-patterns.md](communication-patterns.md)), không qua RabbitMQ.

### 0. `platform` (gateway cũ)

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Entry HTTP + WebSocket duy nhất. Xác thực JWT, RBAC lớp 1–2, rate limit, helmet, CORS, Swagger, chuyển tiếp WebSocket, gắn `requestId`/`traceId` |
| **Không làm** | Quy tắc nghiệp vụ, truy cập Prisma model của module khác |
| **Gọi** | Toàn bộ 16 module qua service export, không qua RPC |
| **Nghe sự kiện** | `rbac.permissions.changed` (xoá cache quyền) |
| **Phụ thuộc ngoài** | Redis (rate limit, cache quyền, socket adapter khi scale nhiều pod) |

### 1. `identity`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đăng ký/đăng nhập, băm mật khẩu bcrypt, access + refresh token có xoay vòng, thiết bị, đặt lại mật khẩu, SSO Google/Facebook, hồ sơ cơ bản, RBAC (role · permission · user-permission), sinh ability CASL, xác minh email, 2FA cho admin |
| **Service export** | `register`, `login`, `refresh`, `logout`, `getEffectivePermissions`, `getUserSummary`, `RbacService.*` |
| **Phát sự kiện** | `user.registered`, `user.email-verified`, `user.locked`, `user.role-granted`, `user.role-revoked`, `rbac.permissions.changed`, `user.profile-updated` |
| **Nghe sự kiện** | `seller.application.approved` → gán role `SELLER` |
| **Job (BullMQ)** | Dọn refresh token hết hạn (cron hằng giờ), gửi mail xác minh/đặt lại mật khẩu |
| **Ghi chú** | `getUserSummary` được gọi nhiều nhất toàn hệ thống → vẫn cache Redis 5 phút dù giờ là gọi hàm trong process (tránh query Prisma lặp lại), invalidate theo `user.profile-updated` |

### 2. `seller`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đơn đăng ký bán hàng và luồng duyệt, hồ sơ shop (slug, logo, banner, chính sách), thương hiệu, theo dõi shop, tạm ngưng shop |
| **Service export** | `getProfile`, `getPublicShop`, `listApplications`, `approve`, `reject`, `getShopSummary` |
| **Phát sự kiện** | `seller.application.submitted`, `seller.application.approved`, `seller.application.rejected`, `seller.shop.updated`, `seller.shop.suspended` |
| **Nghe sự kiện** | `order.completed` (cập nhật chỉ số uy tín), `review.created` (điểm đánh giá shop) |
| **Ghi chú** | `seller.shop.suspended` khiến module `catalog` ẩn toàn bộ sản phẩm của shop — đây là quan hệ phụ thuộc quan trọng |

### 3. `catalog`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Cây danh mục, sản phẩm, biến thể, thuộc tính, ảnh, slug, luồng duyệt sản phẩm, **và toàn bộ tồn kho** (`onHand` / `reserved` / `available`, ledger, reserve/commit/release) |
| **Service export** | `getProduct`, `getVariantSnapshot`, `listProducts`, `approve`, `reject`, `InventoryService.reserve/commit/release/adjust` |
| **Phát sự kiện** | `product.created`, `product.updated`, `product.approved`, `product.rejected`, `product.deactivated`, `category.updated`, `inventory.reserved`, `inventory.committed`, `inventory.released`, `inventory.low-stock` |
| **Nghe sự kiện** | `seller.shop.suspended` → ẩn sản phẩm; `order.completed` → tăng `soldCount`; `campaign.activated` → gắn giá chiến dịch |
| **Job** | Hết hạn reservation (chạy mỗi phút), tính lại `available`, sinh sitemap |
| **Ghi chú** | Tồn kho ở chung module với sản phẩm để reserve và kiểm tra giá nằm trong **cùng một `$transaction`** — nay còn dễ hơn trước vì `order`, `cart`, `catalog` đều cùng database, checkout có thể dùng một transaction thật xuyên module thay vì saga |

### 4. `cart`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Giỏ hàng bền vững, giỏ khách vãng lai và gộp khi đăng nhập, nhóm theo shop, kiểm tra lại giỏ trước checkout, lưu để mua sau |
| **Service export** | `get`, `addItem`, `updateItem`, `removeItem`, `validate`, `clear`, `merge` |
| **Phát sự kiện** | `cart.item-added`, `cart.abandoned` |
| **Nghe sự kiện** | `product.updated`, `product.deactivated` → đánh dấu item không còn hợp lệ; `order.created` → xoá item đã đặt |
| **Ghi chú** | Cart là dữ liệu "ấm": lưu Postgres, cache Redis 30 phút. Giỏ khách vãng lai chỉ ở Redis, TTL 7 ngày |

### 5. `order`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tạo đơn từ giỏ, máy trạng thái đơn, lịch sử trạng thái, dòng đơn kèm ảnh giá, sổ địa chỉ, phí vận chuyển, huỷ đơn, yêu cầu trả hàng, gán shipper, **điều phối checkout** |
| **Service export** | `createFromCart`, `get`, `list`, `listForShop`, `updateStatus`, `cancel`, `confirmReceived`, `AddressService.*` |
| **Phát sự kiện** | `order.created`, `order.confirmed`, `order.packed`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `order.refund-requested` |
| **Nghe sự kiện** | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded` |
| **Job** | Tự xác nhận nhận hàng sau 7 ngày giao thành công, nhắc seller đơn quá hạn xử lý |
| **Ghi chú** | Checkout chạm `cart` → kiểm `catalog.InventoryService` → ghi `order` → chờ `payment` — bước giữ tồn/giữ voucher/tạo đơn giờ chạy trong **một `$transaction` Prisma**, không còn saga với compensating action (xem [concurrency-and-consistency.md](concurrency-and-consistency.md)); chỉ bước "chờ thanh toán" vẫn bất đồng bộ vì phụ thuộc VNPay bên ngoài |

### 6. `payment`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tạo URL VNPay có chữ ký, xử lý return URL (chỉ hiển thị), **xử lý IPN idempotent** (nguồn sự thật), COD, hoàn tiền, ví seller, sổ giao dịch ví, yêu cầu rút tiền, đối soát định kỳ, tính hoa hồng |
| **Service export** | `createUrl`, `get`, `refund`, `WalletService.getBalance/listTransactions/requestWithdrawal/approveWithdrawal` |
| **Phát sự kiện** | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded`, `wallet.credited`, `wallet.debited`, `withdrawal.requested`, `withdrawal.approved` |
| **Nghe sự kiện** | `order.created` (tạo `PaymentAttempt`), `order.cancelled` (huỷ thanh toán đang chờ), `order.completed` (ghi có ví seller) |
| **Job** | Đối soát hằng ngày với sao kê VNPay, hết hạn thanh toán sau 15 phút, giải phóng tiền giữ |
| **Ghi chú** | **Rủi ro cao nhất hệ thống**, không đổi dù không còn là service riêng. Endpoint IPN vẫn phải: xác minh `vnp_SecureHash` → khoá theo `vnp_TxnRef` → kiểm tra `processed_events` → ghi trong một transaction. Đây là module có khả năng cao nhất cần tách ra deployable riêng sau này vì lý do tuân thủ/cô lập — xem điều kiện xem lại ở [ADR-0015](adr/ADR-0015-modular-monolith.md) |

### 7. `promotion`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Voucher (3 loại), điều kiện áp dụng, giới hạn lượt dùng, kho voucher người dùng, nhật ký sử dụng, chiến dịch khuyến mãi, flash sale, giá chiến dịch |
| **Service export** | `validateVoucher`, `reserveVoucher`, `commitVoucher`, `releaseVoucher`, `listForUser`, `collect`, `CampaignService.*` |
| **Phát sự kiện** | `voucher.issued`, `voucher.used`, `voucher.released`, `campaign.activated`, `campaign.ended`, `campaign.product-approved` |
| **Nghe sự kiện** | `order.created` (giữ lượt voucher), `order.cancelled` (trả lượt), `order.completed` (chốt lượt) |
| **Job** | Kích hoạt / kết thúc chiến dịch theo lịch, hết hạn voucher, phát voucher theo phân khúc |
| **Ghi chú** | Lượt dùng voucher theo mô hình reserve/commit/release giống tồn kho; nay có thể gộp vào cùng transaction checkout với `catalog`/`order` |

### 8. `content`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Bài đăng, video, gắn sản phẩm, like/comment realtime, kiểm duyệt nội dung, báo cáo vi phạm, hashtag, hẹn giờ đăng; **và toàn bộ quảng cáo**: chiến dịch, ngân sách, vị trí hiển thị, phân phối, đếm impression/click, trừ ngân sách |
| **Service export** | `createPost`, `getFeed`, `moderate`, `AdsService.createCampaign/getPlacements/trackEvent/getStats` |
| **Phát sự kiện** | `post.created`, `post.approved`, `post.rejected`, `post.liked`, `post.commented`, `post.reported`, `ad.campaign.created`, `ad.campaign.approved`, `ad.impression.batched`, `ad.click.batched`, `ad.budget.exhausted` |
| **Nghe sự kiện** | `product.approved`/`product.deactivated` (gắn/gỡ sản phẩm khỏi bài), `media.transcoded` (bật video), `wallet.debited` (xác nhận trừ ngân sách) |
| **Job** | Phát bài đã hẹn giờ, tổng hợp impression theo lô mỗi phút, tính chi phí quảng cáo, kết thúc chiến dịch hết ngân sách |
| **Ghi chú** | Sự kiện quảng cáo có khối lượng lớn nhất hệ thống — vẫn đếm trong Redis, gom lô mỗi 60 giây rồi mới ghi Postgres, không đổi dù chạy trong process |

### 9. `engagement`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đánh giá sản phẩm (kèm điều kiện đã mua), phản hồi của seller, bình chọn hữu ích, tổng hợp điểm trung bình, wishlist, kiểm duyệt đánh giá |
| **Service export** | `createReview`, `listReviews`, `reply`, `vote`, `moderate`, `WishlistService.*`, `getProductRating` |
| **Phát sự kiện** | `review.created`, `review.replied`, `review.moderated`, `rating.updated`, `wishlist.item-added` |
| **Nghe sự kiện** | `order.completed` → mở quyền đánh giá cho các `OrderItem` tương ứng |
| **Ghi chú** | Trước đây giữ read model `PurchasedItem` để tránh gọi RPC sang `order`; nay có thể query thẳng bảng `order` trong cùng database nếu cần — **vẫn nên giữ qua service export của `order`** để không xói mòn ranh giới module (xem [ADR-0015](adr/ADR-0015-modular-monolith.md)) |

### 10. `chat`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Hội thoại và tin nhắn realtime, chat 1-1 user↔seller, ticket hỗ trợ có SLA, tranh chấp ba bên gắn đơn hàng, trợ lý AI, tin nhắn mẫu, chặn người dùng |
| **Service export** | `listConversations`, `getMessages`, `sendMessage`, `TicketService.create/assign/resolve`, `DisputeService.open` |
| **Phát sự kiện** | `chat.message-sent`, `ticket.created`, `ticket.assigned`, `ticket.resolved`, `ticket.sla-breached`, `dispute.opened`, `dispute.resolved` |
| **Nghe sự kiện** | `order.cancelled`, `order.refund-requested` (tự mở tranh chấp khi cần) |
| **Job** | Kiểm tra SLA và leo thang, dọn hội thoại cũ |
| **Ghi chú** | Trạng thái WebSocket vẫn nên qua Redis adapter nếu app chạy nhiều pod; room đặt tên `conversation:<id>`, `user:<id>` |

### 11. `notification`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Thông báo trong ứng dụng, email giao dịch qua SMTP, web push, tuỳ chọn nhận thông báo theo loại/kênh, template có phiên bản, thông báo quảng bá, bản tin tổng hợp |
| **Service export** | `list`, `markRead`, `markAllRead`, `getPreferences`, `updatePreferences`, `broadcast` |
| **Phát sự kiện** | `notification.created`, `notification.delivery-failed` |
| **Nghe sự kiện** | **Nhiều nhất hệ thống** — gần như mọi domain event có ý nghĩa với người dùng: `order.*`, `payment.*`, `seller.application.*`, `product.approved`, `review.created`, `chat.message-sent`, `inventory.low-stock`, `withdrawal.approved`, `ad.budget.exhausted` |
| **Job** | Hàng đợi gửi với backoff mũ, dead-letter queue (BullMQ), bản tin hằng ngày |
| **Ghi chú** | Ánh xạ event → template nằm trong bảng `NotificationTemplate`, đổi được không cần deploy. Mọi kênh đều kiểm tra `NotificationPreference` trước khi gửi |

### 12. `search`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Chỉ mục Elasticsearch cho sản phẩm/shop/nội dung, truy vấn toàn văn, gợi ý tự động, facet, sắp xếp, hỗ trợ tiếng Việt không dấu, reindex bằng alias swap, chèn kết quả tài trợ |
| **Service export** | `searchProducts`, `suggest`, `searchShops`, `searchPosts`, `reindex` |
| **Phát sự kiện** | `search.index-completed`, `search.index-failed` |
| **Nghe sự kiện** | `product.*`, `category.updated`, `seller.shop.updated`, `post.approved`, `review.created` (cập nhật điểm), `order.completed` (cập nhật `soldCount`) |
| **Job** | Đồng bộ chỉ mục theo lô, reindex toàn phần, làm mới từ khoá thịnh hành |
| **Ghi chú** | ES là chỉ mục dẫn xuất, không phải nguồn sự thật — mất hoàn toàn vẫn dựng lại được từ module `catalog` |

### 13. `media`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Cấp signed URL để client upload thẳng Supabase Storage, kiểm tra MIME thật, giới hạn kích thước, sinh thumbnail & nhiều kích thước ảnh, chuyển mã video HLS, dọn tệp mồ côi, quét nội dung không phù hợp |
| **Service export** | `createUploadUrl`, `confirmUpload`, `get`, `delete` |
| **Phát sự kiện** | `media.uploaded`, `media.processed`, `media.transcoded`, `media.rejected` |
| **Nghe sự kiện** | `post.created`, `product.created` (liên kết tệp với thực thể) |
| **Job** | Sinh thumbnail, chuyển mã video (worker BullMQ riêng, xem [media-video-pipeline.md](media-video-pipeline.md)), dọn tệp không có tham chiếu sau 24 giờ |
| **Ghi chú** | Upload không đi qua module `platform` — tránh giữ kết nối dài và tràn bộ nhớ. Transcode video vẫn nên chạy trên **worker process riêng** (không phải web process) để không chiếm CPU của request HTTP, dùng chung database nhưng deploy như một process khác trong cùng image |

### 14. `analytics`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tổng hợp doanh số, dashboard admin và seller, doanh thu theo thời gian, top sản phẩm/danh mục/shop, phễu chuyển đổi, cohort, quy kết doanh thu cho nội dung & quảng cáo, so sánh kỳ, xuất báo cáo, báo cáo tồn kho |
| **Service export** | `getShopDashboard`, `getPlatformDashboard`, `getRevenueSeries`, `getFunnel`, `requestExport` |
| **Phát sự kiện** | `report.export-ready`, `report.export-failed` |
| **Nghe sự kiện** | `order.*`, `payment.*`, `product.*`, `inventory.*`, `ad.*`, `post.*`, `user.registered`, `review.created` |
| **Job** | Tổng hợp theo ngày (chạy 00:15 hằng ngày), tổng hợp trong ngày mỗi 15 phút, sinh file xuất |
| **Ghi chú** | Chỉ đọc từ bản tổng hợp dựng sẵn (`DailyRollup`), **không** truy vấn thẳng bảng thô của module khác khi phục vụ dashboard — dù cùng database, vẫn giữ quy ước không query chéo |

### 15. `audit`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Nhận và lưu bất biến mọi bản ghi audit từ các module, `SystemLog` tập trung, tra cứu theo actor/entity/khoảng thời gian, che dữ liệu nhạy cảm, chính sách lưu trữ, xuất phục vụ kiểm toán |
| **Service export** | `query`, `getEntityHistory`, `export` |
| **Nghe sự kiện** | `audit.recorded` (từ Prisma Client Extension của mọi module), `system.log-recorded` |
| **Job** | Chuyển phân vùng cũ sang lưu trữ lạnh, tạo phân vùng tháng mới |
| **Ghi chú** | Bảng `AuditLog` phân vùng theo tháng; chỉ cấp quyền `INSERT` và `SELECT` cho role DB dùng bởi module này — **không** `UPDATE`/`DELETE`, kể cả từ module khác trong cùng database. Xem [ADR-0011](adr/ADR-0011-audit-log-strategy.md) |

### 16. `master-data`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tỉnh/huyện/xã, cấu hình hệ thống có phiên bản, feature flag, bảng phí vận chuyển theo vùng, danh mục lý do (huỷ/từ chối/báo cáo), chế độ bảo trì |
| **Service export** | `getProvinces`, `getDistricts`, `getWards`, `getConfig`, `getFlags`, `getShippingRate` |
| **Phát sự kiện** | `config.updated`, `feature-flag.changed` |
| **Ghi chú** | Dữ liệu đọc nhiều, ghi rất ít → cache Redis TTL 24 giờ, invalidate bằng event. Là module duy nhất **mọi module khác đều được phép gọi tự do** |

## 3. Ma trận phụ thuộc lời gọi

`●` = module này gọi thẳng service của module kia trong process (không còn ý nghĩa "chờ mạng" như RPC cũ, nhưng vẫn
đáng theo dõi để tránh chu trình phụ thuộc). Ô trống = chỉ giao tiếp qua event.

| Gọi ↓ / Bị gọi → | IDN | SEL | CAT | CRT | ORD | PAY | PRM | CNT | ENG | CHT | NTF | SRC | MED | ANA | AUD | MDT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `platform` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `identity` | — | | | | | | | | | | | | | | | ● |
| `seller` | ● | — | | | | | | | | | | | | | | ● |
| `catalog` | | ● | — | | | | | | | | | | ● | | | ● |
| `cart` | | | ● | — | | | ● | | | | | | | | | |
| `order` | ● | ● | ● | ● | — | | ● | | | | | | | | | ● |
| `payment` | | ● | | | ● | — | | | | | | | | | | ● |
| `promotion` | | | ● | | | | — | | | | | | | | | |
| `content` | ● | ● | ● | | | ● | | — | | | | | ● | | | |
| `engagement` | ● | | ● | | | | | | — | | | | ● | | | |
| `chat` | ● | ● | | | ● | | | | | — | | | ● | | | |
| `notification` | ● | | | | | | | | | | — | | | | | ● |
| `search` | | | ● | | | | | ● | | | | — | | | | |
| `media` | ● | | | | | | | | | | | | — | | | |
| `analytics` | | ● | ● | | | | | | | | | | | — | | ● |
| `audit` | ● | | | | | | | | | | | | | | — | |
| `master-data` | | | | | | | | | | | | | | | | — |

**Quy tắc không đổi:** không được tạo chu trình phụ thuộc giữa các module (ESLint boundary rule chặn ở build time,
thay cho việc trước đây phát hiện bằng kiểm thử tích hợp giữa các service). Cột `MDT` được gọi rộng rãi vì chỉ đọc
dữ liệu nền có cache. `ORD` là module gọi ra nhiều nhất — đúng với vai trò điều phối checkout.

## 4. Vận hành và mở rộng

Không còn resource profile riêng theo service — cả app scale như **một đơn vị**:

| Process | Replica dev | Replica prod (min–max) | CPU req/limit | RAM req/limit | Kích hoạt HPA |
|---|---|---|---|---|---|
| Web (`backend/apps/api`, HTTP + WS) | 1 | 2–8 | 500m / 2000m | 1Gi / 2Gi | CPU 70% |
| Worker BullMQ (mail, transcode, reindex, rollup) | 1 | 1–4 | 500m / 2000m | 512Mi / 2Gi | Độ dài hàng đợi |

`order` (điều phối checkout) và `payment` (IPN) chạy trong cùng process web — vẫn cần **≥ 2 replica** vì đây là
đường xử lý không có phương án suy giảm.

## 5. Cấu trúc thư mục backend

```
backend/
├── apps/
│   └── api/
│       ├── prisma/
│       │   ├── schema/            # multi-file: identity.prisma, catalog.prisma, order.prisma, ...
│       │   ├── migrations/
│       │   └── seeds/
│       └── src/
│           ├── modules/
│           │   ├── platform/      # guard, filter, interceptor, gateway WS
│           │   ├── identity/
│           │   ├── seller/
│           │   ├── catalog/
│           │   ├── cart/
│           │   ├── order/
│           │   ├── payment/
│           │   ├── promotion/
│           │   ├── content/
│           │   ├── engagement/
│           │   ├── chat/
│           │   ├── notification/
│           │   ├── search/
│           │   ├── media/
│           │   ├── analytics/
│           │   ├── audit/
│           │   └── master-data/
│           ├── worker/            # entry point riêng cho BullMQ worker process
│           └── main.ts
├── libs/
│   ├── common/          # @timmyhub/common — guard, decorator, filter, interceptor, logger, ResponseDto
│   ├── events/          # @timmyhub/events — EventEmitter2 wrapper, outbox helper cho hệ quả bất đồng bộ
│   ├── prisma/          # @timmyhub/prisma — base service, audit extension, soft delete
│   └── testing/         # @timmyhub/testing — testcontainers, factory, fixture
└── package.json
```

`shared/` ở gốc monorepo chứa `@timmyhub/contracts` — zod schema, type, hợp đồng event, hằng `PERMISSIONS` —
dùng chung cả `backend/` lẫn `frontend/`.

## 6. Quy tắc tách module thành service riêng

Xem điều kiện đầy đủ ở [ADR-0015](adr/ADR-0015-modular-monolith.md) §"Điều kiện xem lại". Tóm tắt: chỉ tách khi
**đo được** một trong — cần scale độc lập rõ rệt, cần đội riêng phụ trách, hoặc cần cô lập bắt buộc (tuân thủ/audit).
Vì ranh giới code đã giữ sẵn (service export rõ, không query chéo), việc tách là tách theo từng module một, không
phải viết lại toàn bộ kiến trúc giao tiếp.
