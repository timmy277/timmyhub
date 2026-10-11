import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { VoucherDetail } from '@timmyhub/contracts'
import { PageContainer } from '@/components'
import { VOUCHER_TAB } from '@/constants'
import {
    getSellerVoucherDetailAction,
    listSellerVouchersAction,
    parseVoucherTabs,
    VouchersView,
} from '@/features/vouchers'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('vouchers')
    return { title: t('metaTitle') }
}

interface SellerVouchersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellerVouchersPage({ searchParams }: SellerVouchersPageProps) {
    const params = await searchParams
    const tabs = parseVoucherTabs(params)
    const actor = await getActor()

    let initialDetail: VoucherDetail | null = null
    if (tabs.active.tab === VOUCHER_TAB.DETAIL) {
        const detailRes = await getSellerVoucherDetailAction(tabs.active.id)
        if (detailRes.ok) {
            initialDetail = detailRes.data
        }
    }

    const t = await getTranslations('vouchers')
    const res = await listSellerVouchersAction()
    const rows = res.ok ? res.data.items : []
    const error = res.ok ? undefined : res.code === 'FORBIDDEN' ? t('errorForbidden') : t('errorLoad')

    return (
        <PageContainer>
            <VouchersView
                rows={rows}
                tabs={tabs}
                currentUserId={actor?.userId || ''}
                initialDetail={initialDetail}
                error={error}
                isSeller={true}
            />
        </PageContainer>
    )
}
