import { Injectable } from '@nestjs/common'

import { isUserRole, OUTBOX_AGGREGATE, OUTBOX_EVENT, UserRole } from '@timmyhub/contracts'
import type { Permission, Prisma, SystemRole } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'

// Import thẳng file writer thay vì barrel `events/index`: barrel kéo theo `IdentityEventsListener` (cần
// `@nestjs/event-emitter`, bản ESM) làm module này không nạp được trong môi trường test Jest/CJS — cùng lý do và cùng
// cách xử lý với `users.repository.ts`. Writer là hàm thuần nhận `tx`, không cần DI.
// Ngoại lệ này đã khai một lần ở `eslint.config.mjs` (`!../events/outbox-writer`).
import { writeOutboxEvent } from '../events/outbox-writer'
import { writeAuditLog } from '../audit-log.writer'

export type UserWithRbac = {
    roles: UserRole[]
    userRoles: { role: { name: string; permissions: { permission: Permission }[] } }[]
    userPermissions: { permission: Permission; isGranted: boolean }[]
} | null

// Role kèm permission đang gán — dùng cho màn chi tiết/sửa role (đọc tập quyền để hiện và gán lại).
export type RoleWithPermissions = SystemRole & { permissions: { permission: Permission }[] }

@Injectable()
export class RbacRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====

    // §6 design.md: một query duy nhất, không đọc-rồi-lọc — dùng để tính effective permissions.
    findUserWithRbac(userId: string): Promise<UserWithRbac> {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                roles: true,
                userRoles: {
                    select: { role: { select: { name: true, permissions: { select: { permission: true } } } } },
                },
                userPermissions: {
                    select: { permission: true, isGranted: true },
                },
            },
        })
    }

    listRoles(): Promise<SystemRole[]> {
        return this.prisma.systemRole.findMany({ orderBy: { createdAt: 'asc' } })
    }

    findRoleById(id: string): Promise<SystemRole | null> {
        return this.prisma.systemRole.findUnique({ where: { id } })
    }

    findRoleByName(name: string): Promise<SystemRole | null> {
        return this.prisma.systemRole.findUnique({ where: { name } })
    }

    findRolesWithPermissionsByNames(names: string[]): Promise<RoleWithPermissions[]> {
        return this.prisma.systemRole.findMany({
            where: { name: { in: names } },
            include: { permissions: { include: { permission: true } } },
        })
    }

    // Một query duy nhất lấy role + permission đang gán (join `RolePermission`), không đọc-rồi-lọc (luật cứng #7).
    findRoleWithPermissions(id: string): Promise<RoleWithPermissions | null> {
        return this.prisma.systemRole.findUnique({
            where: { id },
            include: { permissions: { include: { permission: true } } },
        })
    }

    countUsersWithRole(roleId: string): Promise<number> {
        return this.prisma.userSystemRole.count({ where: { roleId } })
    }

    countUserRoles(userId: string): Promise<number> {
        return this.prisma.userSystemRole.count({ where: { userId } })
    }

    listPermissions(): Promise<Permission[]> {
        return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }] })
    }

    findPermissionById(id: string): Promise<Permission | null> {
        return this.prisma.permission.findUnique({ where: { id } })
    }

    findPermissionByName(name: string): Promise<Permission | null> {
        return this.prisma.permission.findUnique({ where: { name } })
    }

    findPermissionsByNames(names: string[]): Promise<Permission[]> {
        return this.prisma.permission.findMany({ where: { name: { in: names } } })
    }

    // ===== Commands =====
    createRole(
        input: { name: string; displayName: string; description?: string | undefined },
        actorId: string,
    ): Promise<SystemRole> {
        return this.prisma.$transaction(async (tx) => {
            const role = await tx.systemRole.create({
                data: { name: input.name, displayName: input.displayName, description: input.description ?? null },
            })
            await writeAuditLog(tx, {
                action: 'identity.role.create',
                entityType: 'SystemRole',
                entityId: role.id,
                actorId,
                actorType: 'ADMIN',
                after: { name: role.name, displayName: role.displayName },
            })
            return role
        })
    }

    updateRole(
        id: string,
        input: { displayName?: string | undefined; description?: string | undefined },
        actorId: string,
    ): Promise<SystemRole> {
        return this.prisma.$transaction(async (tx) => {
            const role = await tx.systemRole.update({
                where: { id },
                data: {
                    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
                    ...(input.description !== undefined ? { description: input.description } : {}),
                },
            })
            await writeAuditLog(tx, {
                action: 'identity.role.update',
                entityType: 'SystemRole',
                entityId: id,
                actorId,
                actorType: 'ADMIN',
                after: { changedFields: Object.keys(input) },
            })
            return role
        })
    }

    async deleteRole(id: string, actorId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.systemRole.delete({ where: { id } })
            await writeAuditLog(tx, {
                action: 'identity.role.delete',
                entityType: 'SystemRole',
                entityId: id,
                actorId,
                actorType: 'ADMIN',
                after: { deleted: true },
            })
        })
    }

    createPermission(
        input: {
            name: string
            displayName: string
            module: string
            resource: string
            action: string
        },
        actorId: string,
    ): Promise<Permission> {
        return this.prisma.$transaction(async (tx) => {
            const permission = await tx.permission.create({ data: input })
            await writeAuditLog(tx, {
                action: 'identity.permission.create',
                entityType: 'Permission',
                entityId: permission.id,
                actorId,
                actorType: 'ADMIN',
                after: { name: permission.name, displayName: permission.displayName },
            })
            return permission
        })
    }

    async deletePermission(id: string, actorId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.permission.delete({ where: { id } })
            await writeAuditLog(tx, {
                action: 'identity.permission.delete',
                entityType: 'Permission',
                entityId: id,
                actorId,
                actorType: 'ADMIN',
                after: { deleted: true },
            })
        })
    }

    // Thay toàn bộ tập quyền của một role trong một transaction, kèm outbox event (luật cứng #3 CLAUDE.md).
    // Trả về danh sách userId đang giữ role này — để tầng service invalidate cache đúng người bị ảnh hưởng.
    async replaceRolePermissions(roleId: string, permissionIds: string[], actorId: string): Promise<string[]> {
        return this.prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId } })
            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
                    skipDuplicates: true,
                })
            }

            const affected = await tx.userSystemRole.findMany({ where: { roleId }, select: { userId: true } })
            const affectedUserIds = affected.map((a) => a.userId)

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: roleId,
                eventType: OUTBOX_EVENT.RBAC_PERMISSIONS_CHANGED,
                payload: { roleId, affectedUserIds },
            })

            await writeAuditLog(tx, {
                action: 'identity.role.permissions.replace',
                entityType: 'SystemRole',
                entityId: roleId,
                actorId,
                actorType: 'ADMIN',
                after: { permissionIds },
            })

            return affectedUserIds
        })
    }

    // @@id([userId, roleId]) làm cho gán trùng là no-op nguyên tử — dùng upsert thay vì kiểm tra rồi tạo.
    async assignUserRole(userId: string, roleId: string, roleName: string, grantedBy: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.userSystemRole.upsert({
                where: { userId_roleId: { userId, roleId } },
                update: {},
                create: { userId, roleId },
            })

            await this.syncEnumRoles(tx, userId)

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_ROLE_GRANTED,
                payload: { userId, roleName, grantedBy },
            })
            await writeAuditLog(tx, {
                action: 'identity.user.role.grant',
                entityType: 'User',
                entityId: userId,
                actorId: grantedBy,
                actorType: 'ADMIN',
                after: { roleName },
            })
        })
    }

    async revokeUserRole(userId: string, roleId: string, roleName: string, revokedBy: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.userSystemRole.deleteMany({ where: { userId, roleId } })

            await this.syncEnumRoles(tx, userId)

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_ROLE_REVOKED,
                payload: { userId, roleName, revokedBy },
            })
            await writeAuditLog(tx, {
                action: 'identity.user.role.revoke',
                entityType: 'User',
                entityId: userId,
                actorId: revokedBy,
                actorType: 'ADMIN',
                after: { roleName },
            })
        })
    }

    // Giữ hai lớp vai trò khớp nhau: `User.roles` (lớp 1 — nguồn của JWT và của bộ lọc/`@Roles`) phải phản ánh đúng
    // tập `UserSystemRole` (lớp 2 — nguồn của permission động). Không đồng bộ thì user được gán ADMIN qua API vẫn
    // mang JWT `[USER]`: bảng quản trị hiển thị sai và vai trò SUPER_ADMIN gán qua API sẽ mất luôn đường bypass.
    // Danh sách được TÍNH LẠI từ bảng join trong cùng transaction, không cộng/trừ mảng — tránh bản ghi trùng khi gán
    // hai lần. Vai trò động ngoài tập enum (SystemRole tạo tự do) bị bỏ qua vì `User.roles` chỉ nhận enum.
    private async syncEnumRoles(tx: Prisma.TransactionClient, userId: string): Promise<void> {
        const assigned = await tx.userSystemRole.findMany({
            where: { userId },
            select: { role: { select: { name: true } } },
        })
        const enumRoles = assigned.map((entry) => entry.role.name).filter(isUserRole)
        await tx.user.update({
            where: { id: userId },
            data: { roles: enumRoles.length > 0 ? enumRoles : [UserRole.USER] },
        })
    }

    // @@unique([userId, permissionId]) — upsert biến ghi đè tranh chấp thành no-op, không cần transaction đọc-trước.
    async upsertUserPermission(
        userId: string,
        permissionId: string,
        isGranted: boolean,
        actorId: string,
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.userPermission.upsert({
                where: { userId_permissionId: { userId, permissionId } },
                update: { isGranted },
                create: { userId, permissionId, isGranted },
            })

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.RBAC_PERMISSIONS_CHANGED,
                payload: { permissionId, affectedUserIds: [userId], grantedBy: actorId, isGranted },
            })
            await writeAuditLog(tx, {
                action: isGranted ? 'identity.user.permission.grant' : 'identity.user.permission.deny',
                entityType: 'UserPermission',
                entityId: userId,
                actorId,
                actorType: 'ADMIN',
                after: { permissionId, isGranted },
            })
        })
    }
}
