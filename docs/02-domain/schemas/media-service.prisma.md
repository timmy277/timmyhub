---
title: Schema dữ liệu — media-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/01-architecture/media-video-pipeline.md, docs/03-specs/media-upload]
---

# Schema dữ liệu — media-service (`media_db`)

Không sở hữu model gốc nào từ bản cũ — bản cũ upload thẳng qua backend (`files/`, `common/supabase/`) không có
model theo dõi. Toàn bộ domain `media-upload` là `[MỚI]`: cấp signed URL, xác nhận upload, sinh thumbnail/nhiều kích
thước ảnh, chuyển mã video HLS. `media-transcode-worker` dùng chung `media_db` này, không có schema riêng.

```prisma
/// [MỚI] Tệp đã upload — ảnh hoặc video gốc
model MediaAsset {
    id             String   @id @default(uuid())
    ownerId        String
    // PRODUCT_IMAGE | POST_IMAGE | POST_VIDEO | AVATAR | DISPUTE_EVIDENCE | AD_CREATIVE
    usageType      String
    mimeType       String
    // xác thực bằng đọc magic bytes, không tin đuôi file — FEAT-MED-003
    detectedMimeType String
    sizeBytes      Int
    storageKey     String   @unique
    storageBucket  String
    // PENDING_UPLOAD | UPLOADED | PROCESSING | READY | REJECTED | ORPHANED
    status         String   @default("PENDING_UPLOAD")
    rejectReason   String?
    // token upload có hạn — FEAT-MED-010
    uploadTokenExpiresAt DateTime?
    // quét mã độc — FEAT-MED-011
    malwareScanStatus String @default("PENDING") // PENDING | CLEAN | INFECTED
    // liên kết thực thể sở hữu tệp (post, product...) — có thể null nếu chưa gắn (rồi bị dọn mồ côi)
    linkedEntityType String?
    linkedEntityId   String?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    variants       MediaVariant[]

    @@index([ownerId])
    @@index([status])
    @@index([linkedEntityType, linkedEntityId])
}

/// [MỚI] Biến thể sinh ra từ MediaAsset gốc: thumbnail, các kích thước ảnh, HLS ladder, poster, sprite
model MediaVariant {
    id          String     @id @default(uuid())
    assetId     String
    // THUMBNAIL | SIZE_SMALL | SIZE_MEDIUM | SIZE_LARGE | HLS_360P | HLS_720P | HLS_1080P | POSTER | SPRITE
    variantType String
    url         String
    width       Int?
    height      Int?
    durationSeconds Int?
    sizeBytes   Int?
    createdAt   DateTime   @default(now())
    asset       MediaAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)

    @@unique([assetId, variantType])
    @@index([assetId])
}

/// [MỚI] Tiến trình xử lý video theo thời gian thực — FEAT-MED-013, hiển thị qua WebSocket
model TranscodeJob {
    id           String   @id @default(uuid())
    assetId      String
    // QUEUED | RUNNING | COMPLETED | FAILED
    status       String   @default("QUEUED")
    progressPercent Int   @default(0)
    attemptCount Int      @default(0)
    lastError    String?
    startedAt    DateTime?
    finishedAt   DateTime?
    createdAt    DateTime @default(now())

    @@index([assetId])
    @@index([status])
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
| Phát | `media.uploaded`, `media.processed`, `media.transcoded`, `media.rejected` | `media.transcoded` kích hoạt `content-service` bật video của `Post` |
| Nghe | `post.created`, `product.created` | Liên kết `MediaAsset.linkedEntityType/linkedEntityId`; idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `MediaAsset.ownerId` | `identity-service.User.id` | Người upload (thường là seller) |
| `MediaAsset.linkedEntityId` | Tuỳ `linkedEntityType`: `content-service.Post.id`, `catalog-service.Product.id`, `chat-service.DisputeEvent` (bằng chứng) | — |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `MediaAsset.id` | `content-service.Post.videoMediaId` |
