---
title: Danh mục service
status: approved
owner: Backend Lead
updated: 2026-09-16
related: [docs/01-architecture/system-architecture.md, docs/01-architecture/event-catalog.md, docs/02-domain/domain-model.md, docs/08-handoff/migration-from-legacy.md]
---

# Danh mục service

17 service (1 gateway + 16 service nghiệp vụ) và **18 đơn vị triển khai** — đơn vị thứ 18 là `media-transcode-worker`,
một deployment riêng của `media-service` chạy ffmpeg ([media-video-pipeline.md](media-video-pipeline.md)). Mỗi service
là một ứng dụng NestJS độc lập, có **database riêng**, **pipeline riêng**, **image riêng**.

## 1. Bảng tổng hợp

| # | Service | Database | Port dev | Sở hữu dữ liệu chính | Nguồn ở bản cũ |
|---|---|---|---|---|---|
| 0 | `api-gateway` | — | 3000 | — | `main.ts`, toàn bộ controller |
| 1 | `identity-service` | `identity_db` | 3101 | `User`, `Profile`, `Device`, `RefreshToken`, `SystemRole`, `Permission` | `auth/`, `users/`, `rbac/`, `casl/` |
| 2 | `seller-service` | `seller_db` | 3102 | `SellerProfile`, `SellerApplication`, `BrandProfile`, `ShopFollow` | `seller/`, `brands/` |
| 3 | `catalog-service` | `catalog_db` | 3103 | `Category`, `Product`, `ProductVariant`, `Inventory`, `InventoryLedger` | `products/`, `categories/` |
| 4 | `cart-service` | `cart_db` | 3104 | `Cart`, `CartItem` | `cart/` |
| 5 | `order-service` | `order_db` | 3105 | `Order`, `OrderItem`, `OrderStatusHistory`, `Address`, `ReturnRequest` | `orders/`, `addresses/` |
| 6 | `payment-service` | `payment_db` | 3106 | `Payment`, `PaymentAttempt`, `Wallet`, `WalletTransaction`, `Withdrawal` | `payments/` (+ model `Wallet` chưa có API) |
| 7 | `promotion-service` | `promotion_db` | 3107 | `Voucher`, `UserVoucher`, `VoucherUsageLog`, `PromotionCampaign`, `CampaignProduct` | `vouchers/`, `promotion-campaigns/` |
| 8 | `content-service` | `content_db` | 3108 | `Post`, `PostProduct`, `PostLike`, `PostComment`, `AdCampaign`, `AdCreative`, `AdEvent` | `posts/` (mở rộng) |
| 9 | `engagement-service` | `engagement_db` | 3109 | `Review`, `ReviewComment`, `ReviewHelpfulVote`, `WishlistItem` | `reviews/`, `wishlists/` |
| 10 | `chat-service` | `chat_db` | 3110 | `Conversation`, `ChatMessage`, `SupportTicket`, `Dispute` | `chat/` (mở rộng) |
| 11 | `notification-service` | `notification_db` | 3111 | `Notification`, `NotificationPreference`, `NotificationTemplate` | `notifications/`, `common/mail/` |
| 12 | `search-service` | `search_db` + Elasticsearch | 3112 | Chỉ mục ES, `IndexJob` | `search/` |
| 13 | `media-service` | `media_db` | 3113 | `MediaAsset`, `MediaVariant` | `files/`, `common/supabase/` |
| 14 | `analytics-service` | `analytics_db` | 3114 | `DailyRollup`, `FunnelEvent`, `ReportJob` | `dashboard/` (mở rộng) |
| 15 | `audit-service` | `audit_db` + Elasticsearch | 3115 | `AuditLog`, `SystemLog` | `system-logs/`, `AuditLogInterceptor` |
| 16 | `master-data-service` | `masterdata_db` | 3116 | `Province`, `District`, `Ward`, `SystemConfig`, `FeatureFlag`, `ShippingRate`, `ReasonCode` | `location/` |
| 17 | `media-transcode-worker` (worker của `media-service`) | dùng `media_db` | — | Không sở hữu bảng riêng; xử lý hàng đợi `media.transcode` | **mới** |

