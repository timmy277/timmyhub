import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

// Card dùng chung cho các màn auth: viền gradient phía trên, logo + tên brand, tiêu đề ở giữa.
// Dùng chung để login và register sau này không lệch nhau.
export function AuthCard({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: ReactNode
}) {
    const t = useTranslations('nav')

    return (
        <div className="auth-card w-full rounded-[28px] p-8 shadow-sm sm:p-10">
            <div className="mb-6 flex items-center justify-center gap-2.5">
                <div
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground"
                >
                    T
                </div>
                <span className="text-xl font-bold tracking-wide">{t('brand')}</span>
            </div>

            <div className="mb-8 text-center">
                <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
                {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            </div>

            {children}
        </div>
    )
}
