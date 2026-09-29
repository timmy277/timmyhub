// Test này import thẳng `PermissionsGuard` (platform/auth) và `RbacController` (rbac): barrel của các domain đó cố ý
// **không** export controller/guard vì chúng là file nội bộ. Rule ranh giới module đã được tắt riêng cho file test ở
// `eslint.config.mjs` — điều kiện để ma trận chạy được guard + metadata thật thay vì bản sao tự viết.

import 'reflect-metadata'

import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'

import type { PermissionName } from '@timmyhub/contracts'
import { UserRole } from '@timmyhub/contracts'
import { PERMISSIONS_KEY } from '@timmyhub/modules/platform/auth'
import type { PermissionResolver } from '@timmyhub/modules/platform/auth'

import { PermissionsGuard } from '../../platform/auth/guards/permissions.guard'
import { RbacController } from '../rbac/rbac.controller'
import { UsersController } from './users.controller'

// Ma trận quyền của màn quản trị người dùng — **hệ quả** của `@Permissions`, không phải sự tồn tại của nó.
//
// `users.controller.spec.ts` khẳng định từng endpoint gắn đúng quyền nào; ở đây mỗi "chân dung" (persona) quyền hiệu
// lực đi qua **PermissionsGuard thật** với **metadata `@Permissions` thật** đọc từ controller, rồi khẳng định đúng tập
// endpoint vào được. Đây là những câu hỏi người dùng thật sẽ hỏi: không có quyền xem thì có xem được không, có quyền
// xem mà thiếu quyền sửa thì sao, có quyền sửa mà thiếu khoá/gán vai trò thì sao.
//
// Không dựng HTTP/DB: quyền là chuyện của metadata + guard, cả hai đều thuần. Nhờ vậy ma trận này chạy trong vài ms và
// là lưới an toàn cho việc thêm endpoint mới — thêm handler mà quên `@Permissions` thì guard cho qua hết, và test
// "mọi handler đều có mặt trong ma trận" bên dưới sẽ đỏ trước khi chuyện đó tới tay người dùng.

type ControllerClass = { name: string; prototype: object }

type Endpoint = {
    action: string
    controller: ControllerClass
    method: string
}

const ACTION = {
    LIST: 'xem danh sách',
    DETAIL: 'xem chi tiết',
    CREATE: 'tạo tài khoản',
    UPDATE: 'sửa hồ sơ',
    LOCK: 'khoá tài khoản',
    UNLOCK: 'mở khoá tài khoản',
    DELETE: 'xoá tài khoản',
    ASSIGN_ROLE: 'gán vai trò',
    REVOKE_ROLE: 'gỡ vai trò',
} as const

// Mọi endpoint của màn này nằm ở hai controller: `UsersController` (hồ sơ + khoá + xoá) và `RbacController` (gán/gỡ vai
// trò — quyền `identity:users:assign-role` do identity module sở hữu nên endpoint nằm ở rbac controller).
const ENDPOINTS: readonly Endpoint[] = [
    { action: ACTION.LIST, controller: UsersController, method: 'list' },
    { action: ACTION.DETAIL, controller: UsersController, method: 'detail' },
    { action: ACTION.CREATE, controller: UsersController, method: 'create' },
    { action: ACTION.UPDATE, controller: UsersController, method: 'update' },
    { action: ACTION.LOCK, controller: UsersController, method: 'lock' },
    { action: ACTION.UNLOCK, controller: UsersController, method: 'unlock' },
    { action: ACTION.DELETE, controller: UsersController, method: 'remove' },
    { action: ACTION.ASSIGN_ROLE, controller: RbacController, method: 'assignRole' },
    { action: ACTION.REVOKE_ROLE, controller: RbacController, method: 'revokeRole' },
]

// Handler cố ý KHÔNG gắn `@Permissions`: xem quyền hiệu lực của chính mình luôn được phép, còn phạm vi own|any do
// RbacService quyết định ở lớp 4 (trả 404 khi ngoài phạm vi). Liệt kê tường minh để test phủ handler bên dưới không
// coi đây là chỗ quên khai báo.
const INTENTIONALLY_OPEN: ReadonlyArray<{ controller: ControllerClass; method: string }> = [
    { controller: RbacController, method: 'getEffectivePermissions' },
]

const P = {
    LIST: 'identity:users:list',
    READ: 'identity:users:read',
    CREATE: 'identity:users:create',
    UPDATE: 'identity:users:update',
    DELETE: 'identity:users:delete',
    LOCK: 'identity:users:lock',
    ASSIGN_ROLE: 'identity:users:assign-role',
} as const satisfies Record<string, PermissionName>

const ALL_ACTIONS = Object.values(ACTION)