## 2. Chi tiết từng service

### 0. `api-gateway`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Điểm vào HTTP + WebSocket duy nhất. Xác thực JWT, RBAC lớp 1–2, rate limit, helmet, CORS, tổng hợp Swagger, định tuyến RPC, chuyển tiếp WebSocket, gắn `requestId`/`traceId` |
| **Không làm** | Quy tắc nghiệp vụ, truy cập bất kỳ database nào |
| **Gọi ra** | RPC tới toàn bộ 16 service |
| **Nghe event** | `rbac.permissions.changed` (xoá cache quyền) |
| **Phát event** | — |
| **Phụ thuộc ngoài** | Redis (rate limit, cache quyền, socket adapter) |

### 1. `identity-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đăng ký/đăng nhập, băm mật khẩu bcrypt, access + refresh token có xoay vòng, thiết bị, đặt lại mật khẩu, SSO Google/Facebook, hồ sơ cơ bản, RBAC (role · permission · user-permission), sinh ability CASL, xác minh email, 2FA cho admin |
| **RPC cung cấp** | `identity.register`, `identity.login`, `identity.refresh`, `identity.logout`, `identity.getEffectivePermissions`, `identity.getUserSummary`, `rbac.*` |
| **Phát event** | `user.registered`, `user.email-verified`, `user.locked`, `user.role-granted`, `user.role-revoked`, `rbac.permissions.changed`, `user.profile-updated` |
| **Nghe event** | `seller.application.approved` → gán role `SELLER` |
| **Job (BullMQ)** | Dọn refresh token hết hạn (cron hằng giờ), gửi mail xác minh/đặt lại mật khẩu |
| **Ghi chú** | `getUserSummary` là RPC được gọi nhiều nhất toàn hệ thống → bắt buộc cache Redis 5 phút, invalidate theo `user.profile-updated` |

### 2. `seller-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đơn đăng ký bán hàng và luồng duyệt, hồ sơ shop (slug, logo, banner, chính sách), thương hiệu, theo dõi shop, tạm ngưng shop |
| **RPC cung cấp** | `seller.getProfile`, `seller.getPublicShop`, `seller.listApplications`, `seller.approve`, `seller.reject`, `seller.getShopSummary` |
| **Phát event** | `seller.application.submitted`, `seller.application.approved`, `seller.application.rejected`, `seller.shop.updated`, `seller.shop.suspended` |
| **Nghe event** | `order.completed` (cập nhật chỉ số uy tín), `review.created` (điểm đánh giá shop) |
| **Ghi chú** | `seller.shop.suspended` khiến `catalog-service` ẩn toàn bộ sản phẩm của shop — đây là quan hệ phụ thuộc quan trọng |

### 3. `catalog-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Cây danh mục, sản phẩm, biến thể, thuộc tính, ảnh, slug, luồng duyệt sản phẩm, **và toàn bộ tồn kho** (`onHand` / `reserved` / `available`, ledger, reserve/commit/release) |
| **RPC cung cấp** | `catalog.getProduct`, `catalog.getVariantSnapshot`, `catalog.listProducts`, `catalog.approve`, `catalog.reject`, `inventory.reserve`, `inventory.commit`, `inventory.release`, `inventory.adjust` |
| **Phát event** | `product.created`, `product.updated`, `product.approved`, `product.rejected`, `product.deactivated`, `category.updated`, `inventory.reserved`, `inventory.committed`, `inventory.released`, `inventory.low-stock` |
| **Nghe event** | `seller.shop.suspended` → ẩn sản phẩm; `order.completed` → tăng `soldCount`; `campaign.activated` → gắn giá chiến dịch |
| **Job** | Hết hạn reservation (chạy mỗi phút), tính lại `available`, sinh sitemap |
| **Ghi chú** | Tồn kho **ở chung service với sản phẩm** để reserve và kiểm tra giá nằm trong **cùng một transaction** — đây là lý do không tách `inventory-service` riêng. Xem [ADR-0002](adr/ADR-0002-database-per-service.md). |

