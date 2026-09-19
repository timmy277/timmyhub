---
title: Mô hình domain tổng thể
status: review
owner: Tech Lead
updated: 2026-09-19
related: [docs/01-architecture/service-catalog.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/02-domain/product-variant.md, docs/02-domain/order-dispute.md, docs/02-domain/schemas/identity-service.prisma.md, docs/02-domain/schemas/seller-service.prisma.md, docs/02-domain/schemas/catalog-service.prisma.md, docs/02-domain/schemas/cart-service.prisma.md, docs/02-domain/schemas/order-service.prisma.md, docs/02-domain/schemas/payment-service.prisma.md, docs/02-domain/schemas/promotion-service.prisma.md, docs/02-domain/schemas/content-service.prisma.md, docs/02-domain/schemas/engagement-service.prisma.md, docs/02-domain/schemas/chat-service.prisma.md, docs/02-domain/schemas/notification-service.prisma.md, docs/02-domain/schemas/search-service.prisma.md, docs/02-domain/schemas/media-service.prisma.md, docs/02-domain/schemas/analytics-service.prisma.md, docs/02-domain/schemas/audit-service.prisma.md, docs/02-domain/schemas/master-data-service.prisma.md]
---

# Mô hình domain tổng thể

> Cập nhật theo [ADR-0015](../01-architecture/adr/ADR-0015-modular-monolith.md): không còn 16 database riêng, chỉ
> còn **một** Postgres database chung cho `backend/apps/api`. "Service" trong tài liệu này và trong 16 file
> `docs/02-domain/schemas/<tên>.prisma.md` (tên file giữ nguyên để không phải đổi 16 đường link đang trỏ tới, nhưng
> đọc là **module**) là **ranh giới sở hữu logic của một module domain** trên `src/modules/<domain>/`, không phải
> ranh giới database vật lý. Tất cả 16 phần schema nằm trong cùng một `prisma/schema/` (multi-file schema của Prisma
> ORM 6, một `schema.prisma` gốc + nhiều file `.prisma` theo thư mục), migrate cùng lúc bằng một
> `prisma migrate dev` — xem [data-architecture.md](../01-architecture/data-architecture.md). Nguyên tắc **không đổi**:
> module chỉ được đọc/ghi bảng mà nó sở hữu qua `PrismaService` của chính nó (ép bằng ESLint boundaries, không còn
> ép được bằng `DATABASE_URL` khác nhau vì giờ là cùng một connection); muốn dữ liệu domain khác thì gọi service của
> module đó qua DI hoặc nghe `EventEmitter2`, **không** tự `include`/`join` qua bảng của module khác dù kỹ thuật vẫn
> làm được (cùng DB, cùng schema) — vi phạm là vi phạm luật #2 của CLAUDE.md dù không bị Postgres chặn.

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

## 2. Bounded context map — 16 module domain, một database

Ranh giới sở hữu dữ liệu đúng theo [service-catalog.md](../01-architecture/service-catalog.md), nay là ranh giới
**module** chứ không phải ranh giới database. Không có `@relation` Prisma nào trỏ giữa bảng của hai module khác
nhau: mọi tham chiếu chéo module chỉ là **ID logic** (external reference) kiểu `String`. Muốn có dữ liệu domain
khác thì gọi service của module đó qua DI (đồng bộ, trong cùng process, có thể gộp vào cùng `$transaction`) hoặc
nghe `EventEmitter2` rồi dựng read model riêng (bất đồng bộ, chấp nhận trễ) — không còn RPC mạng, không còn tách
biệt process.

