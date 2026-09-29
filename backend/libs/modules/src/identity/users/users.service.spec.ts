import {
    ApiError,
    USER_LIST_DEFAULT_PAGE_SIZE,
    USER_LIST_MAX_FILTER_LENGTH,
    USER_LIST_SORT,
    UserListQuerySchema,
    UserRole,
} from '@timmyhub/contracts'
import type { PermissionResolver } from '@timmyhub/modules/platform/auth'

import { buildUserListOrderBy, buildUserListWhere } from '../utils/index'
import type { CreateUserRecordInput, UpdateUserRecordInput, UserWithProfile } from './users.repository'
import type { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

// Test tầng nghiệp vụ của quản trị người dùng (FEAT-USR-004/005, REQ-USR-010..013). Repository và PermissionResolver
// được thay bằng đối tượng giả: mục tiêu là **luật**, không phải Prisma — nhờ vậy khẳng định được cả những ca khó dựng
// bằng DB thật (tài khoản SUPER_ADMIN ngoài phạm vi, tự khoá chính mình, leo thang đặc quyền khi tạo user).

const NOW = new Date('2026-09-01T08:00:00.000Z')

function buildUser(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
    return {
        id: 'user-1',
        email: 'user1@timmyhub.dev',
        phone: null,
        passwordHash: 'hashed',
        googleId: null,
        facebookId: null,
        roles: [UserRole.USER],
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        isBanned: false,
        banReason: null,
        twoFactorEnabled: false,
        twoFactorSecret: 'totp-secret',
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: null,
        lastLoginIp: null,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
        profile: {
            id: 'profile-1',
            userId: 'user-1',
            firstName: 'Minh',
            lastName: 'Trần',
            displayName: 'Minh Trần',
            avatar: null,
            dateOfBirth: null,
            gender: null,
            bio: null,
            createdAt: NOW,
            updatedAt: NOW,
        },
        ...overrides,
    }
}

// Mock có kiểu tham số: nhờ vậy đọc được `mock.calls[0][0]` mà không rơi vào `any` (eslint `no-unsafe-*`).
type MockRepository = {
    listUsers: jest.Mock
    findUserById: jest.Mock
    findUserByEmail: jest.Mock
    findUserByPhone: jest.Mock
    createUser: jest.Mock<Promise<UserWithProfile>, [CreateUserRecordInput]>
    updateUser: jest.Mock<Promise<UserWithProfile>, [string, UpdateUserRecordInput, string]>
    setUserLocked: jest.Mock<
        Promise<UserWithProfile>,
        [string, { locked: boolean; reason?: string | undefined; actorId: string }]
    >
    softDeleteUser: jest.Mock<Promise<void>, [string, string]>
}

function buildService(options: { repository?: Partial<MockRepository>; permissions?: string[] } = {}) {
    const repository: MockRepository = {
        listUsers: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        findUserById: jest.fn().mockResolvedValue(null),
        findUserByEmail: jest.fn().mockResolvedValue(null),
        findUserByPhone: jest.fn().mockResolvedValue(null),
        createUser: jest.fn<Promise<UserWithProfile>, [CreateUserRecordInput]>(),
        updateUser: jest.fn<Promise<UserWithProfile>, [string, UpdateUserRecordInput, string]>(),
        setUserLocked: jest.fn<
            Promise<UserWithProfile>,
            [string, { locked: boolean; reason?: string | undefined; actorId: string }]
        >(),
        softDeleteUser: jest.fn<Promise<void>, [string, string]>(),
        ...options.repository,
    }

    const getEffectivePermissions = jest.fn().mockResolvedValue(new Set(options.permissions ?? []))
    const permissionResolver: PermissionResolver = {
        getEffectivePermissions,
        listPermissions: jest.fn().mockResolvedValue([]),
    }

    const service = new UsersService(repository as unknown as UsersRepository, permissionResolver)
    return { service, repository, getEffectivePermissions }
}

const ADMIN_ACTOR = { id: 'admin-1', roles: [UserRole.ADMIN] }
const SUPER_ADMIN_ACTOR = { id: 'root-1', roles: [UserRole.SUPER_ADMIN] }

describe('UsersService — danh sách và chi tiết', () => {
    it('không trả trường nhạy cảm ra DTO (REQ-USR-010)', async () => {
        const { service, repository } = buildService()
        repository.listUsers.mockResolvedValue({ items: [buildUser()], totalItems: 1 })

        const result = await service.listUsers({
            page: 1,
            pageSize: 20,
            sort: '-createdAt',
        })

        const item = result.items[0]
        expect(item).toBeDefined()
        expect(Object.keys(item ?? {})).not.toContain('passwordHash')
        expect(Object.keys(item ?? {})).not.toContain('twoFactorSecret')
        expect(JSON.stringify(item)).not.toContain('totp-secret')
    })

    it('tính phân trang và cờ hasNext/hasPrev theo tổng số bản ghi', async () => {
        const { service, repository } = buildService()
        repository.listUsers.mockResolvedValue({ items: [buildUser()], totalItems: 45 })

        const result = await service.listUsers({ page: 2, pageSize: 20, sort: '-createdAt' })

        expect(result.pagination).toEqual({
            page: 2,
            pageSize: 20,
            totalItems: 45,
            totalPages: 3,
            hasNext: true,
            hasPrev: true,
        })
    })

    it('coi bản ghi đã xoá mềm như không tồn tại — 404, không rò rỉ sự tồn tại', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser({ deletedAt: NOW }))

        await expect(service.getUser('user-1')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
    })

    it('chuyển tiếp bộ lọc theo cột xuống repository, không nuốt tham số nào', async () => {
        // Schema đã nhận tham số mà service quên chuyển tiếp là loại bug câm nhất của chuỗi này: URL đúng, `where`
        // đúng, chỉ có dữ liệu trả về là không lọc — nhìn màn hình không thể biết.
        const { service, repository } = buildService()

        await service.listUsers({
            page: 1,
            pageSize: 20,
            sort: '-createdAt',
            name: 'Minh',
            email: 'timmyhub.dev',
            createdFrom: '2026-08-31T17:00:00.000Z',
            createdTo: '2026-09-30T16:59:59.999Z',
        })

        // `mock.calls` không mang kiểu nên phải khai lại hình dạng: `calls[0]` là MẢNG tham số của lần gọi đầu, phần
        // tử đầu của nó mới là object tham số. Dùng `toStrictEqual` chứ không phải `toEqual` — `toEqual` bỏ qua
        // thuộc tính `undefined` nên sẽ không phát hiện được service nuốt mất một khoá, mà đó là thứ test này canh.
        const [[listArgs]] = repository.listUsers.mock.calls as [[{ filters: Record<string, unknown> }]]
        expect(listArgs.filters).toStrictEqual({
            q: undefined,
            role: undefined,
            status: undefined,
            name: 'Minh',
            email: 'timmyhub.dev',
            createdFrom: '2026-08-31T17:00:00.000Z',
            createdTo: '2026-09-30T16:59:59.999Z',
        })
    })
})

