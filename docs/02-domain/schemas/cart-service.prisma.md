---
title: Schema dữ liệu — cart-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/product-variant.md, docs/03-specs/cart-checkout]
---

# Schema dữ liệu — cart-service (`cart_db`)

Sở hữu giỏ hàng bền vững theo user. Giỏ khách vãng lai không nằm trong Postgres — chỉ ở Redis, TTL 7 ngày, không
mô tả trong file này. Giỏ khoá theo `variantId` (không phải `productId`) theo thay đổi mô hình ở product-variant.md.

```prisma
model Cart {
    id        String     @id @default(uuid())
    userId    String     @unique
    createdAt DateTime   @default(now())
    updatedAt DateTime   @updatedAt
    items     CartItem[]
}

model CartItem {
    id        String   @id @default(uuid())
    cartId    String
    // tham chiếu logic sang catalog-service, không FK
    productId String
    variantId String
    quantity  Int      @default(1)
    // lưu tạm để hiển thị nhanh mà không gọi RPC mỗi lần mở giỏ — có thể lệch, luôn kiểm lại giá thật lúc checkout
    cachedPriceSnapshot Decimal? @db.Decimal(14, 2)
    isValid   Boolean  @default(true)
    invalidReason String?
    savedForLater Boolean @default(false)
    addedAt   DateTime @default(now())
    cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)

    @@unique([cartId, variantId])
    @@index([variantId])
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

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `cart.item-added`, `cart.abandoned` | `cart.abandoned` phát bởi job, không phải request |
| Nghe | `product.updated`, `product.deactivated` (đặt `isValid = false` + `invalidReason`), `order.created` (xoá item đã đặt) | Idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Cart.userId` | `identity-service.User.id` | — |
| `CartItem.productId`, `.variantId` | `catalog-service.Product.id` / `ProductVariant.id` | Giá thật luôn lấy lại từ `catalog-service` lúc `cart.validate`, không tin `cachedPriceSnapshot` |

## Bảng field bị các service khác tham chiếu

Không — `cart-service` là điểm cuối của luồng dữ liệu (đọc bởi `order-service` qua RPC `cart.get` khi tạo đơn, không
lưu tham chiếu ngược).
