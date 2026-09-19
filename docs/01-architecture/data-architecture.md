---
title: Kiến trúc dữ liệu
status: approved
owner: Backend Lead
updated: 2026-09-19
related: [docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/01-architecture/adr/ADR-0009-prisma-migrate.md, docs/02-domain/domain-model.md]
---

# Kiến trúc dữ liệu

> Trước ngày 2026-09-19, tài liệu này mô tả 16 database riêng theo từng service. Theo
> [ADR-0015](adr/ADR-0015-modular-monolith.md), toàn bộ dữ liệu nằm trong **một database Postgres**, tổ chức theo
> module bằng Prisma multi-file schema. Ranh giới dữ liệu giữa các module giờ được giữ bằng **quy ước code**, không
> phải bằng quyền kết nối DB riêng.

## 1. Nguyên tắc nền

| # | Nguyên tắc | Kiểm chứng bằng |
|---|---|---|
| 1 | Một database Postgres cho toàn ứng dụng, tổ chức theo module bằng multi-file schema (`prisma/schema/<module>.prisma`) | Một `DATABASE_URL` cho `backend/apps/api` |
| 2 | Không service của module này tự viết Prisma query trên bảng của module khác | ESLint boundary rule + rà soát PR — dù kỹ thuật có thể `JOIN` được, quy ước vẫn cấm để giữ khả năng tách sau này |
| 3 | Khoá ngoại xuyên module lưu dưới dạng **id trần** (`sellerId String`), không dùng `@relation` của Prisma xuyên module | Chỉ `@relation` trong cùng module; tham chiếu module khác luôn là cột `String` thường |
| 4 | Dữ liệu tiền bạc dùng `Decimal`, không `Float` | Lint schema |
| 5 | Mọi thay đổi schema đi qua `prisma migrate` | CI chặn nếu `migrations/` không khớp `schema/` |
| 6 | Không xoá cứng dữ liệu nghiệp vụ có tham chiếu | `deletedAt` + lọc mặc định |
| 7 | Ảnh dữ liệu (denormalized snapshot) chỉ dùng khi giá trị **phải đóng băng** tại thời điểm giao dịch, không phải để né việc gọi service khác | Rà soát PR — xem §3 |

## 2. Bản đồ schema (multi-file, một database)

| File schema | Module | Nhóm model chính | Kích thước dự kiến năm 1 |
|---|---|---|---|
| `identity.prisma` | identity | `User`, `Profile`, `Device`, `RefreshToken`, `SystemRole`, `Permission`, `RolePermission`, `UserPermission`, `PasswordResetToken` | ~50 K user, ~500 K token |
| `seller.prisma` | seller | `SellerProfile`, `SellerApplication`, `BrandProfile`, `ShopFollow`, `ShopPolicy` | ~5 K shop |
| `catalog.prisma` | catalog | `Category`, `Product`, `ProductVariant`, `ProductImage`, `ProductAttribute`, `Inventory`, `InventoryReservation`, `InventoryLedger` | ~200 K sản phẩm, ~800 K biến thể, ledger ~5 M dòng |
| `cart.prisma` | cart | `Cart`, `CartItem`, `SavedItem` | ~50 K giỏ |
| `order.prisma` | order | `Order`, `OrderItem`, `OrderStatusHistory`, `Address`, `ReturnRequest` | ~700 K đơn |
| `payment.prisma` | payment | `Payment`, `PaymentAttempt`, `Refund`, `Wallet`, `WalletTransaction`, `Withdrawal`, `Reconciliation` | ~700 K giao dịch |
| `promotion.prisma` | promotion | `Voucher`, `UserVoucher`, `VoucherUsageLog`, `PromotionCampaign`, `CampaignProduct`, `FlashSaleSlot` | ~2 M `UserVoucher` |
| `content.prisma` | content | `Post`, `PostProduct`, `PostLike`, `PostComment`, `AdCampaign`, `AdCreative`, `AdPlacement`, `AdEventRollup`, `ContentReport` | ~100 K bài, rollup ~10 M dòng |
| `engagement.prisma` | engagement | `Review`, `ReviewComment`, `ReviewHelpfulVote`, `WishlistItem` | ~500 K đánh giá |
| `chat.prisma` | chat | `Conversation`, `ConversationParticipant`, `ChatMessage`, `SupportTicket`, `Dispute` | ~10 M tin nhắn |
| `notification.prisma` | notification | `Notification`, `NotificationPreference`, `NotificationTemplate`, `DeliveryLog` | ~20 M thông báo |
| `search.prisma` | search | `IndexJob`, `SearchKeyword`, `SyncCheckpoint` | nhỏ |
| `media.prisma` | media | `MediaAsset`, `MediaVariant`, `UploadSession` | ~2 M tệp |
| `analytics.prisma` | analytics | `DailyRollup`, `HourlyRollup`, `FunnelEvent`, `CohortSnapshot`, `ReportJob` | rollup ~20 M dòng |
| `audit.prisma` | audit | `AuditLog` (phân vùng), `SystemLog` (phân vùng) | ~100 M dòng/năm |
| `master-data.prisma` | master-data | `Province`, `District`, `Ward`, `SystemConfig`, `FeatureFlag`, `ShippingRate`, `ReasonCode` | ~11 K bản ghi địa giới |
| `outbox.prisma` | dùng chung | `OutboxEvent`, `ProcessedEvent` | Xoay vòng nhanh, dọn sau 7–30 ngày |

