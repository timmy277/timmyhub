import { Injectable } from '@nestjs/common'

import { OUTBOX_AGGREGATE, OUTBOX_EVENT } from '@timmyhub/contracts'
import type { Permission, SystemRole } from '@timmyhub/prisma'
import { PrismaService } from '@timmyhub/prisma'

import { writeOutboxEvent } from '../events/index'

export type UserWithRbac = {
    userRoles: { role: { permissions: { permission: Permission }[] } }[]
    userPermissions: { permission: Permission; isGranted: boolean }[]
} | null

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
                userRoles: {
                    select: { role: { select: { permissions: { select: { permission: true } } } } },
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

    countUsersWithRole(roleId: string): Promise<number> {
        return this.prisma.userSystemRole.count({ where: { roleId } })
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
    createRole(input: { name: string; displayName: string; description?: string | undefined }): Promise<SystemRole> {
        return this.prisma.systemRole.create({
            data: { name: input.name, displayName: input.displayName, description: input.description ?? null },
        })
    }

    updateRole(
        id: string,
        input: { displayName?: string | undefined; description?: string | undefined },
    ): Promise<SystemRole> {
        return this.prisma.systemRole.update({
            where: { id },
            data: {
                ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
            },
        })
    }

    async deleteRole(id: string): Promise<void> {
        await this.prisma.systemRole.delete({ where: { id } })
    }

    createPermission(input: {
        name: string
        displayName: string
        module: string
        resource: string
        action: string
    }): Promise<Permission> {
        return this.prisma.permission.create({ data: input })
    }

    async deletePermission(id: string): Promise<void> {
        await this.prisma.permission.delete({ where: { id } })
    }

    // Thay toàn bộ tập quyền của một role trong một transaction, kèm outbox event (luật cứng #3 CLAUDE.md).
    // Trả về danh sách userId đang giữ role này — để tầng service invalidate cache đúng người bị ảnh hưởng.
    async replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<string[]> {
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

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_ROLE_GRANTED,
                payload: { userId, roleName, grantedBy },
            })
        })
    }

    async revokeUserRole(userId: string, roleId: string, roleName: string, revokedBy: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.userSystemRole.deleteMany({ where: { userId, roleId } })

            await writeOutboxEvent(tx, {
                aggregateType: OUTBOX_AGGREGATE.IDENTITY,
                aggregateId: userId,
                eventType: OUTBOX_EVENT.USER_ROLE_REVOKED,
                payload: { userId, roleName, revokedBy },
            })
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
        })
    }
}
