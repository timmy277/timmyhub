import { UserRole } from '@timmyhub/contracts'

import type { BadgeVariant } from '@/types'

// Key nhãn role trong namespace `role` của catalog i18n. `satisfies Record<UserRole, …>` bắt lỗi biên dịch khi
// contracts thêm role mới mà chưa có nhãn.
export const ROLE_LABEL_KEY = {
    [UserRole.SUPER_ADMIN]: 'superAdmin',
    [UserRole.ADMIN]: 'admin',
    [UserRole.MODERATOR]: 'moderator',
    [UserRole.SELLER]: 'seller',
    [UserRole.BRAND]: 'brand',
    [UserRole.USER]: 'user',
    [UserRole.SHIPPER]: 'shipper',
} as const satisfies Record<UserRole, string>

// Màu badge theo mức quyền: quản trị (đỏ) → vận hành/kinh doanh (primary) → hỗ trợ (secondary) → người dùng (viền).
export const ROLE_BADGE_VARIANT = {
    [UserRole.SUPER_ADMIN]: 'destructive',
    [UserRole.ADMIN]: 'destructive',
    [UserRole.MODERATOR]: 'secondary',
    [UserRole.SELLER]: 'default',
    [UserRole.BRAND]: 'default',
    [UserRole.USER]: 'outline',
    [UserRole.SHIPPER]: 'secondary',
} as const satisfies Record<UserRole, BadgeVariant>
