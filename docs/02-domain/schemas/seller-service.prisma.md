---
title: Schema dữ liệu — seller-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/seller-onboarding]
---

# Schema dữ liệu — seller-service (`seller_db`)

Sở hữu hồ sơ shop đã duyệt, đơn đăng ký bán hàng, thương hiệu, và theo dõi shop. Không lưu sản phẩm hay đơn hàng —
`catalog-service`/`order-service` chỉ giữ `sellerId` (= `SellerProfile.id`) làm tham chiếu logic.

```prisma
enum ResourceStatus {
    PENDING
    APPROVED
    REJECTED
    DELETED
}

model SellerProfile {
    id           String         @id @default(uuid())
    // tham chiếu logic sang identity-service, không FK
    userId       String         @unique
    shopName     String
    shopSlug     String         @unique
    shopLogo     String?
    shopBanner   String?
    description  String?
    warehouseAddressLine String?
    provinceCode String?
    districtCode String?
    wardCode     String?
    status       ResourceStatus @default(PENDING)
    isVerified   Boolean        @default(false)
    verifiedAt   DateTime?
    isSuspended  Boolean        @default(false)
    suspendedReason String?
    rating       Float          @default(0)
    // chỉ số uy tín — FEAT-SEL-008, cập nhật qua event order.completed / review.created
    cancelRate      Float       @default(0)
    avgResponseHours Float      @default(0)
    // FEAT-SEL-009
    returnPolicyDays Int        @default(7)
    prepTimeHours    Int        @default(24)
    createdAt    DateTime       @default(now())
    updatedAt    DateTime       @updatedAt
    application  SellerApplication?
    brandProfile BrandProfile?
    followers    ShopFollow[]

    @@index([shopSlug])
    @@index([status])
}

/// [MỚI] Đơn đăng ký bán hàng — tách khỏi SellerProfile đã duyệt (FEAT-SEL-001/002)
model SellerApplication {
    id              String         @id @default(uuid())
    userId          String
    sellerProfileId String?        @unique
    shopName        String
    shopDescription String?
    idDocumentUrl   String
    taxCode         String?
    status          ResourceStatus @default(PENDING)
    reviewNote      String?
    reviewedById    String?
    reviewedAt      DateTime?
    createdAt       DateTime       @default(now())
    updatedAt       DateTime       @updatedAt
    sellerProfile   SellerProfile? @relation(fields: [sellerProfileId], references: [id])

    @@index([userId])
    @@index([status])
}

model BrandProfile {
    id              String        @id @default(uuid())
    sellerProfileId String        @unique
    userId          String
    brandName       String        @unique
    brandSlug       String        @unique
    brandLogo       String?
    description     String?
    isVerified      Boolean       @default(false)
    createdAt       DateTime      @default(now())
    updatedAt       DateTime      @updatedAt
    sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

    @@index([brandSlug])
}

/// [MỚI] Theo dõi shop — FEAT-USR-010
model ShopFollow {
    id              String        @id @default(uuid())
    userId          String
    sellerProfileId String
    createdAt       DateTime      @default(now())
    sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

    @@unique([userId, sellerProfileId])
    @@index([sellerProfileId])
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
| Phát | `seller.application.submitted`, `seller.application.approved`, `seller.application.rejected`, `seller.shop.updated`, `seller.shop.suspended` | `seller.shop.suspended` khiến `catalog-service` ẩn toàn bộ sản phẩm của shop |
| Nghe | `order.completed` (cập nhật `cancelRate`/`avgResponseHours`), `review.created` (cập nhật `rating`) | Idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `SellerProfile.userId` | `identity-service.User.id` | 1-1, mỗi user tối đa một shop |
| `SellerApplication.userId`, `.reviewedById` | `identity-service.User.id` | `reviewedById` là admin duyệt |
| `BrandProfile.userId` | `identity-service.User.id` | — |
| `ShopFollow.userId` | `identity-service.User.id` | — |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `SellerProfile.id` | `catalog-service.Product.shopId`, `order-service.Order.sellerId`, `promotion-service.Voucher.sellerId`, `content-service.Post.sellerId`, `payment-service.Wallet.sellerId` |
