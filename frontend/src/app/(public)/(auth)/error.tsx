'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { ErrorState } from '@/components'
import type { RouteErrorProps } from '@/types'

// Error boundary cho các màn auth — hiện trong AuthLayout, cùng khung card với form.
export default function AuthError({ error, retry }: RouteErrorProps) {
    // ===== Hooks =====
    const t = useTranslations('common')

    // ===== Effects =====
    // Ghi lỗi ra console trình duyệt — chưa có dịch vụ theo dõi lỗi; thay khi tích hợp.
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="auth-card w-full rounded-[28px] p-8 sm:p-10">
            <ErrorState
                description={error.digest ? t('errorDigest', { digest: error.digest }) : t('errorDescription')}
                onRetry={retry}
            />
        </div>
    )
}
