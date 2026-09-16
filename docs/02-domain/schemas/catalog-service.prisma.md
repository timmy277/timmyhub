---
title: Schema dữ liệu — catalog-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/product-variant.md, docs/03-specs/catalog-product, docs/03-specs/inventory]
---

# Schema dữ liệu — catalog-service (`catalog_db`)

Sở hữu cây danh mục, sản phẩm, biến thể **và toàn bộ tồn kho**. Tồn kho nằm chung service với sản phẩm để reserve
và kiểm tra giá chạy trong cùng một transaction — xem lý do đầy đủ ở [ADR-0002](../../01-architecture/adr/ADR-0002-database-per-service.md)
và mô hình chi tiết product/variant/option/inventory ở [product-variant.md](../product-variant.md) (tài liệu đó là
nguồn sự thật cho các model `Product`, `ProductOption`, `ProductOptionValue`, `ProductVariant`, `InventoryItem` —
không lặp lại field ở đây, chỉ trích khối `prisma` gốc và bổ sung phần domain-model chưa có: `Category` và
`InventoryLedger`).

```prisma
enum ResourceStatus {
    PENDING
    APPROVED
    REJECTED
    DELETED
}

model Category {
    id          String     @id @default(uuid())
    parentId    String?
    name        String
    slug        String     @unique
    image       String?
    description String?
    position    Int        @default(0)
    isActive    Boolean    @default(true)
    createdAt   DateTime   @default(now())
    updatedAt   DateTime   @updatedAt
    parent      Category?  @relation("CategoryToCategory", fields: [parentId], references: [id])
    children    Category[] @relation("CategoryToCategory")

    @@index([slug])
    @@index([parentId])
}

// --- Product / ProductOption / ProductOptionValue / ProductVariant / InventoryItem:
// mô hình đầy đủ (field, unique, CHECK) đã có ở docs/02-domain/product-variant.md §2 — tham chiếu, không lặp lại.
// Tóm tắt quan hệ trong catalog_db: Category 1—N Product, Product 1—N ProductOption 1—N ProductOptionValue,
// Product 1—N ProductVariant 1—1 InventoryItem.

/// [MỚI] Nhật ký biến động tồn kho — bất biến, FEAT-INV-005
model InventoryLedger {
    id          String   @id @default(uuid())
    variantId   String
    // RESERVE | COMMIT | RELEASE | ADJUST_MANUAL | ADJUST_RECONCILE
    changeType  String
    // âm khi trừ reserved/onHand, dương khi cộng lại
    onHandDelta   Int
    reservedDelta Int
    onHandAfter   Int
    reservedAfter Int
    // idempotency của thao tác nguồn (vd orderId:reserve, orderId:commit)
    referenceKey  String
    reason        String?
    actorId       String?
    createdAt     DateTime @default(now())

    @@unique([variantId, referenceKey, changeType])
    @@index([variantId, createdAt])
}

model ProductPriceHistory {
    id        String   @id @default(uuid())
    variantId String
    oldPrice  Decimal  @db.Decimal(14, 2)
    newPrice  Decimal  @db.Decimal(14, 2)
    changedById String?
    createdAt DateTime @default(now())

    @@index([variantId, createdAt])
}

// --- Outbox / idempotent consumer (ADR-0002) ---

model OutboxEvent {
    id            String    @id @default(uuid())
    aggregateType String
    aggregateId   String
    eventType     String
    payload       Json
    createdAt     DateTime  @default(now())
    publishedAt   DateTime?

    @@index([publishedAt])
    @@map("outbox_events")
}

model ProcessedEvent {
    eventId      String   @id
    consumerName String
    processedAt  DateTime @default(now())

    @@map("processed_events")
}
```

Ràng buộc `CHECK` viết tay cho `InventoryItem` (`onHand >= 0`, `reserved <= onHand`) nằm ở product-variant.md §2 —
không lặp lại. `InventoryLedger` là phần bổ sung của tài liệu này để thoả FEAT-INV-005 (product-variant.md chỉ mô
tả `InventoryItem` là số dư hiện tại, chưa mô tả nhật ký).

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `product.created`, `product.updated`, `product.approved`, `product.rejected`, `product.deactivated`, `category.updated`, `inventory.reserved`, `inventory.committed`, `inventory.released`, `inventory.low-stock` | `inventory.*` ghi kèm `InventoryLedger` trong cùng transaction |
| Nghe | `seller.shop.suspended` (ẩn sản phẩm), `order.completed` (tăng `soldCount` — trường dẫn xuất trên `Product`, không thuộc product-variant.md gốc nên bổ sung `soldCount Int @default(0)` trên `Product`), `campaign.activated` (gắn giá chiến dịch) | Idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Product.shopId` | `seller-service.SellerProfile.id` | — |
| `Product.categoryId` | `catalog-service.Category.id` | Nội bộ service, có FK thật |
| `InventoryLedger.actorId`, `ProductPriceHistory.changedById` | `identity-service.User.id` | — |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Product.id`, `ProductVariant.id` | `cart-service.CartItem`, `order-service.OrderItem` (snapshot, không FK), `promotion-service.CampaignProduct`, `engagement-service.Review`, `content-service.PostProduct` |
| `Category.id` | `promotion-service.Voucher.categoryIds` |
