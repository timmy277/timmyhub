---
title: Schema dữ liệu — notification-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/notification]
---

# Schema dữ liệu — notification-service (`notification_db`)

Sở hữu thông báo trong ứng dụng, tuỳ chọn nhận theo loại/kênh, và template có phiên bản. Nghe **nhiều event nhất hệ
thống** — gần như mọi domain event có ý nghĩa với người dùng. Mọi kênh gửi đều kiểm `NotificationPreference` trước
khi gửi.

```prisma
enum NotificationType {
    ORDER
    MESSAGE
    PROMOTION
    SYSTEM
    REVIEW
    WALLET
    AD
    DISPUTE
}

model Notification {
    id        String           @id @default(uuid())
    userId    String
    title     String
    content   String
    link      String?
    type      NotificationType @default(SYSTEM)
    isRead    Boolean          @default(false)
    channel   String           @default("IN_APP") // IN_APP | EMAIL | PUSH
    createdAt DateTime         @default(now())

    @@index([userId])
    @@index([isRead])
    @@index([type])
}

/// [MỚI] Tuỳ chọn nhận theo loại/kênh — FEAT-NTF-005
model NotificationPreference {
    id        String           @id @default(uuid())
    userId    String
    type      NotificationType
    channel   String           // IN_APP | EMAIL | PUSH
    isEnabled Boolean          @default(true)
    updatedAt DateTime         @updatedAt

    @@unique([userId, type, channel])
}

/// [MỚI] Template có phiên bản, ánh xạ event → nội dung — FEAT-NTF-009
model NotificationTemplate {
    id        String   @id @default(uuid())
    eventType String
    // EMAIL | PUSH | IN_APP
    channel   String
    locale    String   @default("vi")
    version   Int      @default(1)
    subject   String?
    bodyTemplate String
    isActive  Boolean  @default(true)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([eventType, channel, locale, version])
    @@index([eventType, channel, locale, isActive])
}

/// [MỚI] Hàng đợi gửi với backoff + dead-letter — FEAT-NTF-004
model NotificationDeliveryLog {
    id           String   @id @default(uuid())
    notificationId String?
    channel      String
    provider     String   // SMTP | WEB_PUSH
    // QUEUED | SENT | FAILED | DEAD_LETTER
    status       String
    attemptCount Int      @default(0)
    lastError    String?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

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
| Phát | `notification.created`, `notification.delivery-failed` | `notification.delivery-failed` sau khi hết số lần thử ở `NotificationDeliveryLog` |
| Nghe | Gần như mọi event có ý nghĩa với người dùng: `order.*`, `payment.*`, `seller.application.*`, `product.approved`, `review.created`, `chat.message-sent`, `inventory.low-stock`, `withdrawal.approved`, `ad.budget.exhausted`, `dispute.*`, `ticket.sla-breached` | Idempotent qua `ProcessedEvent`; tra `NotificationTemplate` theo `eventType` trước khi dựng nội dung, tra `NotificationPreference` trước khi gửi |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `Notification.userId`, `NotificationPreference.userId` | `identity-service.User.id` | — |

## Bảng field bị các service khác tham chiếu

Không — `notification-service` là điểm cuối tiêu thụ event, không phát dữ liệu domain cho service khác dùng lại.
