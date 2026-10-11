import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { VoucherDetail } from '@timmyhub/contracts'
import { PageContainer } from '@/components'
import { VOUCHER_TAB } from '@/constants'
import { listAdminCampaignsAction } from '@/features/campaigns'
import { getVoucherDetailAction, listAdminVouchersAction, parseVoucherTabs, VouchersView } from '@/features/vouchers'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('vouchers')
    return { title: t('metaTitle') }
}

interface VouchersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function VouchersPage({ searchParams }: VouchersPageProps) {
    const params = await searchParams
    const tabs = parseVoucherTabs(params)
    const actor = await getActor()

    let initialDetail: VoucherDetail | null = null
    if (tabs.active.tab === VOUCHER_TAB.DETAIL) {
        const detailRes = await getVoucherDetailAction(tabs.active.id)
        if (detailRes.ok) {
            initialDetail = detailRes.data
        }
    }

    const t = await getTranslations('vouchers')
    const [res, campaignsRes] = await Promise.all([
        listAdminVouchersAction(),
        listAdminCampaignsAction({ page: 1, pageSize: 100 }),
    ])
    const rows = res.ok ? res.data.items : []
    const campaignOptions = campaignsRes.ok ? campaignsRes.data.items.map((c) => ({ value: c.id, label: c.name })) : []
    const error = res.ok ? undefined : res.code === 'FORBIDDEN' ? t('errorForbidden') : t('errorLoad')

    return (
        <PageContainer>
            <VouchersView
                rows={rows}
                tabs={tabs}
                currentUserId={actor?.userId || ''}
                initialDetail={initialDetail}
                campaignOptions={campaignOptions}
                error={error}
            />
        </PageContainer>
    )
}
