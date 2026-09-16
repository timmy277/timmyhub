---
title: Mô hình domain tổng thể
status: review
owner: Tech Lead
updated: 2026-09-16
related: [docs/01-architecture/service-catalog.md, docs/01-architecture/adr/ADR-0002-database-per-service.md, docs/02-domain/product-variant.md, docs/02-domain/order-dispute.md, docs/02-domain/schemas/identity-service.prisma.md, docs/02-domain/schemas/seller-service.prisma.md, docs/02-domain/schemas/catalog-service.prisma.md, docs/02-domain/schemas/cart-service.prisma.md, docs/02-domain/schemas/order-service.prisma.md, docs/02-domain/schemas/payment-service.prisma.md, docs/02-domain/schemas/promotion-service.prisma.md, docs/02-domain/schemas/content-service.prisma.md, docs/02-domain/schemas/engagement-service.prisma.md, docs/02-domain/schemas/chat-service.prisma.md, docs/02-domain/schemas/notification-service.prisma.md, docs/02-domain/schemas/search-service.prisma.md, docs/02-domain/schemas/media-service.prisma.md, docs/02-domain/schemas/analytics-service.prisma.md, docs/02-domain/schemas/audit-service.prisma.md, docs/02-domain/schemas/master-data-service.prisma.md]
---

# Mô hình domain tổng thể

> Tài liệu này là **bản đồ dữ liệu** cấp hệ thống: mỗi service sở hữu database nào, mô hình gốc (monolith cũ) tách
> đi đâu, và các service nói chuyện với nhau bằng ID tham chiếu (external reference) chứ không phải khoá ngoại vật
> lý. Chi tiết field/type nằm ở 16 file `docs/02-domain/schemas/<service>.prisma.md`, mỗi file một service.

---

## 1. Ghi chú về số liệu bản cũ

Bản cũ (`timmyhub-nestjs/prisma/schema.prisma`, 851 dòng) có **42 model** (đếm trực tiếp bằng
`grep -c '^model ' schema.prisma`) và **12 enum**. Một số tài liệu tổng quan ở `docs/00-overview/` trích số "45 model"
— con số đó lệch so với việc đếm trực tiếp trên file schema thật; tài liệu này dùng **42** làm số liệu đối chiếu vì
đây là số đếm được từ nguồn dữ liệu thật duy nhất (`schema.prisma`). Đề nghị đối chiếu lại số "45" ở
`docs/00-overview/feature-inventory.md` §25 khi chạy `docs-audit` lần tới.