### 4. `cart-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Giỏ hàng bền vững, giỏ khách vãng lai và gộp khi đăng nhập, nhóm theo shop, kiểm tra lại giỏ trước checkout, lưu để mua sau |
| **RPC cung cấp** | `cart.get`, `cart.addItem`, `cart.updateItem`, `cart.removeItem`, `cart.validate`, `cart.clear`, `cart.merge` |
| **Phát event** | `cart.item-added`, `cart.abandoned` |
| **Nghe event** | `product.updated`, `product.deactivated` → đánh dấu item không còn hợp lệ; `order.created` → xoá item đã đặt |
| **Ghi chú** | Cart là dữ liệu "ấm": lưu Postgres, cache Redis 30 phút. Giỏ khách vãng lai chỉ ở Redis, TTL 7 ngày |

### 5. `order-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tạo đơn từ giỏ, máy trạng thái đơn, lịch sử trạng thái, dòng đơn kèm ảnh giá, sổ địa chỉ, phí vận chuyển, huỷ đơn, yêu cầu trả hàng, gán shipper, **điều phối saga checkout** |
| **RPC cung cấp** | `order.createFromCart`, `order.get`, `order.list`, `order.listForShop`, `order.updateStatus`, `order.cancel`, `order.confirmReceived`, `address.*` |
| **Phát event** | `order.created`, `order.confirmed`, `order.packed`, `order.shipped`, `order.delivered`, `order.completed`, `order.cancelled`, `order.refund-requested` |
| **Nghe event** | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded`, `inventory.reserve-failed` |
| **Job** | Tự xác nhận nhận hàng sau 7 ngày giao thành công, nhắc seller đơn quá hạn xử lý |
| **Ghi chú** | Là **saga orchestrator** của checkout. Không có phương án suy giảm — phải chạy ≥ 2 replica |

### 6. `payment-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tạo URL VNPay có chữ ký, xử lý return URL (chỉ hiển thị), **xử lý IPN idempotent** (nguồn sự thật), COD, hoàn tiền, ví seller, sổ giao dịch ví, yêu cầu rút tiền, đối soát định kỳ, tính hoa hồng |
| **RPC cung cấp** | `payment.createUrl`, `payment.get`, `payment.refund`, `wallet.getBalance`, `wallet.listTransactions`, `wallet.requestWithdrawal`, `wallet.approveWithdrawal` |
| **Phát event** | `payment.succeeded`, `payment.failed`, `payment.expired`, `payment.refunded`, `wallet.credited`, `wallet.debited`, `withdrawal.requested`, `withdrawal.approved` |
| **Nghe event** | `order.created` (tạo `PaymentAttempt`), `order.cancelled` (huỷ thanh toán đang chờ), `order.completed` (ghi có ví seller) |
| **Job** | Đối soát hằng ngày với sao kê VNPay, hết hạn thanh toán sau 15 phút, giải phóng tiền giữ |
| **Ghi chú** | **Rủi ro cao nhất hệ thống.** Endpoint IPN phải: xác minh `vnp_SecureHash` → khoá theo `vnp_TxnRef` → kiểm tra `processed_events` → ghi + outbox trong một transaction. IPN có thể đến **trước** return URL và có thể đến **nhiều lần** |

