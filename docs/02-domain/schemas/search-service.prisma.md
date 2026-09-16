---
title: Schema dữ liệu — search-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/search-discovery]
---

# Schema dữ liệu — search-service (`search_db` + Elasticsearch)

Không sở hữu model gốc nào từ bản cũ — search là **chỉ mục dẫn xuất**, không phải nguồn sự thật, mất hoàn toàn vẫn
dựng lại được từ `catalog-service`/`content-service`/`seller-service`. `search_db` (Postgres) chỉ lưu metadata vận
hành của việc đánh chỉ mục; dữ liệu tìm kiếm thật nằm ở Elasticsearch, không mô tả bằng Prisma ở đây.

```prisma
/// [MỚI] Theo dõi tiến trình reindex / đồng bộ theo lô — FEAT-SRC-007
model IndexJob {
    id           String   @id @default(uuid())
    // PRODUCT | SHOP | POST
    entityType   String
    // FULL_REINDEX | INCREMENTAL
    jobType      String
    // alias swap dùng để reindex không gián đoạn
    targetAlias  String
    targetIndex  String
    // PENDING | RUNNING | COMPLETED | FAILED
    status       String   @default("PENDING")
    totalCount   Int?
    processedCount Int    @default(0)
    errorMessage String?
    startedAt    DateTime?
    finishedAt   DateTime?
    createdAt    DateTime @default(now())

    @@index([entityType, status])
}

/// [MỚI] Từ khoá thịnh hành và lịch sử tìm kiếm — FEAT-SRC-009
model SearchQueryLog {
    id        String   @id @default(uuid())
    userId    String?
    keyword   String
    resultCount Int
    createdAt DateTime @default(now())

    @@index([keyword, createdAt])
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
| Phát | `search.index-completed`, `search.index-failed` | Ghi kèm cập nhật `IndexJob.status` |
| Nghe | `product.*`, `category.updated`, `seller.shop.updated`, `post.approved`, `review.created` (cập nhật điểm), `order.completed` (cập nhật `soldCount`) | Idempotent qua `ProcessedEvent`; ghi thẳng Elasticsearch, không qua `search_db` |

## Tham chiếu ngoài (external reference)

Toàn bộ tài liệu Elasticsearch (không thuộc phạm vi Prisma) chứa bản sao phi chuẩn hoá của `catalog-service.Product`,
`content-service.Post`, `seller-service.SellerProfile` — cập nhật qua event, không bao giờ đọc thẳng database các
service đó.

## Bảng field bị các service khác tham chiếu

Không.