interface Persona {
    name: string
    roles: readonly UserRole[]
    permissions: readonly string[]
    // Tập endpoint vào được, ĐÚNG THỨ TỰ của `ENDPOINTS` — khẳng định bằng `toEqual` nên vừa bắt thừa vừa bắt thiếu.
    allowed: readonly string[]
}

// `roles` cố ý để đa dạng: quyền vào màn này do **permission** quyết định, không phải role — một vai trò tự tạo có đúng
// quyền vẫn dùng được (yêu cầu của chủ dự án, ghi ở đầu `users.controller.ts`).
const PERSONAS: readonly Persona[] = [
    {
        name: 'không có quyền identity:users:* nào',
        roles: [UserRole.USER],
        permissions: [],
        allowed: [],
    },
    {
        name: 'chỉ có list — mở được danh sách, KHÔNG mở được chi tiết',
        roles: [UserRole.MODERATOR],
        permissions: [P.LIST],
        allowed: [ACTION.LIST],
    },
    {
        name: 'có read mà thiếu list — gọi thẳng API chi tiết thì được, nhưng giao diện không cho vào màn',
        roles: [UserRole.MODERATOR],
        permissions: [P.READ],
        allowed: [ACTION.DETAIL],
    },
    {
        name: 'list + read — chỉ xem, không sửa/khoá/xoá được gì',
        roles: [UserRole.MODERATOR],
        permissions: [P.LIST, P.READ],
        allowed: [ACTION.LIST, ACTION.DETAIL],
    },
    {
        name: 'list + read + update — sửa hồ sơ được, KHÔNG khoá và KHÔNG gán vai trò được',
        roles: [UserRole.ADMIN],
        permissions: [P.LIST, P.READ, P.UPDATE],
        allowed: [ACTION.LIST, ACTION.DETAIL, ACTION.UPDATE],
    },
    {
        name: 'update mà thiếu read — PATCH chạy được, nhưng giao diện ẩn tab sửa vì form cần đọc giá trị hiện tại',
        roles: [UserRole.ADMIN],
        permissions: [P.UPDATE],
        allowed: [ACTION.UPDATE],
    },
    {
        name: 'lock mà thiếu update — khoá/mở khoá được, sửa hồ sơ thì không',
        roles: [UserRole.ADMIN],
        permissions: [P.LOCK],
        allowed: [ACTION.LOCK, ACTION.UNLOCK],
    },
    {
        name: 'assign-role mà thiếu update — gán/gỡ vai trò được, sửa hồ sơ thì không',
        roles: [UserRole.ADMIN],
        permissions: [P.ASSIGN_ROLE],
        allowed: [ACTION.ASSIGN_ROLE, ACTION.REVOKE_ROLE],
    },
    {
        name: 'ADMIN theo seed — thiếu delete và assign-role nên hai việc đó bị chặn',
        roles: [UserRole.ADMIN],
        permissions: [P.LIST, P.READ, P.CREATE, P.UPDATE, P.LOCK],
        allowed: [ACTION.LIST, ACTION.DETAIL, ACTION.CREATE, ACTION.UPDATE, ACTION.LOCK, ACTION.UNLOCK],
    },
    {
        name: 'SUPER_ADMIN — bypass lớp 2 dù không seed permission nào',
        roles: [UserRole.SUPER_ADMIN],
        permissions: [],
        allowed: ALL_ACTIONS,
    },
]

function handlerOf(controller: ControllerClass, method: string): object {
    const handler: unknown = Object.getOwnPropertyDescriptor(controller.prototype, method)?.value
    if (typeof handler !== 'function') throw new Error(`Không tìm thấy handler ${method}`)
    return handler
}

function requiredPermissionsOf(endpoint: Endpoint): PermissionName[] {
    const metadata: unknown = Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(endpoint.controller, endpoint.method))
    if (!Array.isArray(metadata) || metadata.length === 0) {
        throw new Error(`${endpoint.method} chưa khai báo @Permissions — endpoint mở với mọi người đã đăng nhập`)
    }
    return metadata as PermissionName[]
}

// Reflector rút gọn nhưng đọc **metadata thật** theo đúng thứ tự handler → class của `Reflector.getAllAndOverride`.
const reflector = {
    getAllAndOverride: (key: string, targets: readonly unknown[]) => {
        for (const target of targets) {
            if (target === undefined || target === null) continue
            const value: unknown = Reflect.getMetadata(key, target)
            if (value !== undefined) return value
        }
        return undefined
    },
} as unknown as Reflector

function buildContext(actor: { id: string; roles: UserRole[] } | undefined, endpoint: Endpoint): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user: actor }) }),
        getHandler: () => handlerOf(endpoint.controller, endpoint.method),
        getClass: () => endpoint.controller,
    } as unknown as ExecutionContext
}

