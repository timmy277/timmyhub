import type { UserListQuery } from '@timmyhub/contracts'
import type { Prisma } from '@timmyhub/prisma'

// Điều kiện lọc của danh sách người dùng — hàm thuần (CLAUDE.md luật #22: hàm thuần ở `utils/`), tách khỏi repository
// để kiểm chứng được "phạm vi nằm trong câu truy vấn" (luật cứng #7: lọc trong `where`, không `.filter()` sau khi đã
// lấy dữ liệu — lọc sau sẽ rò rỉ tổng số bản ghi qua phân trang).
export function buildUserListWhere(
    filters: Pick<UserListQuery, 'q' | 'role' | 'status' | 'name' | 'email' | 'createdFrom' | 'createdTo'>,
): Prisma.UserWhereInput {
    // Bản ghi đã xoá mềm không bao giờ thuộc danh sách, kể cả với SUPER_ADMIN.
    const where: Prisma.UserWhereInput = { deletedAt: null }

    if (filters.status) {
        // `status` là trạng thái quản trị (khoá bởi admin) → ánh xạ sang cột `isBanned`, thứ AuthService.login chặn.
        where.isBanned = filters.status === 'LOCKED'
    }

    if (filters.role) {
        // Lớp 1 (enum trên `User`) là tập hiển thị và cũng là tập đi vào JWT — lọc theo nó, không theo bảng role động.
        where.roles = { has: filters.role }
    }

    if (filters.q) {
        where.OR = [
            { email: { contains: filters.q, mode: 'insensitive' } },
            { phone: { contains: filters.q } },
            {
                profile: {
                    is: {
                        OR: [
                            { firstName: { contains: filters.q, mode: 'insensitive' } },
                            { lastName: { contains: filters.q, mode: 'insensitive' } },
                            { displayName: { contains: filters.q, mode: 'insensitive' } },
                        ],
                    },
                },
            },
        ]
    }

    // ===== Bộ lọc theo cột =====
    // AND với `q` và với nhau (mọi khoá ở đây là `AND` ngầm của Prisma) — đây là điều kiện siết thêm, không thay thế
    // ô tìm kiếm chung.

    if (filters.name) {
        // Phải dò đúng ba trường mà cột "Tên" dùng để dựng chuỗi hiển thị (`getUserDisplayName`): chỉ dò `displayName`
        // thì tài khoản chưa đặt tên hiển thị — đang hiện tên ghép từ họ và tên — sẽ không bao giờ khớp dù mắt thấy
        // chữ đó trên màn hình.
        where.profile = {
            is: {
                OR: [
                    { displayName: { contains: filters.name, mode: 'insensitive' } },
                    { firstName: { contains: filters.name, mode: 'insensitive' } },
                    { lastName: { contains: filters.name, mode: 'insensitive' } },
                ],
            },
        }
    }

    if (filters.email) {
        where.email = { contains: filters.email, mode: 'insensitive' }
    }

    if (filters.createdFrom || filters.createdTo) {
        // Hai đầu mút độc lập: chỉ gửi `createdFrom` là "từ mốc đó trở đi", chỉ gửi `createdTo` là "tới mốc đó".
        // Mốc đã là ISO đầy đủ có `Z` nên so sánh trực tiếp được, không phải cắt ngày.
        where.createdAt = {
            ...(filters.createdFrom ? { gte: new Date(filters.createdFrom) } : {}),
            ...(filters.createdTo ? { lte: new Date(filters.createdTo) } : {}),
        }
    }

    return where
}

// `sort` → `orderBy` của Prisma. Bảng đầy đủ theo `Record` để contracts thêm giá trị mới là **lỗi biên dịch** ngay,
// thay vì rơi về `undefined` rồi Prisma trả dữ liệu theo thứ tự tuỳ tiện.
//
// Mọi mục đều kèm khoá phụ `id` để phân trang ổn định khi nhiều bản ghi cùng giá trị sắp xếp — thiếu nó thì một bản
// ghi có thể xuất hiện hai lần hoặc bị bỏ qua giữa hai trang.
//
// `name` xếp theo `profile.displayName` chứ không theo tên đã ghép ở giao diện: đây là cột dữ liệu thật, và tài khoản
// chưa có hồ sơ thì `displayName` là NULL — Postgres đẩy NULL xuống cuối khi ASC và lên đầu khi DESC, giao diện mô
// phỏng đúng quy tắc đó bằng `comparator` của cột (xem `users.columns.tsx`).
const ORDER_BY: Record<UserListQuery['sort'], Prisma.UserOrderByWithRelationInput[]> = {
    '-createdAt': [{ createdAt: 'desc' }, { id: 'asc' }],
    createdAt: [{ createdAt: 'asc' }, { id: 'asc' }],
    name: [{ profile: { displayName: 'asc' } }, { id: 'asc' }],
    '-name': [{ profile: { displayName: 'desc' } }, { id: 'asc' }],
    email: [{ email: 'asc' }, { id: 'asc' }],
    '-email': [{ email: 'desc' }, { id: 'asc' }],
    status: [{ isBanned: 'asc' }, { id: 'asc' }],
    '-status': [{ isBanned: 'desc' }, { id: 'asc' }],
    // `lastLoginAt` NULL = chưa từng đăng nhập. Không khai `nulls` nên Prisma dùng mặc định của Postgres (NULLS LAST
    // khi ASC, NULLS FIRST khi DESC) — giao diện mô phỏng đúng quy tắc đó bằng `comparator` của cột
    // (xem `compareNullableString` trong `users.columns.tsx`), nếu không thì lưới xáo 20 dòng của trang theo một
    // thứ tự khác với thứ tự server vừa trả về.
    lastLoginAt: [{ lastLoginAt: 'asc' }, { id: 'asc' }],
    '-lastLoginAt': [{ lastLoginAt: 'desc' }, { id: 'asc' }],
}

export function buildUserListOrderBy(sort: UserListQuery['sort']): Prisma.UserOrderByWithRelationInput[] {
    return ORDER_BY[sort]
}
