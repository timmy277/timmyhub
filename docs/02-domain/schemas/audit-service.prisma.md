---
title: Schema dữ liệu — audit-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/01-architecture/adr/ADR-0011-audit-log-strategy.md, docs/03-specs/audit-log]
---

# Schema dữ liệu — audit-service (`audit_db` + Elasticsearch)

Sở hữu `SystemLog` (kế thừa nguyên trạng) và `AuditLog` (`[MỚI]`) — bảng bất biến, phân vùng theo tháng, chỉ cấp
quyền `INSERT`/`SELECT` cho tài khoản ứng dụng, **không** `UPDATE`/`DELETE` (xem
[ADR-0011](../../01-architecture/adr/ADR-0011-audit-log-strategy.md)). Đây là service duy nhất **không phát event** —
chỉ nhận.

```prisma
enum LogStatus {
    SUCCESS
    FAILED
}

model SystemLog {
    id           String    @id @default(uuid())
    userId       String?
    action       String
    entityType   String?
    entityId     String?
    metadata     Json?
    ipAddress    String?
    userAgent    String?
    status       LogStatus @default(SUCCESS)
    errorMessage String?
    newValue     Json?
    oldValue     Json?
    createdAt    DateTime  @default(now())

    @@index([userId])
    @@index([action])
    @@index([entityType, entityId])
    @@index([createdAt])
}

/// [MỚI] Nhật ký kiểm toán bất biến, phân vùng theo tháng — FEAT-AUD-001/003
model AuditLog {
    id           String   @id @default(uuid())
    // service nguồn phát audit.recorded
    sourceService String
    actorId      String?
    actorRole    String?
    action       String
    entityType   String
    entityId     String
    diff         Json
    requestId    String?
    traceId      String?
    ipAddress    String?
    // che dữ liệu nhạy cảm trước khi lưu — FEAT-AUD-008
    isSensitiveMasked Boolean @default(false)
    // partition key logic — migration tay tạo PARTITION BY RANGE (occurredAt)
    occurredAt   DateTime @default(now())

    @@index([entityType, entityId])
    @@index([actorId, occurredAt])
    @@index([traceId])
    @@index([occurredAt])
}

// --- Idempotent consumer (ADR-0002) — audit-service không phát event nên KHÔNG có OutboxEvent

model ProcessedEvent {
    eventId      String   @id
    consumerName String
    processedAt  DateTime @default(now())

    @@map("processed_events")
}
```

Ràng buộc quyền DB (viết tay, ngoài Prisma):

```sql
REVOKE UPDATE, DELETE ON "AuditLog" FROM app_user;
GRANT INSERT, SELECT ON "AuditLog" TO app_user;
```

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | — | Service duy nhất không phát event |
| Nghe | `audit.recorded` (từ tất cả service), `system.log-recorded` | Idempotent qua `ProcessedEvent`; mỗi service khác tự chịu trách nhiệm phát `audit.recorded` qua outbox của chính nó |

## Tham chiếu ngoài (external reference)

| Field | Trỏ tới | Ghi chú |
|---|---|---|
| `SystemLog.userId`, `AuditLog.actorId` | `identity-service.User.id` | Có thể null nếu hành động hệ thống |
| `AuditLog.entityType`/`entityId` | Bất kỳ entity nào ở bất kỳ service nào | Lưu dạng chuỗi tự do, không FK, vì `audit-service` phải nhận được record dù entity gốc đã bị xoá |

## Bảng field bị các service khác tham chiếu

Không — `audit-service` là điểm cuối, chỉ phục vụ RPC tra cứu (`audit.query`, `audit.getEntityHistory`) cho admin.
