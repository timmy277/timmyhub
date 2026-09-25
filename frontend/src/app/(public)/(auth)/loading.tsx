import { useTranslations } from 'next-intl'

import { Skeleton } from '@/components'

// Skeleton đúng khung `AuthCard` (logo, tiêu đề, 2 field, nút) — AuthLayout vẫn giữ nền lưới phía sau.
export default function AuthLoading() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div role="status" aria-busy className="auth-card flex w-full flex-col gap-4 rounded-[28px] p-8 sm:p-10">
            <span className="sr-only">{t('loading')}</span>
            <Skeleton className="mx-auto h-8 w-36" />
            <Skeleton className="mx-auto mb-4 h-8 w-56 max-w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    )
}
