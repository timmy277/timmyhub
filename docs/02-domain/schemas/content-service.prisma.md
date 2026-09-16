---
title: Schema dữ liệu — content-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/content-post, docs/03-specs/video-ads]
---

# Schema dữ liệu — content-service (`content_db`)

Sở hữu bài đăng/video (kế thừa) **và toàn bộ quảng cáo** (`[MỚI]` — domain `video-ads` chưa từng có ở bản cũ).
Sự kiện quảng cáo có khối lượng lớn nhất hệ thống: không ghi từng impression vào Postgres, đếm ở Redis, gom lô mỗi
60 giây rồi mới ghi `AdEvent` theo lô — vì vậy `AdEvent` lưu **bản ghi đã gộp**, không phải một dòng một impression.

```prisma
enum PostStatus {
    DRAFT
    PUBLISHED
    HIDDEN
    PENDING_REVIEW
    REJECTED
}

model Post {
    id            String        @id @default(uuid())
    sellerId      String
    title         String
    content       String?
    videoUrl      String?
    videoMediaId  String?
    thumbnailUrl  String?
    images        String[]      @default([])
    hashtags      String[]      @default([])
    status        PostStatus    @default(DRAFT)
    reviewNote    String?
    viewCount     Int           @default(0)
    likeCount     Int           @default(0)
    commentCount  Int           @default(0)
    isPinned      Boolean       @default(false)
    // FEAT-PST-009
    scheduledAt   DateTime?
    createdAt     DateTime      @default(now())
    updatedAt     DateTime      @updatedAt
    comments      PostComment[]
    likes         PostLike[]
    productTags   PostProduct[]

    @@index([sellerId])
    @@index([status])
    @@index([createdAt])
}

model PostProduct {
    id        String  @id @default(uuid())
    postId    String
    // tham chiếu logic sang catalog-service
    productId String
    variantId String?
    position  Int     @default(0)
    post      Post    @relation(fields: [postId], references: [id], onDelete: Cascade)

    @@unique([postId, productId])
    @@index([postId])
}

model PostLike {
    id        String   @id @default(uuid())
    postId    String
    userId    String
    createdAt DateTime @default(now())
    post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

    @@unique([postId, userId])
    @@index([postId])
    @@index([userId])
}

model PostComment {
    id        String        @id @default(uuid())
    postId    String
    userId    String
    content   String
    parentId  String?
    createdAt DateTime      @default(now())
    post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
    parent    PostComment?  @relation("PostCommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
    replies   PostComment[] @relation("PostCommentReplies")

    @@index([postId])
    @@index([userId])
    @@index([parentId])
}

/// [MỚI] Chiến dịch quảng cáo — FEAT-ADS-001..010
model AdCampaign {
    id           String   @id @default(uuid())
    sellerId     String
    name         String
    objective    String   // TRAFFIC | CONVERSION | AWARENESS
    // CPM | CPC
    billingModel String
    budgetTotal  Decimal  @db.Decimal(14, 2)
    budgetSpent  Decimal  @default(0) @db.Decimal(14, 2)
    bidAmount    Decimal  @db.Decimal(14, 2)
    startDate    DateTime
    endDate      DateTime
    // DRAFT | PENDING_REVIEW | APPROVED | REJECTED | RUNNING | PAUSED | ENDED | BUDGET_EXHAUSTED
    status       String   @default("DRAFT")
    reviewNote   String?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    creatives    AdCreative[]

    @@index([sellerId])
    @@index([status])
}

/// [MỚI] Nội dung quảng cáo — boost một post/video có sẵn hoặc tạo creative riêng — FEAT-ADS-002
model AdCreative {
    id          String     @id @default(uuid())
    campaignId  String
    // null nếu creative độc lập, có giá trị nếu boost một Post có sẵn
    boostedPostId String?
    imageUrl     String?
    videoUrl     String?
    headline     String
    // vị trí hiển thị — FEAT-ADS-003
    placements   String[]  @default([])
    // nhắm mục tiêu — FEAT-ADS-004
    targetCategoryIds String[] @default([])
    targetProvinceCodes String[] @default([])
    isActive     Boolean   @default(true)
    campaign     AdCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

    @@index([campaignId])
}

/// [MỚI] Impression/click đã gộp theo lô mỗi 60 giây — không phải một dòng một sự kiện
model AdEvent {
    id           String   @id @default(uuid())
    campaignId   String
    creativeId   String
    // IMPRESSION | CLICK
    eventType    String
    batchWindowStart DateTime
    batchWindowEnd   DateTime
    count        Int
    costCharged  Decimal  @db.Decimal(14, 2)
    createdAt    DateTime @default(now())

    @@unique([creativeId, eventType, batchWindowStart])
    @@index([campaignId, createdAt])
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
| Phát | `post.created`, `post.approved`, `post.rejected`, `post.liked`, `post.commented`, `post.reported`, `ad.campaign.created`, `ad.campaign.approved`, `ad.impression.batched`, `ad.click.batched`, `ad.budget.exhausted` | `ad.*.batched` phát cùng lúc ghi `AdEvent` sau khi gộp lô Redis |
| Nghe | `product.approved`/`product.deactivated` (gắn/gỡ sản phẩm khỏi bài), `media.transcoded` (bật video), `wallet.debited` (xác nhận trừ `AdCampaign.budgetSpent`) | Idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Post.sellerId`, `AdCampaign.sellerId` | `seller-service.SellerProfile.id` | — |
| `Post.videoMediaId` | `media-service.MediaAsset.id` | — |
| `PostProduct.productId`, `.variantId` | `catalog-service.Product.id` / `ProductVariant.id` | — |
| `PostLike.userId`, `PostComment.userId` | `identity-service.User.id` | — |
| `AdCreative.boostedPostId` | `content-service.Post.id` | Nội bộ service, có FK thật |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Post.id` | `search-service` (chỉ mục nội dung), `analytics-service` (quy kết doanh thu từ nội dung) |
| `AdCampaign.id` | `analytics-service` (bảng điều khiển hiệu quả quảng cáo) |
