import { useTranslations } from 'next-intl'

import type { UserRole } from '@timmyhub/contracts'

import { Badge } from '@/components/ui'
import { ROLE_BADGE_VARIANT, ROLE_LABEL_KEY } from '@/constants'
import { cn } from '@/utils'

interface RoleBadgesProps {
    roles: readonly UserRole[]
    className?: string
}

// Danh sách badge vai trò, nhãn lấy từ namespace i18n `role`. 7 trạng thái: mặc định · rỗng (không có role → không
// render) · còn lại N/A — chỉ hiển thị.
export function RoleBadges({ roles, className }: RoleBadgesProps) {
    // ===== Hooks =====
    const t = useTranslations('role')

    if (roles.length === 0) return null

    return (
        <div className={cn('flex flex-wrap justify-center gap-1', className)}>
            {roles.map((role) => (
                <Badge
                    key={role}
                    variant={ROLE_BADGE_VARIANT[role]}
                    className={
                        ROLE_BADGE_VARIANT[role] === 'destructive'
                            ? 'bg-destructive text-white'
                            : ROLE_BADGE_VARIANT[role] === 'default'
                              ? 'text-white'
                              : 'border-transparent bg-zinc-700 text-white dark:bg-zinc-600'
                    }
                >
                    {t(ROLE_LABEL_KEY[role])}
                </Badge>
            ))}
        </div>
    )
}
