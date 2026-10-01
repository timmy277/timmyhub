import { Injectable } from '@nestjs/common'

import type { AuditLogListQuery } from '@timmyhub/contracts'
import { AUDIT_LOG_LIST_SORT } from '@timmyhub/contracts'
import type { AuditLog } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'

// Repository cho AuditLog — chỉ đọc (bảng bất biến, INSERT qua `writeAuditLog` trong transaction nghiệp vụ).
// Phạm vi dữ liệu: mọi bản ghi, lọc qua query params — quyền truy cập do PermissionsGuard (`audit:logs:list/read`)
// kiểm ở controller, repository không lọc theo actor.

type AuditLogListWhere = {
    actorId?: string
    action?: { contains: string; mode: 'insensitive' }
    entityType?: string
    entityId?: string
    service?: string
    occurredAt?: { gte?: Date; lte?: Date }
}

type AuditLogListOrderBy = { occurredAt: 'asc' | 'desc' } | { action: 'asc' | 'desc' } | { entityType: 'asc' | 'desc' }

@Injectable()
export class AuditRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====

    async listAuditLogs(params: {
        filters: Pick<
            AuditLogListQuery,
            'actorId' | 'action' | 'entityType' | 'entityId' | 'service' | 'occurredFrom' | 'occurredTo'
        >
        page: number
        pageSize: number
        sort: AuditLogListQuery['sort']
    }): Promise<{ items: AuditLog[]; totalItems: number }> {
        const where = buildAuditLogWhere(params.filters)
        const orderBy = buildAuditLogOrderBy(params.sort)

        const [items, totalItems] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy,
                skip: (params.page - 1) * params.pageSize,
                take: params.pageSize,
            }),
            this.prisma.auditLog.count({ where }),
        ])
        return { items, totalItems }
    }

    findAuditLogById(id: string): Promise<AuditLog | null> {
        return this.prisma.auditLog.findUnique({ where: { id } })
    }

    // Tra tên hiển thị (email) cho một loạt `actorId`. AuditLog chỉ lưu id nên phải hỏi bảng người dùng mới hiện
    // được tên cho người đọc. Chỉ một query cho cả trang (`in`) thay vì N+1 theo từng dòng.
    //
    // Người dùng đã bị xoá mềm vẫn trả về: audit trail phải đọc được cả sau khi tài khoản biến mất — nếu lọc
    // `deletedAt` thì bản ghi cũ sẽ mất tên, đúng thứ audit cần giữ lại.
    async findActorNames(actorIds: string[]): Promise<Map<string, string>> {
        const uniqueIds = [...new Set(actorIds.filter(Boolean))]
        if (uniqueIds.length === 0) return new Map()

        const users = await this.prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, email: true },
        })
        return new Map(users.map((user) => [user.id, user.email]))
    }
}

// Hàm thuần xây `where` — tách ra để test được mà không cần DB (cùng khuôn với `buildUserListWhere`).
export function buildAuditLogWhere(filters: {
    actorId?: string | undefined
    action?: string | undefined
    entityType?: string | undefined
    entityId?: string | undefined
    service?: string | undefined
    occurredFrom?: string | undefined
    occurredTo?: string | undefined
}): AuditLogListWhere {
    const where: AuditLogListWhere = {}

    if (filters.actorId) where.actorId = filters.actorId
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' }
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.service) where.service = filters.service

    const occurredAt: { gte?: Date; lte?: Date } = {}
    if (filters.occurredFrom) occurredAt.gte = new Date(filters.occurredFrom)
    if (filters.occurredTo) occurredAt.lte = new Date(filters.occurredTo)
    if (occurredAt.gte || occurredAt.lte) where.occurredAt = occurredAt

    return where
}

export function buildAuditLogOrderBy(sort: AuditLogListQuery['sort']): AuditLogListOrderBy {
    switch (sort) {
        case AUDIT_LOG_LIST_SORT.OLDEST:
            return { occurredAt: 'asc' }
        case AUDIT_LOG_LIST_SORT.ACTION_ASC:
            return { action: 'asc' }
        case AUDIT_LOG_LIST_SORT.ACTION_DESC:
            return { action: 'desc' }
        case AUDIT_LOG_LIST_SORT.ENTITY_ASC:
            return { entityType: 'asc' }
        case AUDIT_LOG_LIST_SORT.ENTITY_DESC:
            return { entityType: 'desc' }
        case AUDIT_LOG_LIST_SORT.NEWEST:
        default:
            return { occurredAt: 'desc' }
    }
}