12 enum gốc: `UserVoucherStatus`, `UserRole`, `NotificationType`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`,
`ResourceStatus`, `ShipperStatus`, `VoucherType`, `TransactionType`, `LogStatus`, `PostStatus`. Bảng phân bổ enum
theo service nằm ở mục 5.

---

## 2. Bounded context map — 16 service

Ranh giới dữ liệu đúng theo [service-catalog.md](../01-architecture/service-catalog.md). Không có FK vật lý giữa
hai service khác nhau: mọi tham chiếu chéo service chỉ là **ID logic** (external reference) kiểu `String`, không có
ràng buộc `REFERENCES` ở tầng Postgres, không `include`/`join` qua Prisma relation. Muốn có dữ liệu domain khác thì
gọi RPC (đồng bộ, người dùng đang chờ) hoặc nghe event rồi dựng read model riêng (bất đồng bộ, chấp nhận trễ).

| # | Service | Database | Biên giới dữ liệu |
|---|---|---|---|
| 1 | `identity-service` | `identity_db` | Danh tính, phiên đăng nhập, RBAC lớp 1–2 |
| 2 | `seller-service` | `seller_db` | Hồ sơ shop, thương hiệu, đơn đăng ký bán, theo dõi shop |
| 3 | `catalog-service` | `catalog_db` | Danh mục, sản phẩm, biến thể, **tồn kho** (cùng transaction với giá) |
| 4 | `cart-service` | `cart_db` | Giỏ hàng bền vững + giỏ khách vãng lai |
| 5 | `order-service` | `order_db` | Đơn hàng, dòng đơn (đã snapshot), địa chỉ, yêu cầu trả hàng, saga checkout |
| 6 | `payment-service` | `payment_db` | Thanh toán VNPay/COD, ví, sổ giao dịch, rút tiền |
| 7 | `promotion-service` | `promotion_db` | Voucher, chiến dịch khuyến mãi, flash sale |
| 8 | `content-service` | `content_db` | Bài đăng/video, **và quảng cáo** (chiến dịch, ngân sách, impression) |
| 9 | `engagement-service` | `engagement_db` | Đánh giá, bình chọn hữu ích, wishlist |
| 10 | `chat-service` | `chat_db` | Hội thoại, tin nhắn, ticket hỗ trợ, tranh chấp ba bên |
| 11 | `notification-service` | `notification_db` | Thông báo, tuỳ chọn nhận, template |
| 12 | `search-service` | `search_db` + Elasticsearch | Chỉ mục dẫn xuất, không phải nguồn sự thật |
| 13 | `media-service` | `media_db` | Tệp tải lên, biến thể ảnh/video, trạng thái xử lý |
| 14 | `analytics-service` | `analytics_db` | Bản tổng hợp dựng sẵn, không đọc thẳng dữ liệu thô service khác |
| 15 | `audit-service` | `audit_db` + Elasticsearch | Nhật ký bất biến, phân vùng theo tháng |
| 16 | `master-data-service` | `masterdata_db` | Địa giới hành chính, cấu hình, feature flag, phí ship, lý do |

`api-gateway` không sở hữu dữ liệu nghiệp vụ nên không có schema riêng trong tài liệu này.

---

## 3. Sơ đồ quan hệ dữ liệu logic giữa các service

Mức service-to-service — **không** vẽ full ERD 42 model vào một sơ đồ. Mũi tên là ID tham chiếu (external
reference), không phải FK.

```mermaid
flowchart LR
    IDN[identity-service]
    SEL[seller-service]
    CAT[catalog-service]
    CRT[cart-service]
    ORD[order-service]
    PAY[payment-service]
    PRM[promotion-service]
    CNT[content-service]
    ENG[engagement-service]
    CHT[chat-service]
    NTF[notification-service]
    SRC[search-service]
    MED[media-service]
    ANA[analytics-service]
    AUD[audit-service]
    MDT[master-data-service]

    SEL -->|userId| IDN
    CAT -->|sellerId, categoryId cha| IDN
    CAT -->|shopId| SEL
    CRT -->|userId| IDN
    CRT -->|variantId, productId| CAT
    ORD -->|buyerId| IDN
    ORD -->|sellerId| SEL
    ORD -->|snapshot variant, không gọi RPC lúc hiển thị| CAT
    ORD -->|provinceCode/districtCode/wardCode| MDT
    PAY -->|orderId| ORD
    PAY -->|sellerId ví| SEL
    PRM -->|sellerId phát hành| SEL
    PRM -->|productId/categoryId áp dụng| CAT
    CNT -->|sellerId| SEL
    CNT -->|productId gắn bài| CAT
    CNT -->|mediaId| MED
    ENG -->|userId, orderItemId| ORD
    ENG -->|productId| CAT
    CHT -->|senderId/receiverId| IDN
    CHT -->|orderId, orderItemId tranh chấp| ORD
    NTF -->|userId| IDN
    SRC -.đồng bộ qua event, không RPC.-> CAT
    SRC -.đồng bộ qua event.-> CNT
    SRC -.đồng bộ qua event.-> SEL
    MED -->|ownerId upload| IDN
    ANA -.tổng hợp qua event.-> ORD
    ANA -.tổng hợp qua event.-> PAY
    ANA -.tổng hợp qua event.-> CAT
    AUD -.nhận audit.recorded.-> IDN
    AUD -.nhận audit.recorded.-> SEL
    AUD -.nhận audit.recorded.-> CAT
    AUD -.nhận audit.recorded.-> ORD
    AUD -.nhận audit.recorded.-> PAY
