import { useTranslations } from 'next-intl'

import { Skeleton } from '@/components'

// Khung chờ khi chuyển trang trong nhóm protected: NavLayout (layout) giữ nguyên, chỉ vùng nội dung hiện skeleton
// cùng bố cục với `PageContainer` (tiêu đề + mô tả + khối nội dung) để không nhảy layout khi trang thật hiện ra.
export default function ProtectedLoading() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div role="status" aria-busy className="flex flex-1 flex-col gap-4 p-4">
            <span className="sr-only">{t('loading')}</span>
            <div className="flex flex-col gap-1">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <Skeleton className="min-h-[50svh] flex-1 rounded-xl" />
        </div>
    )
}