describe('buildUserListWhere — phạm vi nằm trong truy vấn (luật cứng #7)', () => {
    it('luôn loại bản ghi đã xoá mềm', () => {
        expect(buildUserListWhere({})).toEqual({ deletedAt: null })
    })

    it('ánh xạ bộ lọc trạng thái sang cột khoá thật (`isBanned`)', () => {
        expect(buildUserListWhere({ status: 'LOCKED' })).toMatchObject({ isBanned: true })
        expect(buildUserListWhere({ status: 'ACTIVE' })).toMatchObject({ isBanned: false })
    })

    it('lọc theo vai trò lớp 1 và tìm kiếm theo email/số điện thoại/hồ sơ', () => {
        const where = buildUserListWhere({ role: UserRole.SELLER, q: 'minh' })
        expect(where.roles).toEqual({ has: UserRole.SELLER })
        expect(where.OR).toHaveLength(3)
        expect(where).toMatchObject({ deletedAt: null })
    })

    it('lọc theo tên dò cả BA trường làm nên chuỗi hiển thị, không chỉ `displayName`', () => {
        // Chỉ dò `displayName` thì tài khoản chưa đặt tên hiển thị — đang hiện tên ghép từ họ và tên — sẽ không bao
        // giờ khớp dù mắt thấy đúng chữ đó trên màn hình.
        const where = buildUserListWhere({ name: 'minh' })

        expect(where.profile).toEqual({
            is: {
                OR: [
                    { displayName: { contains: 'minh', mode: 'insensitive' } },
                    { firstName: { contains: 'minh', mode: 'insensitive' } },
                    { lastName: { contains: 'minh', mode: 'insensitive' } },
                ],
            },
        })
    })

    it('lọc theo email khớp chứa và không phân biệt hoa thường', () => {
        expect(buildUserListWhere({ email: 'TimmyHub.dev' })).toMatchObject({
            email: { contains: 'TimmyHub.dev', mode: 'insensitive' },
        })
    })

    it('khoảng thời gian tạo: hai đầu mút độc lập, so sánh bằng mốc tuyệt đối', () => {
        const from = '2026-08-31T17:00:00.000Z'
        const to = '2026-09-30T16:59:59.999Z'

        // Chỉ gửi một đầu là "từ/đến mốc đó" — không tự bịa đầu còn lại.
        expect(buildUserListWhere({ createdFrom: from })).toMatchObject({ createdAt: { gte: new Date(from) } })
        expect(buildUserListWhere({ createdTo: to })).toMatchObject({ createdAt: { lte: new Date(to) } })

        expect(buildUserListWhere({ createdFrom: from, createdTo: to })).toMatchObject({
            createdAt: { gte: new Date(from), lte: new Date(to) },
        })
    })

    it('bộ lọc theo cột SIẾT THÊM chứ không thay thế ô tìm kiếm chung', () => {
        // Gõ từ khoá rồi thu hẹp tiếp bằng một cột là chuyện thường; nếu bộ lọc cột ghi đè `q` thì người dùng mất
        // luôn phần đã gõ mà không có gì báo.
        const where = buildUserListWhere({ q: 'minh', name: 'Trần', email: 'timmyhub.dev', role: UserRole.SELLER })

        expect(where.OR).toHaveLength(3)
        expect(where.profile).toStrictEqual({
            is: {
                OR: [
                    { displayName: { contains: 'Trần', mode: 'insensitive' } },
                    { firstName: { contains: 'Trần', mode: 'insensitive' } },
                    { lastName: { contains: 'Trần', mode: 'insensitive' } },
                ],
            },
        })
        expect(where.email).toEqual({ contains: 'timmyhub.dev', mode: 'insensitive' })
        expect(where.roles).toEqual({ has: UserRole.SELLER })
        expect(where).toMatchObject({ deletedAt: null })
    })

    it('không lọc gì thì `where` chỉ còn điều kiện xoá mềm', () => {
        expect(buildUserListWhere({ name: undefined, email: undefined })).toEqual({ deletedAt: null })
    })
})