```

---

## 4. Bảng ánh xạ 42 model gốc → service mới

| # | Model gốc | Service mới | Ghi chú |
|---|---|---|---|
| 1 | `User` | `identity-service` | Giữ nguyên vai trò danh tính |
| 2 | `Profile` | `identity-service` | — |
| 3 | `Device` | `identity-service` | — |
| 4 | `RefreshToken` | `identity-service` | — |
| 5 | `SystemRole` | `identity-service` | RBAC lớp 2 |
| 6 | `UserSystemRole` | `identity-service` | — |
| 7 | `Permission` | `identity-service` | — |
| 8 | `RolePermission` | `identity-service` | — |
| 9 | `UserPermission` | `identity-service` | RBAC lớp 2b |
| 10 | `PasswordResetToken` | `identity-service` | — |
| 11 | `Address` | `order-service` | Theo service-catalog: sổ địa chỉ gắn với luồng đặt đơn, không tách `identity` |
| 12 | `SellerProfile` | `seller-service` | — |
| 13 | `BrandProfile` | `seller-service` | — |
| 14 | `Category` | `catalog-service` | — |
| 15 | `Product` | `catalog-service` | **Tách/đổi mô hình**: bỏ `price`/`stock` thẳng trên `Product`, thêm `ProductOption`/`ProductOptionValue`, xem [product-variant.md](product-variant.md) |
| 16 | `ProductVariant` | `catalog-service` | **Đổi mô hình**: khoá bằng `optionKey`, tồn kho tách sang `InventoryItem` — xem product-variant.md |
| 17 | `Cart` | `cart-service` | — |
| 18 | `CartItem` | `cart-service` | Khoá theo `variantId` thay vì `productId` (do đổi mô hình #16) |
| 19 | `Order` | `order-service` | — |
| 20 | `OrderItem` | `order-service` | **Mở rộng**: thêm trường snapshot bất biến (`productName`, `variantLabel`, `sku`, `imageUrl`) — xem product-variant.md §4 |
| 21 | `Payment` | `payment-service` | — |
| 22 | `PromotionCampaign` | `promotion-service` | — |
| 23 | `CampaignProduct` | `promotion-service` | `productId` đổi nghĩa thành tham chiếu tới `variantId` khi cần giá riêng theo biến thể |
| 24 | `Voucher` | `promotion-service` | — |
| 25 | `VoucherUsageLog` | `promotion-service` | — |
| 26 | `UserVoucher` | `promotion-service` | — |
| 27 | `Review` | `engagement-service` | — |
| 28 | `ReviewComment` | `engagement-service` | — |
| 29 | `ChatMessage` | `chat-service` | **Mở rộng**: bọc trong `Conversation` mới thay vì cặp sender/receiver rời rạc |
| 30 | `ReviewHelpfulVote` | `engagement-service` | — |
| 31 | `WishlistItem` | `engagement-service` | — |
| 32 | `Wallet` | `payment-service` | Bản cũ có model nhưng **chưa từng có API** (FEAT-WAL-001) |
| 33 | `WalletTransaction` | `payment-service` | Idem |
| 34 | `Notification` | `notification-service` | — |
| 35 | `SystemLog` | `audit-service` | — |
| 36 | `Province` | `master-data-service` | — |
| 37 | `District` | `master-data-service` | — |
| 38 | `Ward` | `master-data-service` | — |
| 39 | `Post` | `content-service` | — |
| 40 | `PostProduct` | `content-service` | `productId` → tham chiếu logic sang `catalog-service` |
| 41 | `PostLike` | `content-service` | — |
| 42 | `PostComment` | `content-service` | — |

Không model gốc nào bị loại bỏ hoàn toàn — toàn bộ 42/42 đã có service sở hữu. Danh sách tính năng loại bỏ (khác
model) nằm ở `feature-inventory.md` §24.

### 4.1 Model MỚI theo service (không có ở bản cũ)

| Service | Model mới | Vì sao |
|---|---|---|
| `seller-service` | `SellerApplication`, `ShopFollow` | Tách luồng đơn đăng ký khỏi `SellerProfile` đã duyệt; theo dõi shop là tính năng mới (FEAT-USR-010) |
| `catalog-service` | `ProductOption`, `ProductOptionValue`, `InventoryItem`, `InventoryLedger` | Domain `inventory` hoàn toàn mới (FEAT-INV-*), xem product-variant.md |
| `order-service` | `OrderStatusHistory`, `ReturnRequest` | Lịch sử chuyển trạng thái (FEAT-ORD-003) và trả hàng (FEAT-ORD-011) chưa từng có |
| `payment-service` | `PaymentAttempt`, `Withdrawal` | Theo dõi từng lần thử thanh toán riêng khỏi `Payment` cuối cùng; rút tiền seller (FEAT-WAL-005) |
| `content-service` | `AdCampaign`, `AdCreative`, `AdEvent` | Domain `video-ads` hoàn toàn mới (FEAT-ADS-*) |
| `chat-service` | `Conversation`, `SupportTicket`, `Dispute`, `DisputeEvent` | Ticket hỗ trợ và tranh chấp ba bên (FEAT-CHT-005/006), xem order-dispute.md |
| `notification-service` | `NotificationPreference`, `NotificationTemplate` | Tuỳ chọn nhận theo kênh (FEAT-NTF-005), template có phiên bản (FEAT-NTF-009) |
| `search-service` | `IndexJob` | Theo dõi tiến trình reindex (FEAT-SRC-007) |
| `media-service` | `MediaAsset`, `MediaVariant` | Toàn bộ domain `media-upload` mới, bản cũ upload thẳng qua backend không có model theo dõi |
| `analytics-service` | `DailyRollup`, `FunnelEvent`, `ReportJob` | Bản tổng hợp dựng sẵn (FEAT-ANA-010), phễu chuyển đổi (FEAT-ANA-005), xuất báo cáo (FEAT-ANA-009) |
| `audit-service` | `AuditLog` | `SystemLog` giữ nguyên từ bản cũ, `AuditLog` là bảng bất biến mới ghi diff đầy đủ (FEAT-AUD-001/003) |
| `master-data-service` | `SystemConfig`, `FeatureFlag`, `ShippingRate`, `ReasonCode` | Toàn bộ mới ngoài `Province`/`District`/`Ward` |

---

## 5. Enum gốc → service sở hữu

| Enum gốc | Service sở hữu | Dùng ở |
|---|---|---|
| `UserRole` | `identity-service` | `User.roles` |
| `UserVoucherStatus` | `promotion-service` | `UserVoucher.status` |
| `NotificationType` | `notification-service` | `Notification.type` |
| `OrderStatus` | `order-service` | `Order.status` (mở rộng 7 → 11 trạng thái, xem feature-inventory §8) |
| `PaymentStatus` | `payment-service` | `Payment.status` (và snapshot trên `order-service` qua event, không FK) |
| `PaymentMethod` | `order-service` | `Order.paymentMethod` — lựa chọn tại thời điểm đặt đơn |
| `ResourceStatus` | `catalog-service` + `seller-service` | Mỗi service định nghĩa enum riêng cùng tên (không share type qua DB, chỉ share qua `@timmyhub/contracts`) |
| `ShipperStatus` | `order-service` | Trạng thái shipper gắn đơn |
| `VoucherType` | `promotion-service` | `Voucher.type` |
| `TransactionType` | `payment-service` | `WalletTransaction.type` |
| `LogStatus` | `audit-service` | `SystemLog.status` |
| `PostStatus` | `content-service` | `Post.status` |

> Enum không được share bằng cách import chéo Prisma schema (vi phạm luật #2 — một service một DB). Định nghĩa
> zod tương ứng nằm trong `@timmyhub/contracts` và được cả FE/BE dùng chung; mỗi `schema.prisma` định nghĩa lại
> enum Postgres của riêng mình với cùng giá trị.

---

## 6. Quy ước dùng chung mọi schema

| Quy ước | Chi tiết |
|---|---|
| Tiền | `Decimal @db.Decimal(14, 2)` — không `Float`, không `Int`. Bản cũ dùng `Decimal(15, 2)` cho một số field tiền — thu hẹp về `(14, 2)` theo luật cứng #1 của `CLAUDE.md`, biên giá trị tối đa ~999 tỷ VND đủ dùng |
| Timestamp | `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`; UTC ở DB, quy đổi timezone ở tầng trình bày |
| Soft delete | `deletedAt DateTime?` — chỉ thêm ở model có yêu cầu xoá mềm rõ ràng (vd `User`, `Product`, `Post`); model log/ledger bất biến (`AuditLog`, `WalletTransaction`, `InventoryLedger`, `DisputeEvent`) **không** có `deletedAt`, không cho xoá |
| Khoá chính | `id String @id @default(uuid())` cho model mới; model kế thừa nguyên trạng từ bản cũ giữ `@default(cuid())` để không phải backfill khi migrate dữ liệu thật |
| Naming | Model `PascalCase`, field `camelCase`, bảng Postgres theo tên model (Prisma mặc định, không `@@map` trừ khi cần tránh trùng từ khoá) |
| Outbox | Service có phát event nghiệp vụ quan trọng có bảng `OutboxEvent` (`outbox_events`), ghi trong cùng transaction với thay đổi nghiệp vụ — xem [ADR-0002](../01-architecture/adr/ADR-0002-database-per-service.md) |
| Idempotent consumer | Service có nghe event có bảng `ProcessedEvent` (`processed_events`), khoá theo `eventId` |
| Tiền tệ đa quốc gia | Tất cả field tiền kèm `currency String @default("VND")` dù hiện tại chỉ có VND, để không phải migrate schema khi mở rộng |
| Tham chiếu chéo service | Luôn là `<entity>Id String`, kiểu `String`, **không** khai báo `@relation` trỏ sang model không tồn tại trong cùng schema |

---

## 7. Đọc tiếp

Chi tiết field-by-field từng service nằm ở `docs/02-domain/schemas/`:
`identity-service.prisma.md`, `seller-service.prisma.md`, `catalog-service.prisma.md`, `cart-service.prisma.md`,
`order-service.prisma.md`, `payment-service.prisma.md`, `promotion-service.prisma.md`, `content-service.prisma.md`,
`engagement-service.prisma.md`, `chat-service.prisma.md`, `notification-service.prisma.md`,
`search-service.prisma.md`, `media-service.prisma.md`, `analytics-service.prisma.md`, `audit-service.prisma.md`,
`master-data-service.prisma.md`.