Một database cho mọi môi trường (dev, staging, production) — không còn khác biệt "dev 1 instance nhiều DB logic, prod
tách theo nhóm tải" như bản cũ. Nếu một domain (ví dụ `payment`) sau này cần tách ra database riêng vì lý do đo được
(§9 của [ADR-0015](adr/ADR-0015-modular-monolith.md)), việc tách chỉ cần đổi datasource của schema đó, vì code đã
không phụ thuộc ngầm vào việc "cùng DB nên join được" (§1 nguyên tắc 2).

## 3. Tham chiếu dữ liệu xuyên module

Vì cùng một database, module **kỹ thuật có thể** đọc thẳng bảng của module khác — nhưng quy ước vẫn giữ nguyên như
kiến trúc cũ để không đánh mất khả năng tách sau này. Chọn cách tham chiếu theo nhu cầu:

| Cách | Khi nào | Ví dụ | Đánh đổi |
|---|---|---|---|
| **Id trần** | Chỉ cần liên kết, hiển thị lấy sau qua gọi service | `Order.userId` | Cần một lời gọi hàm thêm khi hiển thị (rẻ — cùng process, không phải network) |
| **Ảnh dữ liệu (denormalized snapshot)** | Giá trị **phải** đóng băng tại thời điểm giao dịch | `OrderItem.productName`, `unitPrice` | Không bao giờ cập nhật — đó là mục đích |
| **Gọi service trực tiếp lúc đọc** | Đọc nhiều, hiển thị kèm, luôn cần dữ liệu mới nhất | Trang chi tiết đơn hiển thị tên shop hiện tại | Không cần "dựng lại" như read model cũ — luôn đọc trực tiếp, có thể cache ở tầng gọi nếu cần |

Điểm khác biệt lớn nhất so với bản database-per-service: **read model dựng từ event để tránh gọi RPC đã không còn cần
thiết cho phần lớn trường hợp** — vì gọi service của module khác giờ là một lời gọi hàm trong process, không có chi
phí mạng để né. `UserRef`, `SyncCheckpoint`, "dựng lại read model" ở bản cũ được **loại bỏ** trừ khi có lý do khác
(ví dụ `search` vẫn cần chỉ mục Elasticsearch dựng từ event, vì đó là dữ liệu dẫn xuất sang hệ thống khác, không phải
để né gọi hàm).

❌ **BAD** — ảnh giá và việc gọi lại service lẫn lộn:

```prisma
model OrderItem {
    productId   String
    // Cập nhật theo event product.updated → hoá đơn cũ đổi giá theo giá hiện tại
    productName String   // ❌ nếu bị ghi đè sau khi tạo
    unitPrice   Decimal  // ❌ nếu bị ghi đè sau khi tạo
}
```

✅ **GOOD** — tách rõ ràng:

```prisma
model OrderItem {
    id         String  @id @default(cuid())
    orderId    String
    // --- Ảnh dữ liệu: ghi một lần lúc tạo đơn, KHÔNG BAO GIỜ cập nhật ---
    productId  String
    variantId  String
    sellerId   String
    productName String
    variantName String
    sku        String
    imageUrl   String?
    unitPrice  Decimal @db.Decimal(14, 2)
    quantity   Int
    // -------------------------------------------------------------------
    order      Order   @relation(fields: [orderId], references: [id])

    @@index([productId])
    @@index([sellerId])
    @@map("order_items")
}
```

Quy tắc: **bất cứ thứ gì in ra hoá đơn đều là ảnh dữ liệu.** Mọi thứ khác (tên shop hiện tại, avatar người bình luận)
đọc trực tiếp qua gọi service của module sở hữu tại thời điểm hiển thị.

## 4. Quy ước schema Prisma

