---
title: Schema dữ liệu — engagement-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/product-variant.md, docs/03-specs/review-rating]
---

# Schema dữ liệu — engagement-service (`engagement_db`)

Sở hữu đánh giá sản phẩm, phản hồi seller, bình chọn hữu ích và wishlist. Giữ read model `PurchasedItem` dựng từ
`order.completed` để kiểm tra "đã mua" mà không gọi `order-service` — vì vậy `Review.orderItemId` không phải FK
thật sang `order-service`, chỉ là ID đã được xác thực một lần lúc consume event.

```prisma
model Review {
    id           String              @id @default(uuid())
    userId       String
    productId    String
    variantId    String?
    orderItemId  String?             @unique
    rating       Int                 @default(5)
    comment      String?
    images       String[]            @default([])
    videos       String[]            @default([])
    isVerified   Boolean             @default(true)
    helpfulCount Int                 @default(0)
    // FEAT-REV-010: sửa trong 7 ngày, có lịch sử
    editedAt     DateTime?
    // ẩn do vi phạm — FEAT-REV-007
    isHidden     Boolean             @default(false)
    hiddenReason String?
    createdAt    DateTime            @default(now())
    updatedAt    DateTime            @updatedAt
    comments     ReviewComment[]
    helpfulVotes ReviewHelpfulVote[]

    @@index([productId])
    @@index([userId])
}

model ReviewComment {
    id        String          @id @default(uuid())
    reviewId  String
    userId    String
    // true nếu chính seller của sản phẩm trả lời — FEAT-REV-003
    isSellerReply Boolean     @default(false)
    content   String
    parentId  String?
    createdAt DateTime        @default(now())
    updatedAt DateTime        @updatedAt
    parent    ReviewComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
    replies   ReviewComment[] @relation("CommentReplies")
    review    Review          @relation(fields: [reviewId], references: [id], onDelete: Cascade)

    @@index([reviewId])
    @@index([userId])
    @@index([parentId])
}

model ReviewHelpfulVote {
    id        String   @id @default(uuid())
    reviewId  String
    userId    String
    createdAt DateTime @default(now())
    review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)

    @@unique([reviewId, userId])
    @@index([userId])
}

model WishlistItem {
    id        String   @id @default(uuid())
    userId    String
    productId String
    variantId String?
    createdAt DateTime @default(now())

    @@unique([userId, productId])
    @@index([userId])
    @@index([productId])
}

/// [MỚI] Read model dựng từ order.completed — kiểm tra "đã mua" mà không gọi order-service
model PurchasedItem {
    id          String   @id @default(uuid())
    userId      String
    productId   String
    variantId   String
    orderItemId String   @unique
    purchasedAt DateTime
    canReview   Boolean  @default(true)

    @@index([userId, productId])
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
| Phát | `review.created`, `review.replied`, `review.moderated`, `rating.updated`, `wishlist.item-added` | `rating.updated` mang `productId` + `ratingAvg`/`ratingCount` mới để `catalog-service`/`search-service` cập nhật trường dẫn xuất |
| Nghe | `order.completed` | Ghi `PurchasedItem` cho từng `OrderItem`, mở quyền đánh giá; idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Review.userId`, `WishlistItem.userId`, `PurchasedItem.userId` | `identity-service.User.id` | — |
| `Review.productId`, `.variantId` | `catalog-service.Product.id` / `ProductVariant.id` | — |
| `Review.orderItemId`, `PurchasedItem.orderItemId` | `order-service.OrderItem.id` | Chỉ xác thực một lần lúc nhận `order.completed`, không FK |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Review.rating`, `.ratingAvg` (dẫn xuất) | `catalog-service.Product.ratingAvg/ratingCount` (đồng bộ qua `rating.updated`), `search-service` (chỉ mục) |
