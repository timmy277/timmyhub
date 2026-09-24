// Role gán được cho tài khoản — khớp `enum UserRole` ở docs/00-overview/roles-and-permissions.md (bỏ `GUEST` vì
// khách chưa có tài khoản). Khi có `@timmyhub/contracts` thì import enum từ đó thay cho khai báo tạm ở đây.
export const USER_ROLES = ['USER', 'SELLER', 'SHIPPER', 'ADMIN', 'SUPER_ADMIN'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface DemoUserProfile {
    firstName: string
    lastName: string
    avatarUrl: string | null
}

// Hình dạng giống `User` của TimmyHub gốc: profile có thể chưa tạo, một user giữ nhiều role.
export interface DemoUser {
    id: string
    email: string
    profile: DemoUserProfile | null
    roles: UserRole[]
    isActive: boolean
    createdAt: string
}

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi']
const FIRST_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khánh', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quân', 'Trang']
const ROLE_SETS: UserRole[][] = [
    ['USER'],
    ['USER', 'SELLER'],
    ['USER'],
    ['USER', 'SHIPPER'],
    ['USER', 'SELLER'],
    ['ADMIN'],
    ['USER'],
]

const toAscii = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()

// Sinh tất định (không `Math.random`) để mỗi lần làm mới ra cùng bộ dữ liệu, dễ thử lọc/sắp xếp.
export function createMockUsers(): DemoUser[] {
    const users = Array.from({ length: 32 }, (_, index): DemoUser => {
        const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
        const lastName = LAST_NAMES[(index * 3) % LAST_NAMES.length]
        const month = String((index % 12) + 1).padStart(2, '0')
        const day = String(((index * 5) % 28) + 1).padStart(2, '0')
        return {
            id: `usr-${String(index + 2).padStart(3, '0')}`,
            email: `${toAscii(firstName)}.${toAscii(lastName)}${index + 1}@timmyhub.dev`,
            profile: index % 9 === 4 ? null : { firstName, lastName, avatarUrl: null },
            roles: ROLE_SETS[index % ROLE_SETS.length],
            isActive: index % 6 !== 3,
            createdAt: `${2025 + (index % 2)}-${month}-${day}`,
        }
    })

    return [
        {
            id: 'usr-001',
            email: 'timmy@timmyhub.dev',
            profile: { firstName: 'Hub', lastName: 'Timmy', avatarUrl: null },
            roles: ['SUPER_ADMIN'],
            isActive: true,
            createdAt: '2025-01-01',
        },
        ...users,
    ]
}