### 7. `promotion-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Voucher (3 loại), điều kiện áp dụng, giới hạn lượt dùng, kho voucher người dùng, nhật ký sử dụng, chiến dịch khuyến mãi, flash sale, giá chiến dịch |
| **RPC cung cấp** | `voucher.validate`, `voucher.reserve`, `voucher.commit`, `voucher.release`, `voucher.listForUser`, `voucher.collect`, `campaign.*` |
| **Phát event** | `voucher.issued`, `voucher.used`, `voucher.released`, `campaign.activated`, `campaign.ended`, `campaign.product-approved` |
| **Nghe event** | `order.created` (giữ lượt voucher), `order.cancelled` (trả lượt), `order.completed` (chốt lượt) |
| **Job** | Kích hoạt / kết thúc chiến dịch theo lịch, hết hạn voucher, phát voucher theo phân khúc |
| **Ghi chú** | Lượt dùng voucher theo mô hình reserve/commit/release giống tồn kho, tránh vượt hạn mức khi đồng thời cao |

### 8. `content-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Bài đăng, video, gắn sản phẩm, like/comment realtime, kiểm duyệt nội dung, báo cáo vi phạm, hashtag, hẹn giờ đăng; **và toàn bộ quảng cáo**: chiến dịch, ngân sách, vị trí hiển thị, phân phối, đếm impression/click, trừ ngân sách |
| **RPC cung cấp** | `content.createPost`, `content.getFeed`, `content.moderate`, `ads.createCampaign`, `ads.getPlacements`, `ads.trackEvent`, `ads.getStats` |
| **Phát event** | `post.created`, `post.approved`, `post.rejected`, `post.liked`, `post.commented`, `post.reported`, `ad.campaign.created`, `ad.campaign.approved`, `ad.impression.batched`, `ad.click.batched`, `ad.budget.exhausted` |
| **Nghe event** | `product.approved`/`product.deactivated` (gắn/gỡ sản phẩm khỏi bài), `media.transcoded` (bật video), `wallet.debited` (xác nhận trừ ngân sách) |
| **Job** | Phát bài đã hẹn giờ, tổng hợp impression theo lô mỗi phút, tính chi phí quảng cáo, kết thúc chiến dịch hết ngân sách |
| **Ghi chú** | Sự kiện quảng cáo có **khối lượng lớn nhất hệ thống**. Không ghi từng impression vào Postgres: đếm trong Redis, gom lô mỗi 60 giây rồi mới ghi |

### 9. `engagement-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Đánh giá sản phẩm (kèm điều kiện đã mua), phản hồi của seller, bình chọn hữu ích, tổng hợp điểm trung bình, wishlist, kiểm duyệt đánh giá |
| **RPC cung cấp** | `review.create`, `review.list`, `review.reply`, `review.vote`, `review.moderate`, `wishlist.*`, `review.getProductRating` |
| **Phát event** | `review.created`, `review.replied`, `review.moderated`, `rating.updated`, `wishlist.item-added` |
| **Nghe event** | `order.completed` → mở quyền đánh giá cho các `OrderItem` tương ứng |
| **Ghi chú** | Giữ read model `PurchasedItem` dựng từ `order.completed` để kiểm tra "đã mua" mà không gọi `order-service` |

### 10. `chat-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Hội thoại và tin nhắn realtime, chat 1-1 user↔seller, ticket hỗ trợ có SLA, tranh chấp ba bên gắn đơn hàng, trợ lý AI, tin nhắn mẫu, chặn người dùng |
| **RPC cung cấp** | `chat.listConversations`, `chat.getMessages`, `chat.sendMessage`, `ticket.create`, `ticket.assign`, `ticket.resolve`, `dispute.open` |
| **Phát event** | `chat.message-sent`, `ticket.created`, `ticket.assigned`, `ticket.resolved`, `ticket.sla-breached`, `dispute.opened`, `dispute.resolved` |
| **Nghe event** | `order.cancelled`, `order.refund-requested` (tự mở tranh chấp khi cần) |
| **Job** | Kiểm tra SLA và leo thang, dọn hội thoại cũ |
| **Ghi chú** | Trạng thái WebSocket chia sẻ qua Redis adapter; room đặt tên `conversation:<id>`, `user:<id>` |

