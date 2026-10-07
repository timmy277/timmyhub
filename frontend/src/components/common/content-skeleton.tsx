import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui'
import { AgGridTableSkeleton } from '@/components/common'

// Skeleton cho vùng nội dung trang quản lý (products, categories, users…).
// NavLayout (sidebar + header) giữ nguyên khi chuyển trang — chỉ vùng <main> bị thay bằng loading.tsx,
// nên skeleton này chỉ phủ content, appbar/sidebar không nhấp nháy.
export async function ContentSkeleton() {
    const t = await getTranslations('common')
    return (
        <div role="status" aria-busy className="flex flex-1 flex-col gap-4 p-4" aria-label={t('loading')}>
            {/* Tabs bar — giống ProductTabs/CategoryTabs */}
            <div className="flex gap-1 border-b">
                <Skeleton className="h-9 w-32 rounded-b-none" />
                <Skeleton className="h-9 w-28 rounded-b-none" />
            </div>
            {/* Page header — tiêu đề + actions */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-9 w-28" />
            </div>
            {/* Table skeleton */}
            <AgGridTableSkeleton />
            <span className="sr-only">{t('loading')}</span>
        </div>
    )
}
