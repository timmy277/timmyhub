import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'

import { UserRole } from '@timmyhub/contracts'
import type { PermissionName } from '@timmyhub/contracts'

import type { PermissionResolver } from '../interfaces/index'
import { PermissionsGuard } from './permissions.guard'

// Lớp 2 của chuỗi kiểm quyền (CLAUDE.md luật #6). Guard này là thứ đứng giữa giao diện và mọi endpoint quản trị người
// dùng, nên hành vi của nó phải được test trực tiếp: thiếu quyền → 403, có quyền → cho qua, SUPER_ADMIN bypass mà
// KHÔNG hỏi resolver (đỡ một lượt truy vấn và đúng luật bypass).

function buildContext(user: { id: string; roles: UserRole[] } | undefined): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => undefined,
        getClass: () => undefined,
    } as unknown as ExecutionContext
}

function buildGuard(required: PermissionName[], effective: string[], user?: { id: string; roles: UserRole[] }) {
    const reflector = { getAllAndOverride: () => required } as unknown as Reflector
    // Giữ spy ở biến riêng: khẳng định trên `permissionResolver.getEffectivePermissions` sẽ bị eslint báo
    // `unbound-method` (tách method khỏi object).
    const getEffectivePermissions = jest.fn().mockResolvedValue(new Set(effective))
    const permissionResolver: PermissionResolver = {
        getEffectivePermissions,
        listPermissions: jest.fn().mockResolvedValue([]),
    }
    return { guard: new PermissionsGuard(reflector, permissionResolver), getEffectivePermissions, user }
}

describe('PermissionsGuard', () => {
    it('403 khi người dùng không có quyền yêu cầu', async () => {
        const { guard } = buildGuard(['identity:users:list'], [], {
            id: 'u1',
            roles: [UserRole.MODERATOR],
        })

        await expect(guard.canActivate(buildContext({ id: 'u1', roles: [UserRole.MODERATOR] }))).rejects.toMatchObject({
            code: 'FORBIDDEN',
            status: 403,
        })
    })

    it('cho qua khi quyền hiệu lực có quyền yêu cầu — kể cả khi role không phải ADMIN', async () => {
        const { guard } = buildGuard(['identity:users:list'], ['identity:users:list'], {
            id: 'u1',
            roles: [UserRole.MODERATOR],
        })

        await expect(guard.canActivate(buildContext({ id: 'u1', roles: [UserRole.MODERATOR] }))).resolves.toBe(true)
    })

    it('đòi đủ MỌI quyền khai báo trên endpoint', async () => {
        const { guard } = buildGuard(['identity:users:list', 'identity:users:update'], ['identity:users:list'], {
            id: 'u1',
            roles: [UserRole.ADMIN],
        })

        await expect(guard.canActivate(buildContext({ id: 'u1', roles: [UserRole.ADMIN] }))).rejects.toMatchObject({
            code: 'FORBIDDEN',
        })
    })

    it('SUPER_ADMIN bypass lớp 2 mà không hỏi resolver', async () => {
        const { guard, getEffectivePermissions } = buildGuard(['identity:users:delete'], [], {
            id: 'root',
            roles: [UserRole.SUPER_ADMIN],
        })

        await expect(guard.canActivate(buildContext({ id: 'root', roles: [UserRole.SUPER_ADMIN] }))).resolves.toBe(true)
        expect(getEffectivePermissions).not.toHaveBeenCalled()
    })

    it('401 khi request chưa qua lớp xác thực', async () => {
        const { guard } = buildGuard(['identity:users:list'], [])

        await expect(guard.canActivate(buildContext(undefined))).rejects.toMatchObject({ status: 401 })
    })
})
