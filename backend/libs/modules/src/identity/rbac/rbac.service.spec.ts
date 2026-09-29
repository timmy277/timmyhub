import { UserRole } from '@timmyhub/contracts'
import type { SystemRole } from '@timmyhub/prisma'

import type { PermissionCacheService } from './permission-cache.service'
import type { RbacRepository } from './rbac.repository'
import { RbacService } from './rbac.service'

// Test luật gán/gỡ vai trò của lớp RBAC (FEAT-USR-004, REQ-USR-011). Repository và cache được thay bằng đối tượng giả:
// mục tiêu là **luật**, không phải Prisma — nhờ vậy dựng được cả những ca khó tạo bằng DB thật (tự gán vai trò cho
// chính mình, tự gỡ vai trò cuối cùng, leo thang lên SUPER_ADMIN).
//
// Luật tự-gán nằm ở đây chứ không ở giao diện: giao diện ẩn nút (user-roles-section.tsx), nhưng lời gọi thẳng API
// phải bị chặn ở tầng service.

const NOW = new Date('2026-09-01T08:00:00.000Z')

function buildRole(overrides: Partial<SystemRole> = {}): SystemRole {
    return {
        id: 'role-admin',
        name: UserRole.ADMIN,
        displayName: 'Quản trị viên',
        description: null,
        isSystem: true,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    }
}

// Mock có kiểu tham số: nhờ vậy đọc được `mock.calls` mà không rơi vào `any` (eslint `no-unsafe-*`).
type MockRepository = {
    findRoleByName: jest.Mock<Promise<SystemRole | null>, [string]>
    countUserRoles: jest.Mock<Promise<number>, [string]>
    assignUserRole: jest.Mock<Promise<void>, [string, string, string, string]>
    revokeUserRole: jest.Mock<Promise<void>, [string, string, string, string]>
}

function buildService(options: { repository?: Partial<MockRepository> } = {}) {
    const repository: MockRepository = {
        findRoleByName: jest.fn<Promise<SystemRole | null>, [string]>().mockResolvedValue(buildRole()),
        countUserRoles: jest.fn<Promise<number>, [string]>().mockResolvedValue(2),
        assignUserRole: jest.fn<Promise<void>, [string, string, string, string]>().mockResolvedValue(undefined),
        revokeUserRole: jest.fn<Promise<void>, [string, string, string, string]>().mockResolvedValue(undefined),
        ...options.repository,
    }

    const invalidateUser = jest.fn()
    const cache = { invalidateUser } as unknown as PermissionCacheService

    return { service: new RbacService(repository as unknown as RbacRepository, cache), repository, invalidateUser }
}

const ADMIN_ACTOR = { id: 'admin-1', roles: [UserRole.ADMIN] }
const SUPER_ADMIN_ACTOR = { id: 'root-1', roles: [UserRole.SUPER_ADMIN] }
const TARGET_USER_ID = 'user-9'

describe('RbacService — gán vai trò', () => {
    it('không cho tự gán vai trò cho chính mình (CANNOT_MODIFY_SELF, 422)', async () => {
        const { service, repository, invalidateUser } = buildService()

        await expect(service.assignRoleToUser(ADMIN_ACTOR.id, UserRole.SELLER, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'CANNOT_MODIFY_SELF',
            status: 422,
        })
        expect(repository.assignUserRole).not.toHaveBeenCalled()
        expect(invalidateUser).not.toHaveBeenCalled()
    })

    // Thứ tự kiểm tra là một phần của hợp đồng: chặn tự-gán trước khi tra vai trò, nên tên vai trò sai cũng không đổi
    // được mã lỗi trả về.
    it('chặn tự gán TRƯỚC khi tra vai trò', async () => {
        const { service, repository } = buildService()
        repository.findRoleByName.mockResolvedValue(null)

        await expect(service.assignRoleToUser(ADMIN_ACTOR.id, 'khong-ton-tai', ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'CANNOT_MODIFY_SELF',
        })
        expect(repository.findRoleByName).not.toHaveBeenCalled()
    })

    it('ADMIN không gán được vai trò SUPER_ADMIN cho người khác (chống leo thang)', async () => {
        const { service, repository } = buildService()
        repository.findRoleByName.mockResolvedValue(buildRole({ id: 'role-root', name: UserRole.SUPER_ADMIN }))

        await expect(service.assignRoleToUser(TARGET_USER_ID, UserRole.SUPER_ADMIN, ADMIN_ACTOR)).rejects.toMatchObject(
            {
                code: 'CANNOT_ESCALATE_PRIVILEGE',
                status: 403,
            },
        )
        expect(repository.assignUserRole).not.toHaveBeenCalled()
    })

    it('SUPER_ADMIN gán được vai trò SUPER_ADMIN cho người khác', async () => {
        const { service, repository, invalidateUser } = buildService()
        const role = buildRole({ id: 'role-root', name: UserRole.SUPER_ADMIN })
        repository.findRoleByName.mockResolvedValue(role)

        await service.assignRoleToUser(TARGET_USER_ID, UserRole.SUPER_ADMIN, SUPER_ADMIN_ACTOR)

        expect(repository.assignUserRole).toHaveBeenCalledWith(TARGET_USER_ID, role.id, role.name, SUPER_ADMIN_ACTOR.id)
        expect(invalidateUser).toHaveBeenCalledWith(TARGET_USER_ID)
    })

    it('vai trò không tồn tại → ROLE_NOT_FOUND', async () => {
        const { service, repository } = buildService()
        repository.findRoleByName.mockResolvedValue(null)

        await expect(service.assignRoleToUser(TARGET_USER_ID, 'khong-ton-tai', ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'ROLE_NOT_FOUND',
            status: 404,
        })
    })
})

describe('RbacService — gỡ vai trò', () => {
    it('không cho tự gỡ vai trò của chính mình (CANNOT_MODIFY_SELF, 422)', async () => {
        const { service, repository, invalidateUser } = buildService()

        await expect(service.revokeRoleFromUser(ADMIN_ACTOR.id, UserRole.ADMIN, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'CANNOT_MODIFY_SELF',
            status: 422,
        })
        expect(repository.revokeUserRole).not.toHaveBeenCalled()
        expect(invalidateUser).not.toHaveBeenCalled()
    })

    it('không gỡ được vai trò cuối cùng của một tài khoản (REQ-USR-011)', async () => {
        const { service, repository } = buildService()
        repository.countUserRoles.mockResolvedValue(1)

        await expect(service.revokeRoleFromUser(TARGET_USER_ID, UserRole.USER, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'CANNOT_REMOVE_LAST_ROLE',
            status: 422,
        })
        expect(repository.revokeUserRole).not.toHaveBeenCalled()
    })

    it('gỡ vai trò khi tài khoản còn nhiều hơn một → ghi DB + xoá cache', async () => {
        const { service, repository, invalidateUser } = buildService()
        const role = buildRole()
        repository.findRoleByName.mockResolvedValue(role)
        repository.countUserRoles.mockResolvedValue(2)

        await service.revokeRoleFromUser(TARGET_USER_ID, UserRole.ADMIN, ADMIN_ACTOR)

        expect(repository.revokeUserRole).toHaveBeenCalledWith(TARGET_USER_ID, role.id, role.name, ADMIN_ACTOR.id)
        expect(invalidateUser).toHaveBeenCalledWith(TARGET_USER_ID)
    })
})
