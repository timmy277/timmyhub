'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { ErrorState } from '@/components'
import type { RouteErrorProps } from '@/types'

// Error boundary cho mọi trang protected — NavLayout vẫn hiển thị, người dùng điều hướng sang trang khác được.
export default function ProtectedError({ error, retry }: RouteErrorProps) {
    // ===== Hooks =====
    const t = useTranslations('common')

    // ===== Effects =====
    // Ghi lỗi ra console trình duyệt — chưa có dịch vụ theo dõi lỗi; thay khi tích hợp.
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-1 flex-col p-4">
            <ErrorState
                className="flex-1"
                description={error.digest ? t('errorDigest', { digest: error.digest }) : t('errorDescription')}
                onRetry={retry}
            />
        </div>
    )
}