### 11. `notification-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Thông báo trong ứng dụng, email giao dịch qua SMTP, web push, tuỳ chọn nhận thông báo theo loại/kênh, template có phiên bản, thông báo quảng bá, bản tin tổng hợp |
| **RPC cung cấp** | `notification.list`, `notification.markRead`, `notification.markAllRead`, `notification.getPreferences`, `notification.updatePreferences`, `notification.broadcast` |
| **Phát event** | `notification.created`, `notification.delivery-failed` |
| **Nghe event** | **Nhiều nhất hệ thống** — gần như mọi domain event có ý nghĩa với người dùng: `order.*`, `payment.*`, `seller.application.*`, `product.approved`, `review.created`, `chat.message-sent`, `inventory.low-stock`, `withdrawal.approved`, `ad.budget.exhausted` |
| **Job** | Hàng đợi gửi với backoff mũ, dead-letter queue, bản tin hằng ngày |
| **Ghi chú** | Ánh xạ event → template nằm trong bảng `NotificationTemplate`, đổi được không cần deploy. Mọi kênh đều kiểm tra `NotificationPreference` trước khi gửi |

### 12. `search-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Chỉ mục Elasticsearch cho sản phẩm/shop/nội dung, truy vấn toàn văn, gợi ý tự động, facet, sắp xếp, hỗ trợ tiếng Việt không dấu, reindex bằng alias swap, chèn kết quả tài trợ |
| **RPC cung cấp** | `search.products`, `search.suggest`, `search.shops`, `search.posts`, `search.reindex` |
| **Phát event** | `search.index-completed`, `search.index-failed` |
| **Nghe event** | `product.*`, `category.updated`, `seller.shop.updated`, `post.approved`, `review.created` (cập nhật điểm), `order.completed` (cập nhật `soldCount`) |
| **Job** | Đồng bộ chỉ mục theo lô, reindex toàn phần, làm mới từ khoá thịnh hành |
| **Ghi chú** | ES là **chỉ mục dẫn xuất**, không phải nguồn sự thật — mất hoàn toàn vẫn dựng lại được từ `catalog-service` |

### 13. `media-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Cấp signed URL để client upload thẳng Supabase Storage, kiểm tra MIME thật, giới hạn kích thước, sinh thumbnail & nhiều kích thước ảnh, chuyển mã video HLS, dọn tệp mồ côi, quét nội dung không phù hợp |
| **RPC cung cấp** | `media.createUploadUrl`, `media.confirmUpload`, `media.get`, `media.delete` |
| **Phát event** | `media.uploaded`, `media.processed`, `media.transcoded`, `media.rejected` |
| **Nghe event** | `post.created`, `product.created` (liên kết tệp với thực thể) |
| **Job** | Sinh thumbnail, chuyển mã video, dọn tệp không có tham chiếu sau 24 giờ |
| **Ghi chú** | Upload **không đi qua gateway** — tránh giữ kết nối dài và tràn bộ nhớ. Bản cũ upload qua backend, bản mới dùng signed URL |

### 14. `analytics-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tổng hợp doanh số, dashboard admin và seller, doanh thu theo thời gian, top sản phẩm/danh mục/shop, phễu chuyển đổi, cohort, quy kết doanh thu cho nội dung & quảng cáo, so sánh kỳ, xuất báo cáo, báo cáo tồn kho |
| **RPC cung cấp** | `analytics.getShopDashboard`, `analytics.getPlatformDashboard`, `analytics.getRevenueSeries`, `analytics.getFunnel`, `analytics.requestExport` |
| **Phát event** | `report.export-ready`, `report.export-failed` |
| **Nghe event** | `order.*`, `payment.*`, `product.*`, `inventory.*`, `ad.*`, `post.*`, `user.registered`, `review.created` |
| **Job** | Tổng hợp theo ngày (chạy 00:15 hằng ngày), tổng hợp trong ngày mỗi 15 phút, sinh file xuất |
| **Ghi chú** | Chỉ đọc từ bản tổng hợp dựng sẵn (`DailyRollup`), **không** truy vấn thẳng dữ liệu thô khi phục vụ dashboard |

