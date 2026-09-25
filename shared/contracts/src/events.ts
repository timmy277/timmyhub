// Tên event đi qua transactional outbox (CLAUDE.md luật #3) — khớp docs/01-architecture/event-catalog.md.
// Producer ghi `eventType` từ đây, consumer lọc theo cùng hằng số; không gõ chuỗi event trần.
export const OUTBOX_EVENT = {
    USER_REGISTERED: 'user.registered',
    USER_ROLE_GRANTED: 'user.role-granted',
    USER_ROLE_REVOKED: 'user.role-revoked',
    RBAC_PERMISSIONS_CHANGED: 'rbac.permissions.changed',
} as const

export type OutboxEventType = (typeof OUTBOX_EVENT)[keyof typeof OUTBOX_EVENT]

// aggregateType của outbox = service sở hữu aggregate (service-catalog.md).
export const OUTBOX_AGGREGATE = {
    IDENTITY: 'identity',
} as const

export type OutboxAggregateType = (typeof OUTBOX_AGGREGATE)[keyof typeof OUTBOX_AGGREGATE]