| # | Module | File schema (`docs/02-domain/schemas/`) | Biên giới dữ liệu |
|---|---|---|---|
| 1 | `identity` | `identity-service.prisma.md` | Danh tính, phiên đăng nhập, RBAC lớp 1–2 |
| 2 | `seller` | `seller-service.prisma.md` | Hồ sơ shop, thương hiệu, đơn đăng ký bán, theo dõi shop |
| 3 | `catalog` | `catalog-service.prisma.md` | Danh mục, sản phẩm, biến thể, **tồn kho** (cùng transaction với giá) |
| 4 | `cart` | `cart-service.prisma.md` | Giỏ hàng bền vững + giỏ khách vãng lai |
| 5 | `order` | `order-service.prisma.md` | Đơn hàng, dòng đơn (đã snapshot), địa chỉ, yêu cầu trả hàng |
| 6 | `payment` | `payment-service.prisma.md` | Thanh toán VNPay/COD, ví, sổ giao dịch, rút tiền |
| 7 | `promotion` | `promotion-service.prisma.md` | Voucher, chiến dịch khuyến mãi, flash sale |
| 8 | `content` | `content-service.prisma.md` | Bài đăng/video, **và quảng cáo** (chiến dịch, ngân sách, impression) |
| 9 | `engagement` | `engagement-service.prisma.md` | Đánh giá, bình chọn hữu ích, wishlist |
| 10 | `chat` | `chat-service.prisma.md` | Hội thoại, tin nhắn, ticket hỗ trợ, tranh chấp ba bên |
| 11 | `notification` | `notification-service.prisma.md` | Thông báo, tuỳ chọn nhận, template |
| 12 | `search` | `search-service.prisma.md` + Elasticsearch | Chỉ mục dẫn xuất, không phải nguồn sự thật |
| 13 | `media` | `media-service.prisma.md` | Tệp tải lên, biến thể ảnh/video, trạng thái xử lý |
| 14 | `analytics` | `analytics-service.prisma.md` | Bản tổng hợp dựng sẵn, không đọc thẳng bảng thô của module khác |
| 15 | `audit` | `audit-service.prisma.md` + Elasticsearch | Nhật ký bất biến, phân vùng theo tháng |
| 16 | `master-data` | `master-data-service.prisma.md` | Địa giới hành chính, cấu hình, feature flag, phí ship, lý do |

Module `platform` (biên HTTP/WS, trước là `api-gateway`) không sở hữu dữ liệu nghiệp vụ nên không có schema riêng
trong tài liệu này.

---

## 3. Sơ đồ quan hệ dữ liệu logic giữa các module

Mức module-to-module — **không** vẽ full ERD 42 model vào một sơ đồ. Mũi tên là ID tham chiếu (external reference)
giữa bảng của hai module trong cùng database, không phải FK Postgres thật.

