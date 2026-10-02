import { z } from 'zod'

import { PasswordSchema } from './auth.schema'
import { apiMessageKey } from './i18n/translate'
import { UserRoleSchema, type UserRole } from './roles'

// Zod DTO cho API quản trị người dùng (/v1/identity/users) — nguồn validation duy nhất (CLAUDE.md luật #15), dùng
// chung FE/BE. Truy vết: FEAT-USR-004 (admin CRUD user), FEAT-USR-005 (khoá/mở khoá), REQ-USR-010..REQ-USR-013.

// Mã HTTP + tham số trong url của danh sách theo docs/01-architecture/api-conventions.md §3.2/§6.
export const USER_LIST_DEFAULT_PAGE_SIZE = 20
export const USER_LIST_MAX_PAGE_SIZE = 100
export const USER_LIST_MAX_QUERY_LENGTH = 100

// Trạng thái quản trị của một tài khoản. Không dùng `isActive` (cột đó chưa được tầng xác thực đọc) — khoá/mở khoá
// thật sự nằm ở `isBanned` (AuthService.login chặn bằng mã ACCOUNT_BANNED) và `lockedUntil` (tạm khoá tự hết hạn).
export const UserStatus = {
    ACTIVE: 'ACTIVE',
    LOCKED: 'LOCKED',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]
export const UserStatusSchema = z.enum(UserStatus)

// Giá trị `sort` của danh sách. Mỗi cột sắp xếp được phía server cần **cả hai** chiều, vì tiêu đề cột đảo chiều tại
// chỗ chứ không mở thêm lựa chọn; tên khoá nói rõ chiều (`_ASC`/`_DESC`) để không phải nhớ quy ước dấu `-`.
// Không có mục nào cho cột `roles`: mảng vai trò không sắp xếp được trên SQL nên cột đó không cho bấm
// (xem `users.columns.tsx`).
export const USER_LIST_SORT = {
    NEWEST: '-createdAt',
    OLDEST: 'createdAt',
    NAME_ASC: 'name',
    NAME_DESC: '-name',
    EMAIL_ASC: 'email',
    EMAIL_DESC: '-email',
    STATUS_ASC: 'status',
    STATUS_DESC: '-status',
    // `lastLoginAt` là cột **có thể NULL** (tài khoản chưa đăng nhập lần nào). Postgres đẩy NULL xuống cuối khi ASC
    // và lên đầu khi DESC, nên hai chiều này đọc theo đúng nghĩa: ASC = "lâu rồi không vào" trước, DESC = "vào gần
    // đây nhất" trước rồi mới tới nhóm chưa từng đăng nhập.
    LAST_LOGIN_ASC: 'lastLoginAt',
    LAST_LOGIN_DESC: '-lastLoginAt',
} as const
export type UserListSort = (typeof USER_LIST_SORT)[keyof typeof USER_LIST_SORT]
export const UserListSortSchema = z.enum(USER_LIST_SORT)

// Số điện thoại Việt Nam: bắt đầu bằng 0, tổng 10 chữ số. Cột `User.phone` là `@unique` nên trùng số trả 409.
const PhoneSchema = z
    .string()
    .regex(/^0\d{9}$/, apiMessageKey('validation.phoneInvalid'))
    .max(20, apiMessageKey('validation.phoneInvalid'))

const PersonNameSchema = (key: 'validation.firstNameRequired' | 'validation.lastNameRequired') =>
    z.string().trim().min(1, apiMessageKey(key)).max(100, apiMessageKey(key))

// GET /v1/identity/users — mọi tham số đi qua URL để phân trang/lọc do server làm (api-conventions §6).
//
// `name`/`email`/`createdFrom`/`createdTo` là **bộ lọc theo cột** (menu lọc ở tiêu đề bảng), tách khỏi `q` (ô tìm kiếm
// chung): `q` quét nhiều trường cùng lúc còn các tham số này chỉ siết một cột. Chúng AND với nhau và AND với `q` —
// người dùng gõ từ khoá rồi thu hẹp tiếp bằng một cột là chuyện thường, không phải thay thế nhau.
//
// Vì sao là tham số rời chứ không phải một chuỗi JSON của AG Grid: URL phải gõ tay được, đọc được, và **validate được**
// bằng chính schema này. Nhét filter model của thư viện vào query string thì backend phải hiểu định dạng riêng của
// thư viện, và mọi tham số đều thành `unknown`.
export const USER_LIST_MAX_FILTER_LENGTH = 100

