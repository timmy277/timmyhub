import { useTranslations } from 'next-intl'

import { PageContainer } from '@/components'

// Khung giữ chỗ cho dashboard — thay bằng widget thật khi có spec. Các ô `bg-muted/50` là vị trí widget tương lai,
// không phải skeleton đang tải nên không dùng `Skeleton` (không có nhịp nhấp nháy).
export function DashboardPage() {
    // ===== Hooks =====
    const t = useTranslations('dashboard')

    return (
        <PageContainer title={t('pageTitle')} description={t('pageDescription')}>
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-[50svh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </PageContainer>
    )
}