function buildGuard(permissions: readonly string[]) {
    const getEffectivePermissions = jest.fn().mockResolvedValue(new Set(permissions))
    const permissionResolver: PermissionResolver = {
        getEffectivePermissions,
        listPermissions: jest.fn().mockResolvedValue([]),
    }
    return { guard: new PermissionsGuard(reflector, permissionResolver), getEffectivePermissions }
}

async function reachableActions(persona: Persona): Promise<string[]> {
    const { guard } = buildGuard(persona.permissions)
    const actor = { id: 'actor-1', roles: [...persona.roles] }
    const reachable: string[] = []

    for (const endpoint of ENDPOINTS) {
        const allowed = await guard
            .canActivate(buildContext(actor, endpoint))
            .then(() => true)
            .catch(() => false)
        if (allowed) reachable.push(endpoint.action)
    }

    return reachable
}

describe('Ma trận quyền màn quản trị người dùng', () => {
    it.each(PERSONAS)('$name', async (persona) => {
        await expect(reachableActions(persona)).resolves.toEqual(persona.allowed)
    })

    it('endpoint không có quyền nào bị bỏ qua: người không có quyền vào được endpoint không gắn @Permissions', async () => {
        const { guard } = buildGuard([])
        const endpoint = INTENTIONALLY_OPEN[0]
        const context = {
            switchToHttp: () => ({ getRequest: () => ({ user: { id: 'actor-1', roles: [UserRole.USER] } }) }),
            getHandler: () => handlerOf(endpoint!.controller, endpoint!.method),
            getClass: () => endpoint!.controller,
        } as unknown as ExecutionContext

        await expect(guard.canActivate(context)).resolves.toBe(true)
    })

    it('SUPER_ADMIN bypass lớp 2 mà không hỏi resolver (đỡ một lượt truy vấn)', async () => {
        const { guard, getEffectivePermissions } = buildGuard([])
        const actor = { id: 'root-1', roles: [UserRole.SUPER_ADMIN] }

        for (const endpoint of ENDPOINTS) {
            await expect(guard.canActivate(buildContext(actor, endpoint))).resolves.toBe(true)
        }
        expect(getEffectivePermissions).not.toHaveBeenCalled()
    })

    it('401 khi request chưa qua lớp xác thực, kể cả endpoint cần quyền mạnh nhất', async () => {
        const { guard } = buildGuard(ALL_ACTIONS)

        await expect(guard.canActivate(buildContext(undefined, ENDPOINTS[6]!))).rejects.toMatchObject({
            code: 'UNAUTHORIZED',
            status: 401,
        })
    })

    it('mọi quyền trong ma trận đều có trong danh mục và trong seed', () => {
        const declared = new Set(ENDPOINTS.flatMap(requiredPermissionsOf))
        expect([...declared].sort()).toEqual(Object.values(P).sort())
    })
})

describe('Độ phủ endpoint của ma trận', () => {
    it('UsersController — mọi handler đều có mặt trong ma trận', () => {
        const covered = ENDPOINTS.filter((endpoint) => endpoint.controller === UsersController).map(
            (endpoint) => endpoint.method,
        )
        const handlers = Object.getOwnPropertyNames(UsersController.prototype).filter((name) => name !== 'constructor')

        expect([...handlers].sort()).toEqual([...covered].sort())
    })

    it('RbacController — đúng hai endpoint thuộc màn người dùng nằm trong ma trận', () => {
        const covered = new Set(
            ENDPOINTS.filter((endpoint) => endpoint.controller === RbacController).map((endpoint) => endpoint.method),
        )

        expect(covered).toEqual(new Set(['assignRole', 'revokeRole']))
    })

    // Lưới an toàn rộng hơn: quét MỌI handler của hai controller. Thêm endpoint mới mà quên `@Permissions` thì guard
    // cho qua với bất kỳ ai đã đăng nhập — test này đỏ trước khi chuyện đó ra tới production.
    it('không handler nào mở mà thiếu @Permissions, ngoài danh sách cố ý mở', () => {
        const intentionallyOpen = new Set(INTENTIONALLY_OPEN.map((entry) => `${entry.controller.name}.${entry.method}`))
        const unprotected: string[] = []

        for (const controller of [UsersController, RbacController]) {
            for (const method of Object.getOwnPropertyNames(controller.prototype)) {
                if (method === 'constructor') continue
                if (intentionallyOpen.has(`${controller.name}.${method}`)) continue
                const metadata: unknown = Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(controller, method))
                if (!Array.isArray(metadata) || metadata.length === 0) unprotected.push(`${controller.name}.${method}`)
            }
        }

        expect(unprotected).toEqual([])
    })

    it('handler cố ý mở thật sự không gắn @Permissions', () => {
        for (const entry of INTENTIONALLY_OPEN) {
            expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(entry.controller, entry.method))).toBeUndefined()
        }
    })
})