```prisma
// prisma/schema/order.prisma — một trong nhiều file, cùng generator/datasource khai báo ở base.prisma
generator client {
    provider        = "prisma-client"
    output          = "../src/generated/prisma"
    previewFeatures = ["driverAdapters"]
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}
```

| Hạng mục | Quy ước | Ví dụ |
|---|---|---|
| Khoá chính | `String @id @default(cuid())` | |
| Tiền | `Decimal @db.Decimal(14, 2)` | `unitPrice` |
| Phần trăm | `Decimal @db.Decimal(5, 2)` | `commissionRate` |
| Số lượng | `Int` | `quantity` |
| Thời gian | `DateTime` (UTC), cột `timestamptz` | `createdAt` |
| JSON | `Json` — chỉ cho dữ liệu **không truy vấn** | `AuditLog.diff` |
| Enum | Khai báo trong schema, không dùng `String` tự do | `OrderStatus` |
| Xoá mềm | `deletedAt DateTime?` + index một phần | |
| Đặt tên bảng | `@@map("snake_case_số_nhiều")` | `@@map("product_variants")` |
| Đặt tên cột | `@map("snake_case")` khi khác `camelCase` | `@map("seller_profile_id")` |

**Bắt buộc `@db.Decimal` cho tiền.** `Float` gây sai số tích luỹ; `Int` theo đơn vị nhỏ nhất cũng được nhưng phải nhất
quán toàn hệ thống — dự án chọn `Decimal`.

Một `PrismaClient` dùng chung cho toàn app, với `@prisma/adapter-pg` và connection pool:

```ts
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 20),   // pool lớn hơn bản cũ vì gộp tải của 16 module vào một pool
})
export const prisma = new PrismaClient({ adapter }).$extends(auditExtension)
```

Mỗi module inject cùng một `PrismaService` (wrapper của `PrismaClient`) qua DI — không mỗi module tự mở connection
pool riêng như khi còn là database riêng.

## 5. Chỉ mục

Nguyên tắc: **mỗi truy vấn trên đường nóng phải có chỉ mục tương ứng**; mỗi chỉ mục phải chỉ ra được truy vấn dùng nó.

| Bảng | Chỉ mục | Truy vấn phục vụ |
|---|---|---|
| `products` | `(sellerId, status, createdAt DESC)` | Danh sách sản phẩm của seller |
| `products` | `(status, categoryId, createdAt DESC)` | Duyệt theo danh mục |
| `products` | `UNIQUE(slug)` | Trang chi tiết theo slug |
| `product_variants` | `UNIQUE(productId, sku)` | Chống trùng SKU trong sản phẩm |
| `inventory` | `UNIQUE(variantId)` | Reserve/commit |
| `inventory_ledger` | `(variantId, createdAt DESC)` | Lịch sử biến động |
| `orders` | `(userId, status, createdAt DESC)` | Đơn của tôi |
| `orders` | `(sellerId, status, createdAt DESC)` | Đơn của shop |
| `orders` | `UNIQUE(orderNumber)` | Tra cứu theo mã đơn |
| `order_items` | `(sellerId, createdAt DESC)` | Tổng hợp doanh số |
| `payments` | `UNIQUE(orderId)` | Một đơn một thanh toán thành công |
| `payments` | `UNIQUE(providerTxnRef)` | Khử trùng lặp IPN |
| `user_vouchers` | `UNIQUE(userId, voucherId)` | Chống thu thập trùng |
| `voucher_usage_logs` | `(voucherId, userId)` | Kiểm tra giới hạn mỗi người |
| `posts` | `(authorId, status, publishedAt DESC)` | Bài của seller |
| `posts` | `(status, publishedAt DESC)` | Feed |
| `post_likes` | `UNIQUE(postId, userId)` | Chống like trùng |
| `reviews` | `(productId, status, createdAt DESC)` | Đánh giá theo sản phẩm |
| `reviews` | `UNIQUE(orderItemId)` | Một dòng đơn một đánh giá |
| `chat_messages` | `(conversationId, createdAt DESC)` | Cuộn lịch sử chat |
| `notifications` | `(userId, readAt, createdAt DESC)` | Danh sách chưa đọc |
| `audit_logs` | `(entityType, entityId, createdAt DESC)` | Lịch sử một thực thể |
| `audit_logs` | `(actorId, createdAt DESC)` | Hoạt động của một người |
| `outbox_events` | `(status, createdAt)` | Worker BullMQ quét |
| Mọi bảng có xoá mềm | Index một phần `WHERE deleted_at IS NULL` | Danh sách mặc định |