describe('UserListQuerySchema — hợp đồng tham số URL của danh sách', () => {
    it('URL trống thì ra mặc định của trang', () => {
        expect(UserListQuerySchema.parse({})).toEqual({
            page: 1,
            pageSize: USER_LIST_DEFAULT_PAGE_SIZE,
            sort: USER_LIST_SORT.NEWEST,
        })
    })

    it('mốc thời gian phải là ISO ĐẦY ĐỦ có `Z`, không nhận `YYYY-MM-DD`', () => {
        expect(UserListQuerySchema.safeParse({ createdFrom: '2026-09-01T00:00:00.000Z' }).success).toBe(true)
        // Ngày trần không mang múi giờ, backend sẽ phải đoán — mà cắt ngày ở một múi khác là lệch hẳn kết quả. Giao
        // diện luôn gửi mốc tuyệt đối (xem `localDayToIso`), nên chặn ở đây là chặn đúng chỗ.
        expect(UserListQuerySchema.safeParse({ createdFrom: '2026-09-01' }).success).toBe(false)
        expect(UserListQuerySchema.safeParse({ createdTo: '2026-09-30 23:59:59' }).success).toBe(false)
    })

    it('cắt khoảng trắng thừa ở bộ lọc chữ và chặn chuỗi quá dài', () => {
        // Cắt khoảng trắng ở tầng schema để `contains` không đi tìm một chuỗi mà người dùng chưa từng thấy mình gõ.
        expect(UserListQuerySchema.parse({ name: '  Minh  ' }).name).toBe('Minh')
        expect(UserListQuerySchema.safeParse({ email: 'a'.repeat(USER_LIST_MAX_FILTER_LENGTH + 1) }).success).toBe(
            false,
        )
    })
})