### 15. `audit-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Nhận và lưu bất biến mọi bản ghi audit từ các service, `SystemLog` tập trung, tra cứu theo actor/entity/khoảng thời gian, che dữ liệu nhạy cảm, chính sách lưu trữ, xuất phục vụ kiểm toán |
| **RPC cung cấp** | `audit.query`, `audit.getEntityHistory`, `audit.export` |
| **Phát event** | — |
| **Nghe event** | `audit.recorded` (từ tất cả service), `system.log-recorded` |
| **Job** | Chuyển phân vùng cũ sang lưu trữ lạnh, tạo phân vùng tháng mới |
| **Ghi chú** | Bảng `AuditLog` phân vùng theo tháng; chỉ cấp quyền `INSERT` và `SELECT` cho tài khoản ứng dụng — **không** `UPDATE`/`DELETE`. Xem [ADR-0011](adr/ADR-0011-audit-log-strategy.md) |

### 16. `master-data-service`

| Mục | Nội dung |
|---|---|
| **Trách nhiệm** | Tỉnh/huyện/xã, cấu hình hệ thống có phiên bản, feature flag, bảng phí vận chuyển theo vùng, danh mục lý do (huỷ/từ chối/báo cáo), chế độ bảo trì |
| **RPC cung cấp** | `masterdata.getProvinces`, `masterdata.getDistricts`, `masterdata.getWards`, `masterdata.getConfig`, `masterdata.getFlags`, `masterdata.getShippingRate` |
| **Phát event** | `config.updated`, `feature-flag.changed` |
| **Nghe event** | — |
| **Ghi chú** | Dữ liệu đọc nhiều, ghi rất ít → cache Redis TTL 24 giờ, invalidate bằng event. Là service duy nhất **mọi service khác đều được phép gọi** |

## 3. Ma trận phụ thuộc đồng bộ (RPC)

`●` = gọi RPC trực tiếp (người dùng đang chờ). Ô trống = chỉ giao tiếp qua event.

| Gọi ↓ / Bị gọi → | IDN | SEL | CAT | CRT | ORD | PAY | PRM | CNT | ENG | CHT | NTF | SRC | MED | ANA | AUD | MDT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `api-gateway` | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| `identity-service` | — | | | | | | | | | | | | | | | ● |
| `seller-service` | ● | — | | | | | | | | | | | | | | ● |
| `catalog-service` | | ● | — | | | | | | | | | | ● | | | ● |
| `cart-service` | | | ● | — | | | ● | | | | | | | | | |
| `order-service` | ● | ● | ● | ● | — | | ● | | | | | | | | | ● |
| `payment-service` | | ● | | | ● | — | | | | | | | | | | ● |
| `promotion-service` | | | ● | | | | — | | | | | | | | | |
| `content-service` | ● | ● | ● | | | ● | | — | | | | | ● | | | |
| `engagement-service` | ● | | ● | | | | | | — | | | | ● | | | |
| `chat-service` | ● | ● | | | ● | | | | | — | | | ● | | | |
| `notification-service` | ● | | | | | | | | | | — | | | | | ● |
| `search-service` | | | ● | | | | | ● | | | | — | | | | |
| `media-service` | ● | | | | | | | | | | | | — | | | |
| `analytics-service` | | ● | ● | | | | | | | | | | | — | | ● |
| `audit-service` | ● | | | | | | | | | | | | | | — | |
| `master-data-service` | | | | | | | | | | | | | | | | — |

