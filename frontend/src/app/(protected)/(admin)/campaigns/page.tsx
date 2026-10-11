import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { PromotionCampaignDetail } from '@timmyhub/contracts'
import { PageContainer } from '@/components'
import { CAMPAIGN_TAB } from '@/constants'
import {
    CampaignsView,
    getCampaignDetailAction,
    listAdminCampaignsAction,
    parseCampaignTabs,
} from '@/features/campaigns'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('campaigns')
    return { title: t('metaTitle') }
}

interface CampaignsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
    const params = await searchParams
    const tabs = parseCampaignTabs(params)
    const actor = await getActor()

    let initialDetail: PromotionCampaignDetail | null = null
    if (tabs.active.tab === CAMPAIGN_TAB.DETAIL) {
        const detailRes = await getCampaignDetailAction(tabs.active.id)
        if (detailRes.ok) {
            initialDetail = detailRes.data
        }
    }

    const t = await getTranslations('campaigns')
    const res = await listAdminCampaignsAction()
    const rows = res.ok ? res.data.items : []
    const error = res.ok ? undefined : res.code === 'FORBIDDEN' ? t('errorForbidden') : t('errorLoad')

    return (
        <PageContainer>
            <CampaignsView
                rows={rows}
                tabs={tabs}
                currentUserId={actor?.userId || ''}
                initialDetail={initialDetail}
                error={error}
            />
        </PageContainer>
    )
}
