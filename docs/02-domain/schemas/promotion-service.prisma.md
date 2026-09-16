---
title: Schema dữ liệu — promotion-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/promotion-voucher, docs/03-specs/campaign-flashsale]
---

# Schema dữ liệu — promotion-service (`promotion_db`)

Sở hữu voucher (3 loại), chiến dịch khuyến mãi/flash sale, kho voucher người dùng và nhật ký sử dụng. Lượt dùng
voucher theo mô hình reserve/commit/release giống tồn kho (`catalog-service`), tránh vượt hạn mức khi đồng thời
cao — luật cứng #4, `UPDATE ... WHERE usedCount < usageLimit` nguyên tử, không đọc-rồi-ghi.

```prisma
enum VoucherType {
    PERCENTAGE
    FIXED_AMOUNT
    FREE_SHIPPING
}

enum UserVoucherStatus {
    SAVED
    USED
    EXPIRED
}

model PromotionCampaign {
    id               String            @id @default(uuid())
    name             String
    description      String?
    // FLASH_SALE | SEASONAL | CATEGORY_BOOST
    type             String
    // PLATFORM | SELLER
    ownerType        String
    ownerId          String?
    startDate        DateTime
    endDate          DateTime
    isActive         Boolean           @default(true)
    // duyệt sản phẩm tham gia chiến dịch — FEAT-CPG-003
    requiresApproval Boolean           @default(false)
    banner           String?
    icon             String?
    backgroundColor  String?
    titleColor       String?
    badgeText        String?
    createdBy        String?
    createdAt        DateTime          @default(now())
    updatedAt        DateTime          @updatedAt
    campaignProducts CampaignProduct[]
    vouchers         Voucher[]

    @@index([ownerType, ownerId])
    @@index([startDate, endDate])
    @@index([isActive, startDate, endDate])
}

model CampaignProduct {
    id              String            @id @default(uuid())
    campaignId      String
    // tham chiếu logic sang catalog-service.ProductVariant.id (không còn productId trần — giá campaign gắn variant)
    variantId       String
    campaignPrice   Decimal?          @db.Decimal(14, 2)
    discountPercent Int?
    maxQuantity     Int?
    soldQuantity    Int               @default(0)
    // ResourceStatus dạng string để không phụ thuộc enum service khác
    approvalStatus  String            @default("PENDING")
    campaign        PromotionCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

    @@unique([campaignId, variantId])
    @@index([campaignId])
    @@index([variantId])
}

model Voucher {
    id             String             @id @default(uuid())
    code           String             @unique
    type           VoucherType
    value          Decimal            @db.Decimal(14, 2)
    minOrderValue  Decimal?           @db.Decimal(14, 2)
    maxDiscount    Decimal?           @db.Decimal(14, 2)
    usageLimit     Int?
    usedCount      Int                @default(0)
    perUserLimit   Int                @default(1)
    isActive       Boolean            @default(true)
    startDate      DateTime
    endDate        DateTime
    description    String?
    // tham chiếu logic sang seller-service.SellerProfile.id — null = voucher sàn
    sellerId       String?
    campaignId     String?
    categoryIds    String[]           @default([])
    productIds     String[]           @default([])
    paymentMethods String[]           @default([])
    // FEAT-VCH-009: chống lạm dụng theo thiết bị/IP
    maxUsagePerDevice Int?
    createdAt      DateTime           @default(now())
    updatedAt      DateTime           @updatedAt
    userVouchers   UserVoucher[]
    campaign       PromotionCampaign? @relation(fields: [campaignId], references: [id])
    usageLogs      VoucherUsageLog[]

    @@index([code])
    @@index([sellerId])
    @@index([campaignId])
    @@index([isActive, startDate, endDate])
}

model VoucherUsageLog {
    id        String   @id @default(uuid())
    voucherId String
    userId    String
    orderId   String
    discount  Decimal  @db.Decimal(14, 2)
    usedAt    DateTime @default(now())
    voucher   Voucher  @relation(fields: [voucherId], references: [id], onDelete: Cascade)

    @@unique([voucherId, orderId])
    @@index([voucherId])
    @@index([userId])
}

model UserVoucher {
    id        String            @id @default(uuid())
    userId    String
    voucherId String
    savedAt   DateTime          @default(now())
    status    UserVoucherStatus @default(SAVED)
    voucher   Voucher           @relation(fields: [voucherId], references: [id], onDelete: Cascade)

    @@unique([userId, voucherId])
    @@index([userId])
    @@index([voucherId])
    @@index([userId, status])
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
| Phát | `voucher.issued`, `voucher.used`, `voucher.released`, `campaign.activated`, `campaign.ended`, `campaign.product-approved` | — |
| Nghe | `order.created` (giữ lượt voucher — reserve), `order.cancelled` (trả lượt — release), `order.completed` (chốt lượt — commit, ghi `VoucherUsageLog`) | Idempotent qua `ProcessedEvent`; cập nhật `Voucher.usedCount` bằng `UPDATE ... WHERE usedCount < usageLimit` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Voucher.sellerId` | `seller-service.SellerProfile.id` | null = voucher sàn |
| `Voucher.categoryIds[]`, `productIds[]` | `catalog-service.Category.id` / `Product.id` | — |
| `CampaignProduct.variantId` | `catalog-service.ProductVariant.id` | — |
| `VoucherUsageLog.userId`, `UserVoucher.userId` | `identity-service.User.id` | — |
| `VoucherUsageLog.orderId` | `order-service.Order.id` | — |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Voucher.id` | `order-service.Order.voucherId` |
