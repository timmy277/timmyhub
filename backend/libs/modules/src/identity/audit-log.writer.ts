import type { Prisma } from '@timmyhub/prisma'

import { getAuditContext } from './audit-context'

export type AuditLogEntry = {
    action: string
    entityType: 'User' | 'SystemRole' | 'Permission' | 'RolePermission' | 'UserPermission'
    entityId: string
    actorId: string
    actorType: 'ADMIN' | 'USER' | 'SYSTEM'
    before?: Prisma.InputJsonValue | undefined
    after?: Prisma.InputJsonValue | undefined
}

// Keep the audit entry in the same database transaction as the mutation. Never pass credentials, tokens, or secrets in snapshots.
//
// `actorIp`/`userAgent` đọc từ ngữ cảnh request (xem `audit-context.ts`) chứ không qua tham số: hàm này được gọi ở
// ~15 chỗ trong repository, luồn thêm hai trường qua từng chữ ký là nhiễu vô ích. Ngoài request (worker/cron) ngữ
// cảnh rỗng nên hai cột để null — bảng cho phép, và đúng nghĩa "không đến từ HTTP".
export async function writeAuditLog(tx: Prisma.TransactionClient, entry: AuditLogEntry): Promise<void> {
    const context = getAuditContext()

    await tx.auditLog.create({
        data: {
            service: 'identity',
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            actorId: entry.actorId,
            actorType: entry.actorType,
            actorIp: context?.actorIp ?? null,
            userAgent: context?.userAgent ?? null,
            ...(entry.before !== undefined ? { before: entry.before } : {}),
            ...(entry.after !== undefined ? { after: entry.after } : {}),
        },
    })
}
