---
title: Schema dữ liệu — analytics-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/analytics-sales]
---

# Schema dữ liệu — analytics-service (`analytics_db`)

Không sở hữu model gốc nào từ bản cũ. Chỉ đọc từ bản tổng hợp dựng sẵn (`DailyRollup`), **không** truy vấn thẳng dữ
liệu thô của service khác khi phục vụ dashboard — toàn bộ số liệu được dựng lại từ domain event của `order`,
`payment`, `catalog`, `inventory`, `ad`, `post`, `user.registered`, `review.created`.

```prisma
/// [MỚI] Bản tổng hợp theo ngày — FEAT-ANA-010, chạy 00:15 hằng ngày + tổng hợp trong ngày mỗi 15 phút
model DailyRollup {
    id            String   @id @default(uuid())
    rollupDate    DateTime @db.Date
    // PLATFORM | SHOP | CATEGORY | PRODUCT
    scope         String
    scopeId       String?
    gmv           Decimal  @default(0) @db.Decimal(14, 2)
    orderCount    Int      @default(0)
    completedOrderCount Int @default(0)
    cancelledOrderCount Int @default(0)
    newUserCount  Int      @default(0)
    revenue       Decimal  @default(0) @db.Decimal(14, 2)
    adSpend       Decimal  @default(0) @db.Decimal(14, 2)
    isFinal       Boolean  @default(false)
    computedAt    DateTime @default(now())

    @@unique([rollupDate, scope, scopeId])
    @@index([scope, scopeId, rollupDate])
}

/// [MỚI] Sự kiện phễu chuyển đổi — FEAT-ANA-005: xem → giỏ → checkout → đơn → hoàn tất
model FunnelEvent {
    id        String   @id @default(uuid())
    sessionId String
    userId    String?
    // VIEW_PRODUCT | ADD_TO_CART | CHECKOUT_STARTED | ORDER_CREATED | ORDER_COMPLETED
    step      String
    productId String?
    shopId    String?
    // quy kết doanh thu từ nội dung/quảng cáo — FEAT-ANA-007
    attributedPostId String?
    attributedAdCampaignId String?
    createdAt DateTime @default(now())

    @@index([sessionId, createdAt])
    @@index([step, createdAt])
}

/// [MỚI] Job xuất báo cáo CSV/Excel — FEAT-ANA-009
model ReportJob {
    id           String   @id @default(uuid())
    requestedById String
    // SALES | INVENTORY | FUNNEL | AD_PERFORMANCE
    reportType   String
    filters      Json
    format       String   @default("CSV")
    // PENDING | RUNNING | READY | FAILED | EXPIRED
    status       String   @default("PENDING")
    downloadUrl  String?
    // link tải về tạm — hết hạn sau X giờ
    expiresAt    DateTime?
    errorMessage String?
    createdAt    DateTime @default(now())
    finishedAt   DateTime?

    @@index([requestedById, status])
}

/// [MỚI] Mục tiêu doanh số và theo dõi tiến độ — FEAT-ANA-012
model SalesTarget {
    id         String   @id @default(uuid())
    shopId     String
    periodStart DateTime @db.Date
    periodEnd   DateTime @db.Date
    targetRevenue Decimal @db.Decimal(14, 2)
    achievedRevenue Decimal @default(0) @db.Decimal(14, 2)
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt

    @@index([shopId, periodStart])
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
| Phát | `report.export-ready`, `report.export-failed` | Kèm cập nhật `ReportJob.status`/`downloadUrl` |
| Nghe | `order.*`, `payment.*`, `product.*`, `inventory.*`, `ad.*`, `post.*`, `user.registered`, `review.created` | Idempotent qua `ProcessedEvent`; job tổng hợp ngày ghi vào `DailyRollup` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `DailyRollup.scopeId` | `seller-service.SellerProfile.id` / `catalog-service.Category.id` / `Product.id` tuỳ `scope` | — |
| `FunnelEvent.userId`, `ReportJob.requestedById` | `identity-service.User.id` | — |
| `FunnelEvent.productId`, `.shopId` | `catalog-service.Product.id` / `seller-service.SellerProfile.id` | — |
| `FunnelEvent.attributedPostId`, `.attributedAdCampaignId` | `content-service.Post.id` / `AdCampaign.id` | — |
| `SalesTarget.shopId` | `seller-service.SellerProfile.id` | — |

## Bảng field bị các service khác tham chiếu

Không.
