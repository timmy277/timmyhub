import type { Metadata } from 'next'

import type { SellerApplicationDetail, SellerApplicationQuery } from '@timmyhub/contracts'
import { ResourceStatus } from '@timmyhub/contracts'

import { PageContainer } from '@/components'
import { SELLER_APPLICATION_TAB } from '@/constants'
import {
    getSellerApplicationDetailAdminAction,
    listSellerApplicationsAdminAction,
    parseSellerTabs,
    SellerApplicationsAdminView,
} from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

export const metadata: Metadata = {
    title: 'Duyệt đơn đăng ký bán hàng · TimmyHub',
}

interface SellerApplicationsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellerApplicationsPage({ searchParams }: SellerApplicationsPageProps) {
    const params = await searchParams
    const tabs = parseSellerTabs(params)
    const actor = await getActor()

    const page = typeof params.page === 'string' ? Math.max(1, Number(params.page) || 1) : 1
    const pageSize = typeof params.pageSize === 'string' ? Math.max(1, Number(params.pageSize) || 20) : 20
    const rawStatus = typeof params.status === 'string' ? params.status : undefined
    const status =
        rawStatus === ResourceStatus.PENDING ||
        rawStatus === ResourceStatus.APPROVED ||
        rawStatus === ResourceStatus.REJECTED
            ? rawStatus
            : undefined
    const q = typeof params.q === 'string' && params.q.trim() ? params.q.trim() : undefined

    const query: SellerApplicationQuery = { page, pageSize, status, q }

    const res = await listSellerApplicationsAdminAction(query)
    const rows = res.ok ? res.data.items : []
    const totalItems = res.ok ? res.data.totalItems : 0

    let initialDetail: SellerApplicationDetail | null = null
    if (tabs.active.tab === SELLER_APPLICATION_TAB.DETAIL) {
        const detailId = tabs.active.id
        const found = rows.find((r) => r.id === detailId)
        if (found) {
            initialDetail = found
        } else {
            const detailRes = await getSellerApplicationDetailAdminAction(detailId)
            if (detailRes.ok) {
                initialDetail = detailRes.data
            }
        }
    }

    return (
        <PageContainer>
            <SellerApplicationsAdminView
                rows={rows}
                totalItems={totalItems}
                query={query}
                tabs={tabs}
                currentUserId={actor?.userId ?? ''}
                initialDetail={initialDetail}
            />
        </PageContainer>
    )
}
