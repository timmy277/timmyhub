'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { OrderDetail } from '@timmyhub/contracts'
import { useTranslations } from 'next-intl'
import { Button, EmptyState } from '@/components'
import { SELLER_ORDER_TAB } from '@/constants'
import { buildSellerOrderTabsHref, type SellerOrderTabsState } from '../seller-order-tab-query'
import { SellerOrderDetailPanel } from './seller-order-detail-panel'
import { SellerOrderTable } from './seller-order-table'
import { SellerOrderTabs } from './seller-order-tabs'

interface SellerOrdersViewProps {
    rows: OrderDetail[]
    tabs: SellerOrderTabsState
    currentUserId: string
    initialDetail?: OrderDetail | null
    error?: string
}

export function SellerOrdersView({ rows, tabs, currentUserId, initialDetail, error }: SellerOrdersViewProps) {
    const t = useTranslations('sellerOrders')
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { active } = tabs

    // Tìm mã đơn của bản ghi chi tiết đang mở để hiển thị nhãn tab
    const activeLabel =
        active.tab === SELLER_ORDER_TAB.DETAIL
            ? initialDetail?.id === active.id
                ? initialDetail.id.slice(-8).toUpperCase()
                : rows
                      .find((r) => r.id === active.id)
                      ?.id.slice(-8)
                      .toUpperCase()
            : undefined

    const activeOrder =
        active.tab === SELLER_ORDER_TAB.DETAIL ? (rows.find((r) => r.id === active.id) ?? initialDetail ?? null) : null

    const listHref = buildSellerOrderTabsHref(pathname, searchParams, { tab: SELLER_ORDER_TAB.LIST })

    return (
        <section className="rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-xs">
            {/* Folder Tab Strip */}
            <SellerOrderTabs active={active} userId={currentUserId} activeLabel={activeLabel} />

            {/* Active Tab Panel */}
            <div className="mt-4">
                {active.tab === SELLER_ORDER_TAB.DETAIL ? (
                    activeOrder ? (
                        <SellerOrderDetailPanel key={activeOrder.id} order={activeOrder} />
                    ) : (
                        <EmptyState
                            title={t('notFoundTitle')}
                            description={t('notFoundDesc', { code: active.id.slice(-8).toUpperCase() })}
                            action={
                                <Button asChild variant="outline" size="sm">
                                    <Link href={listHref}>{t('backToList')}</Link>
                                </Button>
                            }
                        />
                    )
                ) : (
                    <SellerOrderTable rows={rows} error={error} />
                )}
            </div>
        </section>
    )
}
