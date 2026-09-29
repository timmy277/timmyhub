import 'reflect-metadata'

import { PERMISSION_NAMES } from '@timmyhub/contracts'
import { PERMISSIONS_KEY } from '@timmyhub/modules/platform/auth'

import { USERS_ROUTE } from '../identity.constants'
import { UsersController } from './users.controller'

// Ma trận endpoint × quyền (rbac-advanced.md §8: "phủ 100% endpoint") — chạy trên metadata `@Permissions` nên không cần
// dựng HTTP/DB. Hai thứ được khẳng định: mỗi endpoint có ĐÚNG quyền của nó (không nới lỏng âm thầm), và quyền đó tồn
// tại trong danh mục `@timmyhub/contracts` (nếu không, RbacConsistencyChecker sẽ chặn app khởi động).
const ENDPOINT_PERMISSIONS: ReadonlyArray<{ method: keyof UsersController; permission: string }> = [
    { method: 'list', permission: 'identity:users:list' },
    { method: 'detail', permission: 'identity:users:read' },
    { method: 'create', permission: 'identity:users:create' },
    { method: 'update', permission: 'identity:users:update' },
    { method: 'lock', permission: 'identity:users:lock' },
    { method: 'unlock', permission: 'identity:users:lock' },
    { method: 'remove', permission: 'identity:users:delete' },
]

// Đọc handler qua descriptor thay vì `UsersController.prototype[method]`: cách sau làm eslint báo `unbound-method`
// (tách method khỏi object) dù ở đây chỉ cần tham chiếu để đọc metadata.
function handlerOf(method: keyof UsersController): object {
    const handler: unknown = Object.getOwnPropertyDescriptor(UsersController.prototype, method)?.value
    if (typeof handler !== 'function') throw new Error(`Không tìm thấy handler cho ${method}`)
    return handler
}

describe('UsersController — ma trận quyền', () => {
    it.each(ENDPOINT_PERMISSIONS)('$method yêu cầu $permission', ({ method, permission }) => {
        expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(method))).toEqual([permission])
    })

    it('mọi quyền dùng ở đây đều có trong PERMISSION_NAMES (khớp seed, FEAT-RBAC-011)', () => {
        for (const { permission } of ENDPOINT_PERMISSIONS) {
            expect(PERMISSION_NAMES).toContain(permission)
        }
    })

    it('không endpoint nào phụ thuộc role thô thay cho quyền (checklist rbac-advanced.md §9)', () => {
        for (const { method } of ENDPOINT_PERMISSIONS) {
            expect(Reflect.getMetadata('roles', handlerOf(method))).toBeUndefined()
        }
    })
})

describe('USERS_ROUTE', () => {
    it('gắn dưới module identity và tham số hoá userId', () => {
        expect(USERS_ROUTE.ROOT).toBe('v1/identity/users')
        expect(USERS_ROUTE.USER).toBe(':userId')
        expect(USERS_ROUTE.LOCK).toBe(':userId/lock')
        expect(USERS_ROUTE.UNLOCK).toBe(':userId/unlock')
    })
})
