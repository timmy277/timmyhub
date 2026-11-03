import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageContainer } from '@/components'
import { WITHDRAWAL_STATUS, WITHDRAWAL_TAB } from '@/constants'
import { AdminWithdrawalsView, listAdminWithdrawalsAction, parseWithdrawalTabs } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('adminWithdrawals')
    return { title: t('metaTitle') }
}

interface AdminWithdrawalsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminWithdrawalsPage({ searchParams }: AdminWithdrawalsPageProps) {
    const params = await searchParams
    const tabs = parseWithdrawalTabs(params)
    const actor = await getActor()

    const page = typeof params.page === 'string' ? Math.max(1, Number(params.page) || 1) : 1
    const pageSize = typeof params.pageSize === 'string' ? Math.max(1, Number(params.pageSize) || 20) : 20
    const rawStatus = typeof params.status === 'string' ? params.status : undefined
    const status =
        rawStatus === WITHDRAWAL_STATUS.REQUESTED ||
        rawStatus === WITHDRAWAL_STATUS.PAID ||
        rawStatus === WITHDRAWAL_STATUS.REJECTED
            ? rawStatus
            : undefined
    const q = typeof params.q === 'string' && params.q.trim() ? params.q.trim() : undefined

    const res = await listAdminWithdrawalsAction(status, page, pageSize, q)
    const initialItems = res.ok && res.data ? res.data.items : []
    const initialTotal = res.ok && res.data ? res.data.total : 0

    // Nếu tab detail đang mở mà không có trong trang danh sách hiện tại thì lấy chi tiết
    let initialDetail = null
    const { active } = tabs
    if (active.tab === WITHDRAWAL_TAB.DETAIL) {
        const found = initialItems.find((i) => i.id === active.id)
        if (found) {
            initialDetail = found
        }
    }

    return (
        <PageContainer>
            <AdminWithdrawalsView
                rows={initialItems}
                totalItems={initialTotal}
                page={page}
                pageSize={pageSize}
                status={status}
                search={q}
                tabs={tabs}
                currentUserId={actor?.userId ?? ''}
                initialDetail={initialDetail}
            />
        </PageContainer>
    )
}
