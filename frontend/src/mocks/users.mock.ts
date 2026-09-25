import { UserRole } from '@timmyhub/contracts'

import type { DemoUser } from '@/types'

// Dữ liệu giả cho bảng quản trị user bản demo — xoá khi có API identity.

// 199 người + super admin = 200 dòng, đủ nhiều trang để thử phân trang.
const MOCK_USER_COUNT = 199
const MOCK_EMAIL_DOMAIN = 'timmyhub.dev'

// Độ trễ giả lập khi "làm mới" danh sách, đủ để thấy trạng thái đang tải.
export const MOCK_USERS_LATENCY_MS = 600

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi']
const FIRST_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Khánh', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quân', 'Trang']
const ROLE_SETS: UserRole[][] = [
    [UserRole.USER],
    [UserRole.USER, UserRole.SELLER],
    [UserRole.USER],
    [UserRole.USER, UserRole.SHIPPER],
    [UserRole.USER, UserRole.SELLER],
    [UserRole.MODERATOR],
    [UserRole.USER, UserRole.BRAND],
    [UserRole.ADMIN],
    [UserRole.USER],
]

const SUPER_ADMIN_USER: DemoUser = {
    id: 'usr-001',
    email: `timmy@${MOCK_EMAIL_DOMAIN}`,
    profile: { firstName: 'Hub', lastName: 'Timmy', avatarUrl: null },
    roles: [UserRole.SUPER_ADMIN],
    isActive: true,
    createdAt: '2025-01-01',
}

const toAscii = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()

// Sinh tất định (không `Math.random`) để mỗi lần làm mới ra cùng bộ dữ liệu, dễ thử lọc/sắp xếp.
export function createMockUsers(): DemoUser[] {
    const users = Array.from({ length: MOCK_USER_COUNT }, (_, index): DemoUser => {
        const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
        const lastName = LAST_NAMES[(index * 3) % LAST_NAMES.length]
        const month = String((index % 12) + 1).padStart(2, '0')
        const day = String(((index * 5) % 28) + 1).padStart(2, '0')
        return {
            id: `usr-${String(index + 2).padStart(3, '0')}`,
            email: `${toAscii(firstName)}.${toAscii(lastName)}${index + 1}@${MOCK_EMAIL_DOMAIN}`,
            profile: index % 9 === 4 ? null : { firstName, lastName, avatarUrl: null },
            roles: ROLE_SETS[index % ROLE_SETS.length],
            isActive: index % 6 !== 3,
            createdAt: `${2025 + (index % 2)}-${month}-${day}`,
        }
    })

    return [SUPER_ADMIN_USER, ...users]
}
