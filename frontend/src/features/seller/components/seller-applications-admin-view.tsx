'use client'

import React from 'react'

import type { SellerApplicationDetail, SellerApplicationQuery } from '@timmyhub/contracts'

import { SELLER_APPLICATION_TAB } from '@/constants'

import type { SellerTabsState } from '../seller-tab-query'
import { SellerApplicationDetailPanel } from './seller-application-detail-panel'
import { SellerApplicationTable } from './seller-application-table'
import { SellerApplicationTabs } from './seller-application-tabs'

interface SellerApplicationsAdminViewProps {
    rows: SellerApplicationDetail[]
    totalItems: number
    query: SellerApplicationQuery
    tabs: SellerTabsState
    currentUserId: string
    initialDetail?: SellerApplicationDetail | null
}

export function SellerApplicationsAdminView({
    rows,
    totalItems,
    query,
    tabs,
    currentUserId,
    initialDetail,
}: SellerApplicationsAdminViewProps) {
    const { active } = tabs

    // Tìm tên shop của bản ghi chi tiết đang mở để gán cho nhãn tab
    const activeLabel =
        active.tab === SELLER_APPLICATION_TAB.DETAIL
            ? initialDetail?.id === active.id
                ? initialDetail.shopName
                : rows.find((r) => r.id === active.id)?.shopName
            : undefined

    return (
        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
            {/* Folder Tab Strip */}
            <SellerApplicationTabs active={active} userId={currentUserId} activeLabel={activeLabel} />

            {/* Active Tab Panel */}
            <div className="mt-4">
                {active.tab === SELLER_APPLICATION_TAB.DETAIL ? (
                    <SellerApplicationDetailPanel
                        key={active.id}
                        id={active.id}
                        initialData={initialDetail?.id === active.id ? initialDetail : null}
                    />
                ) : (
                    <SellerApplicationTable rows={rows} totalItems={totalItems} query={query} />
                )}
            </div>
        </section>
    )
}
