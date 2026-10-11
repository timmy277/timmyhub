'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import type { VoucherDetail, VoucherItem } from '@timmyhub/contracts'
import { Button, EmptyState } from '@/components'
import { VOUCHER_TAB } from '@/constants'

import { buildVoucherTabsHref, type VoucherTabsState } from '../voucher-tab-query'
import { VoucherDetailPanel } from './voucher-detail-panel'
import { VoucherFormPanel } from './voucher-form-panel'
import { VoucherTable } from './voucher-table'
import { VoucherTabs } from './voucher-tabs'

interface VouchersViewProps {
    rows: VoucherItem[]
    tabs: VoucherTabsState
    currentUserId: string
    initialDetail?: VoucherDetail | null
    campaignOptions?: { value: string; label: string }[]
    error?: string
    isSeller?: boolean
}

export function VouchersView({
    rows,
    tabs,
    currentUserId,
    initialDetail,
    campaignOptions,
    error,
    isSeller,
}: VouchersViewProps) {
    const t = useTranslations('vouchers')
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { active } = tabs

    const activeLabel =
        active.tab === VOUCHER_TAB.DETAIL
            ? initialDetail?.id === active.id
                ? initialDetail.code
                : rows.find((r) => r.id === active.id)?.code
            : undefined

    const activeVoucher =
        active.tab === VOUCHER_TAB.DETAIL
            ? (initialDetail ?? (rows.find((r) => r.id === active.id) as VoucherDetail | undefined) ?? null)
            : null

    const listHref = buildVoucherTabsHref(pathname, searchParams, { tab: VOUCHER_TAB.LIST })

    return (
        <section className="rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-xs">
            {/* Folder Tab Strip */}
            <VoucherTabs active={active} userId={currentUserId} activeLabel={activeLabel} />

            {/* Active Tab Panel */}
            <div className="mt-4">
                {active.tab === VOUCHER_TAB.CREATE ? (
                    <VoucherFormPanel campaignOptions={campaignOptions} isSeller={isSeller} />
                ) : active.tab === VOUCHER_TAB.DETAIL ? (
                    activeVoucher ? (
                        <VoucherDetailPanel key={activeVoucher.id} voucher={activeVoucher} isSeller={isSeller} />
                    ) : (
                        <EmptyState
                            title={t('notFoundTitle')}
                            description={t('notFoundDesc', { id: active.id.slice(-8).toUpperCase() })}
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link href={listHref}>{t('backToList')}</Link>
                                </Button>
                            }
                        />
                    )
                ) : (
                    <VoucherTable rows={rows} error={error} isSeller={isSeller} />
                )}
            </div>
        </section>
    )
}