## 6. Migration

Dùng `prisma migrate`, **không** dùng `prisma db push` ngoài môi trường cá nhân —
xem [ADR-0009](adr/ADR-0009-prisma-migrate.md).

```bash
# Phát triển — multi-file schema, migrate đọc toàn bộ thư mục prisma/schema/
pnpm --filter api exec prisma migrate dev --name add_inventory_reservation

# CI: chặn nếu schema và migration lệch nhau
pnpm --filter api exec prisma migrate diff \
    --from-migrations ./prisma/migrations \
    --to-schema-datamodel ./prisma/schema \
    --exit-code

# Production: chạy bằng Kubernetes Job trước khi rollout
pnpm --filter api exec prisma migrate deploy
```

Vì chỉ còn **một** thư mục `migrations/` cho toàn app (thay vì 16), một PR đổi schema của module `catalog` sinh ra
đúng một migration mới trong lịch sử chung — cần chú ý thứ tự merge để tránh xung đột migration khi nhiều PR đổi
schema song song (xem quy tắc rebase migration ở [coding-standards.md](../06-quality/coding-standards.md)).

### Thay đổi phá vỡ — mẫu bốn bước

Không bao giờ đổi schema và code trong cùng một lần phát hành khi thay đổi có tính phá vỡ.

| Bước | Schema | Code | Ví dụ: đổi `Product.price` → `ProductVariant.price` |
|---|---|---|---|
| 1. Mở rộng | Thêm cột mới, cho phép `NULL` | Chưa dùng | Thêm `ProductVariant.price` |
| 2. Ghi đôi | Không đổi | Ghi cả cột cũ và mới, đọc cột cũ | |
| 3. Lấp dữ liệu | Migration dữ liệu | Chuyển sang đọc cột mới | Sao chép `Product.price` xuống từng biến thể |
| 4. Thu hẹp | Xoá cột cũ, đặt `NOT NULL` | Bỏ ghi cột cũ | Xoá `Product.price` |

Mỗi bước là **một lần phát hành riêng**, có thể quay lui độc lập.

### Quy tắc migration

1. Migration **không được** chứa `DROP` cột ở cùng lần phát hành với code còn đọc cột đó.
2. Thêm cột `NOT NULL` vào bảng có dữ liệu thì phải có `DEFAULT`, hoặc tách thành ba bước.
3. Tạo index trên bảng lớn dùng `CREATE INDEX CONCURRENTLY` (Prisma: viết SQL thủ công trong migration).
4. Migration dữ liệu lớn chạy theo lô, không khoá bảng.
5. Mọi migration production chạy bằng Kubernetes Job **trước** khi rollout pod mới — cùng một database nên downtime
   migration ảnh hưởng **toàn app**, không chỉ một module; ưu tiên migration không khoá bảng dài.

## 7. Phân vùng bảng lớn

Bốn bảng tăng trưởng không giới hạn được phân vùng theo tháng (`RANGE` trên `created_at`), tất cả trong cùng database:

| Bảng | Module | Lưu nóng | Sau đó |
|---|---|---|---|
| `audit_logs` | audit | 12 tháng | Lưu trữ lạnh (object storage), giữ 7 năm |
| `system_logs` | audit | 3 tháng | Xoá |
| `ad_event_rollups` | content | 6 tháng | Tổng hợp theo tháng rồi xoá chi tiết |
| `chat_messages` | chat | 24 tháng | Lưu trữ lạnh |

Job `partition-maintenance` (BullMQ, chạy trên worker process) tạo trước phân vùng của **3 tháng kế tiếp** và tách
phân vùng quá hạn. Thiếu phân vùng là lỗi nghiêm trọng (mọi `INSERT` thất bại) → có cảnh báo riêng.

## 8. Cache

| Tầng | Công nghệ | TTL | Vô hiệu hoá bằng |
|---|---|---|---|
| Kết quả gọi service đọc nhiều | Upstash Redis (REST) | 5 phút | Event tương ứng |
| Quyền hiệu lực của user | Redis | 15 phút | `rbac.permissions.changed`, `user.role-*` |
| Chi tiết sản phẩm theo slug | Redis | 10 phút | `product.updated`, `product.deactivated` |
| Cây danh mục | Redis | 1 giờ | `category.updated` |
| Dữ liệu nền (tỉnh/huyện/xã, config, flag) | Redis | 24 giờ | `config.updated`, `feature-flag.changed` |
| Giỏ hàng | Redis | 30 phút | Mọi thao tác ghi giỏ |
| Giỏ khách vãng lai | Redis (nguồn duy nhất) | 7 ngày | — |
| Bộ đếm rate limit | Redis | Theo cửa sổ | — |
| Trang tĩnh (ISR) | Next.js | 60 giây | Tag revalidation |