```mermaid
flowchart LR
    IDN[module identity]
    SEL[module seller]
    CAT[module catalog]
    CRT[module cart]
    ORD[module order]
    PAY[module payment]
    PRM[module promotion]
    CNT[module content]
    ENG[module engagement]
    CHT[module chat]
    NTF[module notification]
    SRC[module search]
    MED[module media]
    ANA[module analytics]
    AUD[module audit]
    MDT[module master-data]

    SEL -->|userId| IDN
    CAT -->|sellerId, categoryId cha| IDN
    CAT -->|shopId| SEL
    CRT -->|userId| IDN
    CRT -->|variantId, productId| CAT
    ORD -->|buyerId| IDN
    ORD -->|sellerId| SEL
    ORD -->|snapshot variant, không gọi lại lúc hiển thị| CAT
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
    SRC -.đồng bộ qua EventEmitter2, không gọi trực tiếp.-> CAT
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

## 4. Bảng ánh xạ 42 model gốc → module mới

| # | Model gốc | Module mới | Ghi chú |
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

> Cột "Module mới" giữ nguyên hậu tố `-service` từ tên gọi cũ (`identity-service`, `catalog-service`, …) vì đây
> cũng là tiền tố của tên file schema trong `docs/02-domain/schemas/`; đọc là **tên module** (`src/modules/identity/`,
> `src/modules/catalog/`), không phải một service/deployment riêng — xem mục 2.

Không model gốc nào bị loại bỏ hoàn toàn — toàn bộ 42/42 đã có module sở hữu. Danh sách tính năng loại bỏ (khác
model) nằm ở `feature-inventory.md` §24.

### 4.1 Model MỚI theo module (không có ở bản cũ)

| Module | Model mới | Vì sao |
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

## 5. Enum gốc → module sở hữu

| Enum gốc | Module sở hữu | Dùng ở |
|---|---|---|
| `UserRole` | `identity` | `User.roles` |
| `UserVoucherStatus` | `promotion` | `UserVoucher.status` |
| `NotificationType` | `notification` | `Notification.type` |
| `OrderStatus` | `order` | `Order.status` (mở rộng 7 → 11 trạng thái, xem feature-inventory §8) |
| `PaymentStatus` | `payment` | `Payment.status` (và snapshot trên module `order` qua event, không FK) |
| `PaymentMethod` | `order` | `Order.paymentMethod` — lựa chọn tại thời điểm đặt đơn |
| `ResourceStatus` | `catalog` + `seller` | Mỗi module định nghĩa enum riêng cùng tên trong phần schema của mình (không share type qua DB, chỉ share qua `@timmyhub/contracts`) |
| `ShipperStatus` | `order` | Trạng thái shipper gắn đơn |
| `VoucherType` | `promotion` | `Voucher.type` |
| `TransactionType` | `payment` | `WalletTransaction.type` |
| `LogStatus` | `audit` | `SystemLog.status` |
| `PostStatus` | `content` | `Post.status` |

> Enum không được share bằng cách một module import type Prisma sinh ra từ phần schema của module khác (vi phạm
> luật #2 — module chỉ đụng dữ liệu của chính nó, dù giờ chung một database vật lý). Định nghĩa zod tương ứng nằm
> trong `@timmyhub/contracts` và được cả FE/BE dùng chung; mỗi phần schema của module định nghĩa lại enum Postgres
> của riêng mình với cùng giá trị.

---

## 6. Quy ước dùng chung mọi schema

| Quy ước | Chi tiết |
|---|---|
| Tiền | `Decimal @db.Decimal(14, 2)` — không `Float`, không `Int`. Bản cũ dùng `Decimal(15, 2)` cho một số field tiền — thu hẹp về `(14, 2)` theo luật cứng #1 của `CLAUDE.md`, biên giá trị tối đa ~999 tỷ VND đủ dùng |
| Timestamp | `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`; UTC ở DB, quy đổi timezone ở tầng trình bày |
| Soft delete | `deletedAt DateTime?` — chỉ thêm ở model có yêu cầu xoá mềm rõ ràng (vd `User`, `Product`, `Post`); model log/ledger bất biến (`AuditLog`, `WalletTransaction`, `InventoryLedger`, `DisputeEvent`) **không** có `deletedAt`, không cho xoá |
| Khoá chính | `id String @id @default(uuid())` cho model mới; model kế thừa nguyên trạng từ bản cũ giữ `@default(cuid())` để không phải backfill khi migrate dữ liệu thật |
| Naming | Model `PascalCase`, field `camelCase`, bảng Postgres theo tên model (Prisma mặc định, không `@@map` trừ khi cần tránh trùng từ khoá) |
| Outbox | Chỉ module nào phát **hiệu ứng phụ đi ra ngoài process** (mail, webhook, audit sink) mới cần bảng `OutboxEvent` (`outbox_events`), ghi trong cùng transaction với thay đổi nghiệp vụ, dispatch bởi `backend/apps/worker` — xem [ADR-0015](../01-architecture/adr/ADR-0015-modular-monolith.md). Event nội bộ giữa các module dùng `EventEmitter2` trong process, không cần outbox |
| Idempotent consumer | Module có nghe event qua outbox có bảng `ProcessedEvent` (`processed_events`), khoá theo `eventId`; listener `EventEmitter2` trong process tự bảo đảm idempotent bằng try/catch, không cần bảng riêng |
| Tiền tệ đa quốc gia | Tất cả field tiền kèm `currency String @default("VND")` dù hiện tại chỉ có VND, để không phải migrate schema khi mở rộng |
| Tham chiếu chéo module | Luôn là `<entity>Id String`, kiểu `String`, **không** khai báo `@relation` trỏ sang model của module khác dù kỹ thuật khả thi (cùng database) |

---

## 7. Đọc tiếp

Chi tiết field-by-field từng service nằm ở `docs/02-domain/schemas/`:
`identity-service.prisma.md`, `seller-service.prisma.md`, `catalog-service.prisma.md`, `cart-service.prisma.md`,
`order-service.prisma.md`, `payment-service.prisma.md`, `promotion-service.prisma.md`, `content-service.prisma.md`,
`engagement-service.prisma.md`, `chat-service.prisma.md`, `notification-service.prisma.md`,
`search-service.prisma.md`, `media-service.prisma.md`, `analytics-service.prisma.md`, `audit-service.prisma.md`,
`master-data-service.prisma.md`.
