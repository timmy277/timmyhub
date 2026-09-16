---
title: Schema dữ liệu — chat-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/02-domain/order-dispute.md, docs/03-specs/chat-support]
---

# Schema dữ liệu — chat-service (`chat_db`)

Sở hữu hội thoại/tin nhắn realtime (kế thừa, bọc trong `Conversation` mới), ticket hỗ trợ có SLA, và **tranh chấp
ba bên** (`[MỚI]`). Vòng đời đầy đủ của `Dispute` (state machine 12 trạng thái, bốn kết cục, mốc thời hạn và hệ quả
quá hạn) đã mô tả chi tiết ở [order-dispute.md](../order-dispute.md) — không lặp lại văn xuôi, chỉ trích khối
`prisma` và bảng tham chiếu.

```prisma
model Conversation {
    id            String        @id @default(uuid())
    buyerId       String
    sellerId      String
    // tham chiếu tuỳ chọn nếu hội thoại phát sinh từ một đơn hàng
    orderId       String?
    lastMessageAt DateTime?
    isBlockedByBuyer  Boolean   @default(false)
    isBlockedBySeller Boolean   @default(false)
    createdAt     DateTime      @default(now())
    messages      ChatMessage[]

    @@unique([buyerId, sellerId])
    @@index([sellerId, lastMessageAt])
}

model ChatMessage {
    id             String       @id @default(uuid())
    conversationId String
    senderId       String
    content        String?
    imageUrls      String[]     @default([])
    // gắn sản phẩm/đơn hàng vào tin nhắn — FEAT-CHT-003
    attachedProductId String?
    attachedOrderId    String?
    isRead         Boolean      @default(false)
    createdAt      DateTime     @default(now())
    conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

    @@index([conversationId, createdAt])
}

/// [MỚI] Ticket hỗ trợ có SLA — FEAT-CHT-005/007
model SupportTicket {
    id           String   @id @default(uuid())
    userId       String
    subject      String
    category     String
    // LOW | NORMAL | HIGH | URGENT
    priority     String   @default("NORMAL")
    // OPEN | ASSIGNED | RESOLVED | CLOSED
    status       String   @default("OPEN")
    assignedToId String?
    slaDeadline  DateTime
    slaBreached  Boolean  @default(false)
    resolvedAt   DateTime?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@index([status, slaDeadline])
    @@index([assignedToId])
}

/// [MỚI] Tranh chấp đơn hàng ba bên — state machine đầy đủ ở order-dispute.md §2
model Dispute {
    id             String   @id @default(uuid())
    orderId        String
    orderItemId    String
    buyerId        String
    sellerId       String
    // mã lý do — NOT_RECEIVED | DAMAGED | WRONG_ITEM | MISSING_PART | NOT_AS_DESCRIBED | COUNTERFEIT | CHANGED_MIND (order-dispute.md §3)
    reasonCode     String
    description    String
    evidenceUrls   String[] @default([])
    // OPENED | SELLER_RESPONDED | AUTO_RESOLVED_BUYER | ESCALATED | UNDER_REVIEW | NEED_MORE_EVIDENCE
    // | AGREED | RESOLVED | APPEALED | CLOSED (order-dispute.md §2)
    status         String   @default("OPENED")
    // FULL_REFUND | PARTIAL_REFUND | SELLER_WINS | REFUND_WITH_RETURN
    resolutionType String?
    refundAmount   Decimal? @db.Decimal(14, 2)
    assignedToId   String?
    sellerRespondDeadline DateTime
    evidenceDeadline      DateTime?
    appealDeadline        DateTime?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    events         DisputeEvent[]

    // mỗi OrderItem chỉ có một tranh chấp đang mở — unique partial index viết tay, xem order-dispute.md §4
    @@index([orderId])
    @@index([status, sellerRespondDeadline])
    @@index([assignedToId])
}

/// [MỚI] Nhật ký bất biến từng bước chuyển trạng thái tranh chấp — order-dispute.md §2
model DisputeEvent {
    id          String   @id @default(uuid())
    disputeId   String
    fromStatus  String?
    toStatus    String
    actorId     String?
    actorRole   String?
    note        String?
    evidenceSnapshotUrls String[] @default([])
    createdAt   DateTime @default(now())
    dispute     Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)

    @@index([disputeId, createdAt])
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

Ràng buộc viết tay bắt buộc (không sinh được bằng `@@unique` của Prisma):

```sql
CREATE UNIQUE INDEX dispute_one_open_per_item
    ON "Dispute" ("orderItemId")
    WHERE "status" NOT IN ('CLOSED');
```

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `chat.message-sent`, `ticket.created`, `ticket.assigned`, `ticket.resolved`, `ticket.sla-breached`, `dispute.opened`, `dispute.resolved` | `dispute.resolved` mang `refundAmount`/`returnRequired`, đích đến là `order-service` (order-dispute.md §4 sequence diagram) |
| Nghe | `order.cancelled`, `order.refund-requested` | Tự mở `Dispute` khi cần; idempotent qua `ProcessedEvent` |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Conversation.buyerId`, `.sellerId` | `identity-service.User.id` / `seller-service.SellerProfile.id` | — |
| `Conversation.orderId`, `Dispute.orderId`, `.orderItemId` | `order-service.Order.id` / `OrderItem.id` | — |
| `ChatMessage.attachedProductId` | `catalog-service.Product.id` | — |
| `ChatMessage.attachedOrderId` | `order-service.Order.id` | — |
| `SupportTicket.assignedToId`, `Dispute.assignedToId`, `DisputeEvent.actorId` | `identity-service.User.id` | Nhân viên xử lý |

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `Dispute.id` | `order-service.ReturnRequest.disputeId` |