export const UserListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(USER_LIST_MAX_PAGE_SIZE).default(USER_LIST_DEFAULT_PAGE_SIZE),
    q: z.string().trim().max(USER_LIST_MAX_QUERY_LENGTH).optional(),
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
    // Khớp họ tên đang HIỂN THỊ ở cột "Tên" — mà cột đó lấy `displayName`, thiếu thì ghép `lastName + firstName`
    // (xem `getUserDisplayName`), nên phải dò cả ba trường. Giới hạn đã biết: gõ một đoạn vắt qua ranh giới hai
    // trường (vd họ "Nguyễn Văn" + tên "An", gõ "Văn An") sẽ không khớp vì Prisma không nối chuỗi trong `where`.
    name: z.string().trim().max(USER_LIST_MAX_FILTER_LENGTH).optional(),
    email: z.string().trim().max(USER_LIST_MAX_FILTER_LENGTH).optional(),
    // Khoảng thời gian tạo tài khoản, ISO-8601 **đầy đủ có `Z`** (mốc tuyệt đối), không phải `YYYY-MM-DD`: giao diện
    // cho chọn theo giờ địa phương còn dữ liệu lưu UTC, nên cắt theo ngày ở backend sẽ lệch múi giờ. Gửi mốc tuyệt
    // đối thì không có gì phải đoán.
    createdFrom: z.iso.datetime().optional(),
    createdTo: z.iso.datetime().optional(),
    sort: UserListSortSchema.default(USER_LIST_SORT.NEWEST),
})
export type UserListQuery = z.infer<typeof UserListQuerySchema>

// POST /v1/identity/users — `identity:users:create`. Gán role lúc tạo cần thêm `identity:users:assign-role` (trừ khi
// chỉ để mặc định USER), nếu không thì người tạo vượt được quyền của chính mình (rbac-advanced.md §7).
export const CreateUserSchema = z.object({
    email: z.string().email(apiMessageKey('validation.emailInvalid')),
    password: PasswordSchema,
    firstName: PersonNameSchema('validation.firstNameRequired'),
    lastName: PersonNameSchema('validation.lastNameRequired'),
    phone: PhoneSchema.optional(),
    avatar: z.string().trim().nullable().optional(),
    roles: z.array(UserRoleSchema).min(1, apiMessageKey('validation.rolesRequired')).optional(),
})
export type CreateUserInput = z.infer<typeof CreateUserSchema>

// PATCH /v1/identity/users/:userId — `identity:users:update`, sửa hồ sơ thay người dùng (hỗ trợ).
// `phone: null` là xoá số điện thoại; gửi object rỗng là no-op không ghi DB.
// PATCH user profile and, with identity:users:assign-role, assigned roles.
export const UpdateUserSchema = z.object({
    firstName: PersonNameSchema('validation.firstNameRequired').optional(),
    lastName: PersonNameSchema('validation.lastNameRequired').optional(),
    displayName: z.string().trim().min(1, apiMessageKey('validation.displayNameRequired')).max(100).optional(),
    phone: PhoneSchema.nullable().optional(),
    avatar: z.string().trim().nullable().optional(),
    roles: z.array(UserRoleSchema).min(1, apiMessageKey('validation.rolesRequired')).optional(),
})
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// POST /v1/identity/users/:userId/lock — `identity:users:lock`. Lý do bắt buộc: có lý do mới giải thích được cho
// người bị khoá và cho audit (rbac-advanced.md §7).
export const LockUserSchema = z.object({
    reason: z.string().trim().min(1, apiMessageKey('validation.reasonRequired')).max(500),
})
export type LockUserInput = z.infer<typeof LockUserSchema>

// ===== Kiểu phản hồi =====

export type UserProfileSummary = {
    firstName: string
    lastName: string
    displayName: string | null
    avatar: string | null
}

export type UserSummary = {
    id: string
    email: string
    phone: string | null
    roles: UserRole[]
    status: UserStatus
    isEmailVerified: boolean
    isPhoneVerified: boolean
    // Tạm khoá do đăng nhập sai (REQ-IDN-029) — khác `status` LOCKED (khoá bởi admin).
    lockedUntil: string | null
    lastLoginAt: string | null
    createdAt: string
    profile: UserProfileSummary | null
}

// Chi tiết chỉ trả thêm cho người có `identity:users:read`. Không bao giờ có `passwordHash`/`twoFactorSecret`
// (REQ-USR-010).
export type UserDetail = UserSummary & {
    isBanned: boolean
    banReason: string | null
    twoFactorEnabled: boolean
    updatedAt: string
}

export type UserPagination = {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export type UserListResult = {
    items: UserSummary[]
    pagination: UserPagination
}
