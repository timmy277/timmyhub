'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { PromotionCampaignDetail, PromotionCampaignItem } from '@timmyhub/contracts'
import { Button, EmptyState } from '@/components'
import { CAMPAIGN_TAB } from '@/constants'

import { buildCampaignTabsHref, type CampaignTabsState } from '../campaign-tab-query'
import { CampaignDetailPanel } from './campaign-detail-panel'
import { CampaignFormPanel } from './campaign-form-panel'
import { CampaignTable } from './campaign-table'
import { CampaignTabs } from './campaign-tabs'

interface CampaignsViewProps {
    rows: PromotionCampaignItem[]
    tabs: CampaignTabsState
    currentUserId: string
    initialDetail?: PromotionCampaignDetail | null
    error?: string
}

export function CampaignsView({ rows, tabs, currentUserId, initialDetail, error }: CampaignsViewProps) {
    const t = useTranslations('campaigns')
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { active } = tabs

    const activeLabel =
        active.tab === CAMPAIGN_TAB.DETAIL
            ? initialDetail?.id === active.id
                ? initialDetail.name
                : rows.find((r) => r.id === active.id)?.name
            : undefined

    const activeCampaign =
        active.tab === CAMPAIGN_TAB.DETAIL
            ? (initialDetail ?? (rows.find((r) => r.id === active.id) as PromotionCampaignDetail | undefined) ?? null)
            : null

    const listHref = buildCampaignTabsHref(pathname, searchParams, { tab: CAMPAIGN_TAB.LIST })

    return (
        <section className="rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-xs">
            {/* Folder Tab Strip */}
            <CampaignTabs active={active} userId={currentUserId} activeLabel={activeLabel} />

            {/* Active Tab Panel */}
            <div className="mt-4">
                {active.tab === CAMPAIGN_TAB.CREATE ? (
                    <CampaignFormPanel />
                ) : active.tab === CAMPAIGN_TAB.DETAIL ? (
                    activeCampaign ? (
                        <CampaignDetailPanel key={activeCampaign.id} campaign={activeCampaign} />
                    ) : (
                        <EmptyState
                            title={t('notFoundTitle')}
                            description={t('notFoundDesc', {
                                id: active.id.slice(-8).toUpperCase(),
                            })}
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link href={listHref}>{t('backToList')}</Link>
                                </Button>
                            }
                        />
                    )
                ) : (
                    <CampaignTable rows={rows} error={error} />
                )}
            </div>
        </section>
    )
}
