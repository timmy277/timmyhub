import { Controller, Get, Param, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type { AuditLogDetail, AuditLogListQuery, AuditLogListResult } from '@timmyhub/contracts'
import { AuditLogListQuerySchema } from '@timmyhub/contracts'
import { Permissions } from '@timmyhub/modules/platform/auth'

import { AUDIT_ROUTE, AUDIT_ROUTE_PARAM } from '../identity.constants'
import { AuditService } from './audit.service'

// Tra cứu audit log (FEAT-AUD-004) — docs/03-specs/audit-log.
//
// Mọi endpoint ở đây yêu cầu phiên hợp lệ + permission `audit:logs:*` (PermissionsGuard lớp 2 kiểm). Không có
// `@Public()` — audit trail là dữ liệu quản trị, không công khai. SUPER_ADMIN bypass qua PermissionsGuard.
//
// Bảng AuditLog bất biến (ADR-0011): chỉ INSERT qua `writeAuditLog` trong transaction nghiệp vụ, không có
// endpoint ghi/sửa/xoá qua API.
@Controller(AUDIT_ROUTE.ROOT)
export class AuditController {
    // ===== Dependencies =====
    constructor(private readonly auditService: AuditService) {}

    // ===== Queries =====
    @Permissions('audit:logs:list')
    @Get(AUDIT_ROUTE.LOGS)
    list(@Query(new ZodValidationPipe(AuditLogListQuerySchema)) query: AuditLogListQuery): Promise<AuditLogListResult> {
        return this.auditService.listAuditLogs(query)
    }

    @Permissions('audit:logs:read')
    @Get(AUDIT_ROUTE.LOG)
    detail(@Param(AUDIT_ROUTE_PARAM.LOG_ID) logId: string): Promise<AuditLogDetail> {
        return this.auditService.getAuditLog(logId)
    }
}
