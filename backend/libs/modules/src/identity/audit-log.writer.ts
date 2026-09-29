import type { Prisma } from '@timmyhub/prisma'

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
export async function writeAuditLog(tx: Prisma.TransactionClient, entry: AuditLogEntry): Promise<void> {
    await tx.auditLog.create({
        data: {
            service: 'identity',
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            actorId: entry.actorId,
            actorType: entry.actorType,
            ...(entry.before !== undefined ? { before: entry.before } : {}),
            ...(entry.after !== undefined ? { after: entry.after } : {}),
        },
    })
}
