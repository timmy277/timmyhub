import type { AuditLogDetail, AuditLogPagination, AuditLogSummary } from '@timmyhub/contracts'

import type { AuditLog } from '@timmyhub/prisma'

// Chuyển bản ghi Prisma `AuditLog` sang DTO của `@timmyhub/contracts`. Hàm thuần, không phụ thuộc request.
// `before`/`after` là JSON tùy ý — trả nguyên dạng cho FE tự render; không có schema nào ràng buộc nội dung
// vì mỗi hành động nghiệp vụ có hình dạng diff riêng.

export function toAuditLogSummary(log: AuditLog): AuditLogSummary {
    return {
        id: log.id,
        service: log.service,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorId: log.actorId,
        actorType: log.actorType,
        result: log.result,
        occurredAt: log.occurredAt.toISOString(),
    }
}

export function toAuditLogDetail(log: AuditLog): AuditLogDetail {
    return {
        ...toAuditLogSummary(log),
        actorIp: log.actorIp,
        userAgent: log.userAgent,
        before: log.before,
        after: log.after,
        errorMessage: log.errorMessage,
    }
}

// Cùng khuôn phân trang với `toUserPagination` — api-conventions §3.2.
export function toAuditLogPagination(totalItems: number, page: number, pageSize: number): AuditLogPagination {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    return {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    }
}
