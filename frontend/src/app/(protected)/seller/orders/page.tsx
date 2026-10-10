import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { OrderDetail } from '@timmyhub/contracts'
import { PageContainer } from '@/components'
import { SELLER_ORDER_TAB } from '@/constants'
import { getOrderByIdAction } from '@/features/checkout'
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

    let initialDetail: OrderDetail | null = null
    if (tabs.active.tab === SELLER_ORDER_TAB.DETAIL) {
        const detailRes = await getOrderByIdAction(tabs.active.id)
        if (detailRes.ok) {
            initialDetail = detailRes.data
        }
    }

    const res = await getSellerOrdersAction()
    const rows = res.ok ? res.data : []
    const error = res.ok
        ? undefined
        : res.code === 'FORBIDDEN'
          ? 'Bạn chưa có hồ sơ người bán hoặc chưa được duyệt.'
          : 'Không thể tải danh sách đơn hàng.'

    return (
        <PageContainer>
            <SellerOrdersView
                rows={rows}
                tabs={tabs}
                currentUserId={actor?.userId || ''}
                initialDetail={initialDetail}
                error={error}
            />
        </PageContainer>
    )
}
