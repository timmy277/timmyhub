---
title: Schema dữ liệu — master-data-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/master-data]
---

# Schema dữ liệu — master-data-service (`masterdata_db`)

Sở hữu địa giới hành chính (kế thừa) và cấu hình/feature flag/phí ship/lý do (`[MỚI]`). Dữ liệu đọc nhiều, ghi rất
ít → cache Redis TTL 24 giờ ở phía gọi, invalidate bằng event. Là service duy nhất **mọi service khác đều được phép
gọi RPC**, và cũng là service duy nhất **không nghe event nào** (chỉ phát).

```prisma
model Province {
    id        String     @id @default(uuid())
    code      String     @unique
    name      String
    slug      String     @unique
    createdAt DateTime   @default(now())
    updatedAt DateTime   @updatedAt
    districts District[]

    @@index([code])
}

model District {
    id           String   @id @default(uuid())
    code         String   @unique
    provinceCode String
    name         String
    slug         String   @unique
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    province     Province @relation(fields: [provinceCode], references: [code])
    wards        Ward[]

    @@index([code])
    @@index([provinceCode])
}

model Ward {
    id           String   @id @default(uuid())
    code         String   @unique
    districtCode String
    name         String
    slug         String   @unique
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
    district     District @relation(fields: [districtCode], references: [code])

    @@index([code])
    @@index([districtCode])
}

/// [MỚI] Cấu hình hệ thống theo khoá–giá trị, có phiên bản — FEAT-MDT-003
model SystemConfig {
    id        String   @id @default(uuid())
    key       String
    value     Json
    version   Int      @default(1)
    // vd RETURN_WINDOW_DAYS, WALLET_HOLD_DAYS, ORDER_AUTO_COMPLETE_DAYS (order-dispute.md §1)
    description String?
    updatedById String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([key, version])
    @@index([key])
}

/// [MỚI] Feature flag theo môi trường và phần trăm — FEAT-MDT-004
model FeatureFlag {
    id            String   @id @default(uuid())
    key           String   @unique
    // DEV | STAGING | PROD
    environment   String
    isEnabled     Boolean  @default(false)
    rolloutPercent Int     @default(0)
    description   String?
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
}

/// [MỚI] Bảng phí vận chuyển theo vùng — FEAT-MDT-005
model ShippingRate {
    id           String   @id @default(uuid())
    provinceCode String
    // tính theo bậc trọng lượng, gram
    weightFromGram Int
    weightToGram   Int?
    baseFee      Decimal  @db.Decimal(14, 2)
    currency     String   @default("VND")
    isActive     Boolean  @default(true)
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@index([provinceCode, weightFromGram])
}

/// [MỚI] Danh mục lý do (huỷ đơn, từ chối duyệt, báo cáo vi phạm) — FEAT-MDT-006
model ReasonCode {
    id       String   @id @default(uuid())
    // ORDER_CANCEL | PRODUCT_REJECT | CONTENT_REPORT | RETURN_REQUEST | AD_REJECT
    category String
    code     String
    label    String
    isActive Boolean  @default(true)

    @@unique([category, code])
    @@index([category])
}

/// [MỚI] Chế độ bảo trì — FEAT-MDT-007
model MaintenanceMode {
    id         String    @id @default(uuid())
    isEnabled  Boolean   @default(false)
    message    String?
    startedAt  DateTime?
    endedAt    DateTime?
    createdAt  DateTime  @default(now())
}

// --- Outbox (ADR-0002) — master-data-service không nghe event nào nên KHÔNG có ProcessedEvent

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
```

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `config.updated`, `feature-flag.changed` | Dùng để mọi service khác invalidate cache Redis TTL 24h |
| Nghe | — | Duy nhất trong 16 service không nghe event nào |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `SystemConfig.updatedById` | `identity-service.User.id` | Super Admin |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Province.code`, `District.code`, `Ward.code` | `order-service.Address.provinceCode/districtCode/wardCode` |
| `SystemConfig.key` (vd `RETURN_WINDOW_DAYS`, `WALLET_HOLD_DAYS`) | `order-service`, `payment-service`, `chat-service` (mốc thời hạn ở order-dispute.md §1) |
