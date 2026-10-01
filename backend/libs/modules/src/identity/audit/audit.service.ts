import { Injectable } from '@nestjs/common'

import type { AuditLogDetail, AuditLogListQuery, AuditLogListResult } from '@timmyhub/contracts'
import { ApiError, apiMessageKey } from '@timmyhub/contracts'

import { toAuditLogDetail, toAuditLogPagination, toAuditLogSummary } from './audit.mapper'
import { AuditRepository } from './audit.repository'

// Tra cứu audit log — FEAT-AUD-004. Service chỉ đọc: bảng AuditLog bất biến (ADR-0011), không có thao tác ghi
// qua API. Mọi audit entry được sinh trong transaction nghiệp vụ qua `writeAuditLog`.
//
// Phạm vi dữ liệu: toàn bộ audit log — quyền truy cập do `audit:logs:list`/`audit:logs:read` kiểm ở controller.
// SUPER_ADMIN bypass PermissionsGuard nên đọc được mọi bản ghi; ADMIN có permission `audit:logs:list` cũng đọc
// được (permission catalog §4.10). Không lọc theo actorId của người gọi — admin tra cứu được mọi hành động.
@Injectable()
export class AuditService {
    // ===== Dependencies =====
    constructor(private readonly repository: AuditRepository) {}

    // ===== Queries =====
    async listAuditLogs(query: AuditLogListQuery): Promise<AuditLogListResult> {
        const { items, totalItems } = await this.repository.listAuditLogs({
            filters: {
                actorId: query.actorId,
                action: query.action,
                entityType: query.entityType,
                entityId: query.entityId,
                service: query.service,
                occurredFrom: query.occurredFrom,
                occurredTo: query.occurredTo,
            },
            page: query.page,
            pageSize: query.pageSize,
            sort: query.sort,
        })

        const actorNames = await this.repository.findActorNames(
            items.map((item) => item.actorId).filter((id): id is string => id !== null),
        )

        return {
            items: items.map((item) =>
                toAuditLogSummary(item, item.actorId ? (actorNames.get(item.actorId) ?? null) : null),
            ),
            pagination: toAuditLogPagination(totalItems, query.page, query.pageSize),
        }
    }

    async getAuditLog(id: string): Promise<AuditLogDetail> {
        const log = await this.repository.findAuditLogById(id)
        if (!log) {
            throw new ApiError('NOT_FOUND', { messageKey: apiMessageKey('audit.logNotFound') })
        }
        const actorNames = await this.repository.findActorNames(log.actorId ? [log.actorId] : [])
        return toAuditLogDetail(log, log.actorId ? (actorNames.get(log.actorId) ?? null) : null)
    }
}
