import { useTranslations } from 'next-intl'

import { Spinner } from '@/components'

// Spinner thay cho skeleton — nhẹ hơn (1 SVG), AuthLayout vẫn giữ nền lưới phía sau.
export default function AuthLoading() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div
            role="status"
            aria-busy
            className="auth-card flex w-full items-center justify-center rounded-[28px] p-8 sm:p-10"
        >
            <span className="sr-only">{t('loading')}</span>
            <Spinner className="size-8" />
        </div>
    )
}
