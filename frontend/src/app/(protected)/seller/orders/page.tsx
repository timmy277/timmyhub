import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PageContainer } from '@/components'
import { getSellerOrdersAction, parseSellerOrderTabs, SellerOrdersView } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('seller')
    return { title: t('ordersMetaTitle') }
}

interface SellerOrdersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellerOrdersPage({ searchParams }: SellerOrdersPageProps) {
    const params = await searchParams
    const tabs = parseSellerOrderTabs(params)
    const actor = await getActor()

    const res = await getSellerOrdersAction()
    const rows = res.ok ? res.data : []
    const error = res.ok
        ? undefined
        : res.code === 'FORBIDDEN'
          ? 'Bạn chưa có hồ sơ người bán hoặc chưa được duyệt.'
          : 'Không thể tải danh sách đơn hàng.'

    return (
        <PageContainer
            title="Quản lý đơn hàng"
            description="Theo dõi, đóng gói và xử lý đơn hàng của gian hàng bạn trên TimmyHub."
        >
            <SellerOrdersView rows={rows} tabs={tabs} currentUserId={actor?.userId || ''} error={error} />
        </PageContainer>
    )
}