describe('UsersService — sửa hồ sơ', () => {
    it('404 khi người gọi không phải SUPER_ADMIN mà đích là SUPER_ADMIN (luật cứng #8)', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser({ roles: [UserRole.SUPER_ADMIN] }))

        await expect(service.updateUser('user-1', { firstName: 'X' }, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'NOT_FOUND',
            status: 404,
        })
        expect(repository.updateUser).not.toHaveBeenCalled()
    })

    it('SUPER_ADMIN sửa được tài khoản SUPER_ADMIN khác', async () => {
        const { service, repository } = buildService()
        const target = buildUser({ roles: [UserRole.SUPER_ADMIN] })
        repository.findUserById.mockResolvedValue(target)
        repository.updateUser.mockResolvedValue({ ...target, updatedAt: NOW })

        await service.updateUser('user-1', { firstName: 'X' }, SUPER_ADMIN_ACTOR)

        expect(repository.updateUser).toHaveBeenCalledWith('user-1', { firstName: 'X' }, 'root-1')
    })

    it('không ghi DB khi không có field nào đổi (idempotent theo nội dung)', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser())

        const result = await service.updateUser('user-1', {}, ADMIN_ACTOR)

        expect(repository.updateUser).not.toHaveBeenCalled()
        expect(result.id).toBe('user-1')
    })

    it('409 khi số điện thoại đã thuộc người dùng khác', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser())
        repository.findUserByPhone.mockResolvedValue(buildUser({ id: 'user-2' }))

        await expect(service.updateUser('user-1', { phone: '0900000001' }, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'PHONE_ALREADY_REGISTERED',
            status: 409,
        })
    })
})

describe('UsersService — khoá và mở khoá (REQ-USR-012/013)', () => {
    it('422 khi tự khoá chính mình', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser({ id: 'admin-1' }))

        await expect(service.setUserLocked('admin-1', true, ADMIN_ACTOR, { reason: 'nghịch' })).rejects.toMatchObject({
            code: 'CANNOT_MODIFY_SELF',
            status: 422,
        })
        expect(repository.setUserLocked).not.toHaveBeenCalled()
    })

    it('khoá tài khoản thường: ghi isBanned + lý do, thu hồi phiên do repository lo', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser())
        repository.setUserLocked.mockResolvedValue(buildUser({ isBanned: true, banReason: 'spam' }))

        const result = await service.setUserLocked('user-1', true, ADMIN_ACTOR, { reason: 'spam' })

        expect(repository.setUserLocked).toHaveBeenCalledWith('user-1', {
            locked: true,
            reason: 'spam',
            actorId: 'admin-1',
        })
        expect(result.isBanned).toBe(true)
        expect(result.status).toBe('LOCKED')
    })

    it('mở khoá không cần lý do và xoá trạng thái khoá', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser({ isBanned: true }))
        repository.setUserLocked.mockResolvedValue(buildUser({ isBanned: false, banReason: null }))

        const result = await service.setUserLocked('user-1', false, ADMIN_ACTOR)

        expect(repository.setUserLocked).toHaveBeenCalledWith('user-1', {
            locked: false,
            reason: undefined,
            actorId: 'admin-1',
        })
        expect(result.status).toBe('ACTIVE')
    })
})

describe('UsersService — xoá mềm (REQ-USR-013 + FEAT-USR-004)', () => {
    it('không cho tự xoá chính mình', async () => {
        const { service, repository } = buildService()

        await expect(service.deleteUser('admin-1', ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'CANNOT_MODIFY_SELF',
        })
        expect(repository.softDeleteUser).not.toHaveBeenCalled()
    })

    it('xoá mềm người dùng thường', async () => {
        const { service, repository } = buildService()
        repository.findUserById.mockResolvedValue(buildUser())

        await service.deleteUser('user-1', ADMIN_ACTOR)

        expect(repository.softDeleteUser).toHaveBeenCalledWith('user-1', 'admin-1')
    })
})