**Quy tắc:** không được tạo chu trình RPC đồng bộ. Cột `MDT` được gọi rộng rãi vì chỉ đọc dữ liệu nền có cache.
`ORD` là service gọi ra nhiều nhất — đúng với vai trò saga orchestrator.

## 4. Hồ sơ tài nguyên và mở rộng

| Service | Replica dev | Replica prod (min–max) | CPU req/limit | RAM req/limit | Kích hoạt HPA |
|---|---|---|---|---|---|
| `api-gateway` | 1 | 2–6 | 200m / 1000m | 256Mi / 512Mi | CPU 70% |
| `identity-service` | 1 | 2–4 | 200m / 800m | 256Mi / 512Mi | CPU 70% |
| `catalog-service` | 1 | 2–6 | 300m / 1000m | 512Mi / 1Gi | CPU 70% |
| `order-service` | 1 | 2–5 | 300m / 1000m | 512Mi / 1Gi | CPU 65% |
| `payment-service` | 1 | 2–3 | 200m / 600m | 256Mi / 512Mi | CPU 70% |
| `content-service` | 1 | 2–5 | 300m / 1000m | 512Mi / 1Gi | Độ dài hàng đợi |
| `chat-service` | 1 | 2–4 | 200m / 800m | 512Mi / 1Gi | Số kết nối WS |
| `notification-service` | 1 | 1–4 | 200m / 600m | 256Mi / 512Mi | Độ dài hàng đợi |
| `search-service` | 1 | 1–3 | 200m / 800m | 512Mi / 1Gi | CPU 70% |
| `analytics-service` | 1 | 1–2 | 300m / 1500m | 1Gi / 2Gi | Theo lịch |
| `media-service` | 1 | 1–3 | 200m / 1500m | 512Mi / 2Gi | Độ dài hàng đợi |
| Còn lại | 1 | 1–2 | 100m / 500m | 256Mi / 512Mi | CPU 75% |

## 5. Cấu trúc thư mục backend

```
backend/
├── apps/
│   ├── api-gateway/
│   │   └── src/{modules,guards,filters,main.ts}
│   ├── identity-service/
│   │   ├── prisma/{schema.prisma,migrations/,seeds/}
│   │   └── src/{modules,events,jobs,main.ts}
│   ├── seller-service/
│   ├── catalog-service/
│   ├── cart-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── promotion-service/
│   ├── content-service/
│   ├── engagement-service/
│   ├── chat-service/
│   ├── notification-service/
│   ├── search-service/
│   ├── media-service/
│   ├── analytics-service/
│   ├── audit-service/
│   └── master-data-service/
├── libs/
│   ├── common/          # @timmyhub/common — guard, decorator, filter, interceptor, logger, ResponseDto
│   ├── rmq/             # @timmyhub/rmq — transport, outbox publisher, idempotent consumer
│   ├── prisma/          # @timmyhub/prisma — base service, audit extension, soft delete
│   └── testing/         # @timmyhub/testing — testcontainers, factory, fixture
└── package.json
```

`shared/` ở gốc monorepo chứa `@timmyhub/contracts` — zod schema, type, hợp đồng event, hằng `PERMISSIONS` —
dùng chung cả `backend/` lẫn `frontend/`.

## 6. Quy tắc thêm service mới

Trước khi tách một service mới, phải trả lời được **toàn bộ** các câu sau; nếu có một câu "không", giữ nó trong service
hiện có dưới dạng module:

1. Nó có ranh giới dữ liệu riêng, không cần transaction chung với service hiện tại?
2. Nó có nhịp thay đổi hoặc hồ sơ tải khác biệt rõ rệt?
3. Dữ liệu nó cần từ service khác có thể đến qua event với nhất quán cuối cùng?
4. Có ai đó chịu trách nhiệm vận hành nó (pipeline, cảnh báo, on-call)?
5. Chi phí thêm một DB + một pipeline + một điểm hỏng có đáng so với lợi ích?