**Quy tắc:** cache luôn có TTL; vô hiệu hoá chủ động là để giảm độ trễ, **không phải** cơ chế đúng đắn duy nhất.
Hệ thống phải chạy đúng cả khi mọi thứ chỉ hết hạn theo TTL. Vì gọi giữa module giờ rẻ hơn nhiều (không qua mạng),
cache ở đây chủ yếu để giảm tải Postgres, không phải để né chi phí RPC như bản cũ.

Mẫu khoá: `<module>:<mục đích>:<định danh>` — ví dụ `catalog:product:slug:ao-thun-nam`.

## 9. Sao lưu và khôi phục

Một database duy nhất đơn giản hoá đáng kể so với bản cũ (16 database cần backup/restore riêng):

| Đối tượng | Tần suất | Cách | Giữ | Khôi phục theo thời điểm |
|---|---|---|---|---|
| Database Postgres (toàn bộ) | Liên tục (WAL) | PITR của nhà cung cấp | 7 ngày | Có |
| Database Postgres (toàn bộ) | Hằng ngày 02:00 | Snapshot đầy đủ | 30 ngày | Không |
| Database Postgres | Hằng ngày | Bản sao thêm ở vùng khác | 90 ngày | Không |
| Elasticsearch | — | **Không sao lưu** — dựng lại từ module `catalog` | — | — |
| Supabase Storage | Hằng ngày | Bản sao bucket | 30 ngày | Không |

| Chỉ tiêu | Mục tiêu |
|---|---|
| RPO | ≤ 15 phút (NFR-006) |
| RTO | ≤ 60 phút (NFR-007) |
| Diễn tập khôi phục | Hằng quý, có biên bản |

**Khôi phục giờ đơn giản hơn hẳn bản database-per-service**: khôi phục về thời điểm T khôi phục **toàn bộ** dữ liệu
(order, payment, catalog...) về cùng một thời điểm nhất quán — không còn nguy cơ "khôi phục `order` mà `payment` vẫn
ở hiện tại" như kiến trúc cũ. Quy trình chi tiết: [runbook.md](../05-infra/runbook.md).

## 10. Dữ liệu cá nhân

| Loại | Ví dụ | Xử lý |
|---|---|---|
| Định danh trực tiếp | Email, số điện thoại, họ tên, địa chỉ | Mã hoá khi nghỉ ở tầng DB; che trong log |
| Xác thực | Mật khẩu | bcrypt cost ≥ 12, **không bao giờ** ghi log |
| Token | Access/refresh token, token đặt lại mật khẩu | Chỉ lưu bản băm; che trong log |
| Tài chính | Số tài khoản ngân hàng rút tiền | Mã hoá, chỉ hiện 4 số cuối |
| Hành vi | Lịch sử xem, tìm kiếm | Ẩn danh hoá sau 12 tháng |

Khi người dùng yêu cầu xoá tài khoản (FEAT-USR-008): ẩn danh hoá `User` và `Profile` (email → `deleted-<hash>@…`),
**giữ nguyên** `Order`, `Payment`, `AuditLog` vì nghĩa vụ kế toán và kiểm toán; xoá `Cart`, `WishlistItem`,
`ChatMessage` do người dùng tạo, lịch sử tìm kiếm. Vì cùng một database, thao tác này chạy trong **một
`$transaction`** xuyên bảng của nhiều module — đơn giản hơn hẳn việc phải phát event xoá tài khoản tới 16 service
riêng như kiến trúc cũ.

Danh sách trường bị che trong log nằm trong cấu hình `pino` redact — xem [observability.md](observability.md).

## 11. Seed

| Loại | Chạy ở | Nội dung | Idempotent |
|---|---|---|---|
| `seed:essential` | Mọi môi trường kể cả production | Permission, SystemRole, ReasonCode, Province/District/Ward, NotificationTemplate | Có (`upsert` theo `code`) |
| `seed:demo` | Chỉ dev và staging | Shop mẫu, sản phẩm mẫu, đơn mẫu, người dùng mẫu | Có |

`seed:essential` chạy như một Kubernetes Job sau `migrate deploy`, trước khi rollout. Nếu seed thất bại ở production,
việc phát hành **dừng lại** — không rollout pod mới với dữ liệu nền thiếu. Vì một database duy nhất, seed chạy đúng
một lần cho toàn app thay vì lặp lại cho từng service như bản cũ.