describe('UsersService — tạo tài khoản', () => {
    const createInput = {
        email: 'new@timmyhub.dev',
        password: 'Abcdef12345',
        firstName: 'New',
        lastName: 'User',
    }

    it('409 khi email đã tồn tại', async () => {
        const { service, repository } = buildService()
        repository.findUserByEmail.mockResolvedValue(buildUser())

        await expect(service.createUser(createInput, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'EMAIL_ALREADY_REGISTERED',
            status: 409,
        })
    })

    it('từ chối mật khẩu phổ biến bằng cùng luật với đăng ký công khai', async () => {
        const { service, repository } = buildService()

        await expect(
            service.createUser({ ...createInput, password: 'password123' }, ADMIN_ACTOR),
        ).rejects.toMatchObject({
            code: 'WEAK_PASSWORD',
        })
        expect(repository.createUser).not.toHaveBeenCalled()
    })

    it('mặc định vai trò USER và băm mật khẩu trước khi ghi', async () => {
        const { service, repository } = buildService()
        repository.createUser.mockResolvedValue(buildUser())

        await service.createUser(createInput, ADMIN_ACTOR)

        const written = repository.createUser.mock.calls[0]?.[0]
        expect(written?.roles).toEqual([UserRole.USER])
        expect(written?.email).toBe(createInput.email)
        // bcrypt cost ≥ 12 → tiền tố `$2a$12$`/`$2b$12$`; mật khẩu trần không bao giờ được ghi xuống DB.
        expect(written?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/)
        expect(written?.passwordHash).not.toBe(createInput.password)
    })

    it('không cho ADMIN tạo tài khoản mang vai trò khác khi thiếu `identity:users:assign-role`', async () => {
        const { service, repository } = buildService({ permissions: [] })

        await expect(
            service.createUser({ ...createInput, roles: [UserRole.SELLER] }, ADMIN_ACTOR),
        ).rejects.toMatchObject({ code: 'CANNOT_ESCALATE_PRIVILEGE', status: 403 })
        expect(repository.createUser).not.toHaveBeenCalled()
    })

    it('cho phép khi người tạo có `identity:users:assign-role`', async () => {
        const { service, repository } = buildService({ permissions: ['identity:users:assign-role'] })
        repository.createUser.mockResolvedValue(buildUser({ roles: [UserRole.SELLER] }))

        await service.createUser({ ...createInput, roles: [UserRole.SELLER] }, ADMIN_ACTOR)

        expect(repository.createUser).toHaveBeenCalled()
    })

    it('chỉ SUPER_ADMIN tạo được tài khoản SUPER_ADMIN', async () => {
        const { service } = buildService({ permissions: ['identity:users:assign-role'] })

        await expect(
            service.createUser({ ...createInput, roles: [UserRole.SUPER_ADMIN] }, ADMIN_ACTOR),
        ).rejects.toMatchObject({ code: 'CANNOT_ESCALATE_PRIVILEGE' })
    })

    it('409 khi số điện thoại đã dùng', async () => {
        const { service, repository } = buildService()
        repository.findUserByPhone.mockResolvedValue(buildUser({ id: 'user-2' }))

        await expect(service.createUser({ ...createInput, phone: '0900000001' }, ADMIN_ACTOR)).rejects.toMatchObject({
            code: 'PHONE_ALREADY_REGISTERED',
        })
    })
})

describe('buildUserListOrderBy — sắp xếp cả bảng, không phải trong một trang', () => {
    it('mọi giá trị `sort` của contracts đều có ánh xạ (không rơi về thứ tự tuỳ tiện của DB)', () => {
        for (const sort of Object.values(USER_LIST_SORT)) {
            expect(buildUserListOrderBy(sort).length).toBeGreaterThan(0)
        }
    })

    it('luôn kèm khoá phụ `id` để phân trang ổn định khi nhiều bản ghi trùng giá trị sắp xếp', () => {
        for (const sort of Object.values(USER_LIST_SORT)) {
            expect(buildUserListOrderBy(sort)).toContainEqual({ id: 'asc' })
        }
    })

    it('hai chiều của cùng một cột ngược nhau', () => {
        expect(buildUserListOrderBy(USER_LIST_SORT.EMAIL_ASC)[0]).toEqual({ email: 'asc' })
        expect(buildUserListOrderBy(USER_LIST_SORT.EMAIL_DESC)[0]).toEqual({ email: 'desc' })
    })

    it('cột họ tên xếp theo `profile.displayName` — đúng khoá mà giao diện dùng để so sánh', () => {
        expect(buildUserListOrderBy(USER_LIST_SORT.NAME_ASC)[0]).toEqual({ profile: { displayName: 'asc' } })
        expect(buildUserListOrderBy(USER_LIST_SORT.NAME_DESC)[0]).toEqual({ profile: { displayName: 'desc' } })
    })

    it('cột trạng thái xếp theo `isBanned`: ACTIVE (false) đứng trước LOCKED (true) khi tăng dần', () => {
        expect(buildUserListOrderBy(USER_LIST_SORT.STATUS_ASC)[0]).toEqual({ isBanned: 'asc' })
        expect(buildUserListOrderBy(USER_LIST_SORT.STATUS_DESC)[0]).toEqual({ isBanned: 'desc' })
    })

    it('mặc định mới nhất trước', () => {
        expect(buildUserListOrderBy(USER_LIST_SORT.NEWEST)[0]).toEqual({ createdAt: 'desc' })
    })
})

describe('ApiError của tầng người dùng', () => {
    it('mọi lỗi nghiệp vụ đều mang mã + HTTP status để filter dịch theo locale', () => {
        const error = new ApiError('CANNOT_MODIFY_SELF')
        expect(error.status).toBe(422)
        expect(error.messageKey).toBe('error.CANNOT_MODIFY_SELF')
    })
})
