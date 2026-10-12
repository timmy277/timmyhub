'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { SellerApplicationDetail, SellerApplicationQuery } from '@timmyhub/contracts'
import { ResourceStatus } from '@timmyhub/contracts'

import { AgGridTable, FloatCombobox, ServerPagination } from '@/components'
import { createSellerApplicationColumns } from '@/config'
import { SELLER_APPLICATION_STATUS_ALL, SELLER_APPLICATION_TAB, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { useSellerApplicationListQuery } from '../hooks/use-seller-application-list-query'
import { buildSellerTabsHref, type SellerTabState } from '../seller-tab-query'
import { ApproveDialog, RejectDialog } from './seller-application-dialogs'
import { DocumentPreview } from './document-preview'

interface SellerApplicationTableProps {
    rows: SellerApplicationDetail[]
    totalItems: number
    query: SellerApplicationQuery
    error?: string
}

export function SellerApplicationTable({ rows, totalItems, query, error }: SellerApplicationTableProps) {
    // ===== Hooks =====
    const t = useTranslations('sellerApplications')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isPending, setPageSize, setSearch, setStatus, resetList } = useSellerApplicationListQuery()

    // ===== State =====
    const [searchInput, setSearchInput] = useState(query.q ?? '')
    const debouncedSearch = useDebouncedValue(searchInput, 300)
    const lastSyncedSearch = useRef(query.q ?? '')

    // Approve / Reject Dialogs
    const [approvingApp, setApprovingApp] = useState<SellerApplicationDetail | null>(null)
    const [rejectingApp, setRejectingApp] = useState<SellerApplicationDetail | null>(null)

    // Sync debounced search to query
    useEffect(() => {
        const fromUrl = query.q ?? ''
        if (fromUrl === lastSyncedSearch.current) return
        lastSyncedSearch.current = fromUrl
        setSearchInput(fromUrl)
    }, [query.q])

    useEffect(() => {
        if (debouncedSearch === lastSyncedSearch.current) return
        lastSyncedSearch.current = debouncedSearch
        setSearch(debouncedSearch.trim() ? debouncedSearch : undefined)
    }, [debouncedSearch, setSearch])

    // ===== Derived =====
    const hrefFor = useCallback(
        (target: SellerTabState) => buildSellerTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const columns = useMemo(
        () =>
            createSellerApplicationColumns({
                t,
                renderDocument: (application) => (
                    <DocumentPreview url={application.idDocumentUrl} shopName={application.shopName} thumbnailOnly />
                ),
                actions: {
                    onDetail: (app) =>
                        router.push(hrefFor({ tab: SELLER_APPLICATION_TAB.DETAIL, id: app.id, label: app.shopName })),
                    onApprove: (app) => setApprovingApp(app),
                    onReject: (app) => setRejectingApp(app),
                },
            }),
        [t, router, hrefFor],
    )

    const statusOptions = useMemo(
        () => [
            { value: SELLER_APPLICATION_STATUS_ALL, label: t('filterAllStatuses') },
            { value: ResourceStatus.PENDING, label: t('statusPending') },
            { value: ResourceStatus.APPROVED, label: t('statusApproved') },
            { value: ResourceStatus.REJECTED, label: t('statusRejected') },
        ],
        [t],
    )

    const currentPage = query.page ?? 1
    const currentPageSize = query.pageSize ?? 20
    const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize))

    // ===== Handlers =====
    const handleRefresh = () => {
        toast.info(t('refreshing'))
        router.refresh()
    }

    const handleReset = () => {
        setSearchInput('')
        resetList()
        return true
    }

    const handleSearchChange = (val: string) => {
        setSearchInput(val)
    }

    const buildPaginationHref = useCallback(
        (patch: { page?: number; pageSize?: number }) => {
            const params = new URLSearchParams(searchParams.toString())
            if (patch.page) params.set('page', String(patch.page))
            if (patch.pageSize) params.set('pageSize', String(patch.pageSize))
            return `${pathname}?${params.toString()}`
        },
        [pathname, searchParams],
    )

    return (
        <>
            <div className="flex flex-col gap-4">
                <AgGridTable<SellerApplicationDetail>
                    rowData={rows}
                    columnDefs={columns}
                    getRowId={(params) => params.data.id}
                    loading={isPending}
                    error={error}
                    onRefresh={handleRefresh}
                    searchValue={searchInput}
                    onSearchChange={handleSearchChange}
                    onReset={handleReset}
                    searchLabel={t('searchLabel')}
                    exportFileName={t('exportFileName')}
                    pagination={false}
                    gridProps={{
                        rowHeight: USER_TABLE_ROW_HEIGHT_PX,
                        onRowDoubleClicked: (e) => {
                            if (e.data) {
                                router.push(
                                    hrefFor({
                                        tab: SELLER_APPLICATION_TAB.DETAIL,
                                        id: e.data.id,
                                        label: e.data.shopName,
                                    }),
                                )
                            }
                        },
                    }}
                    toolbarFilters={
                        <FloatCombobox
                            label={t('filterStatus')}
                            options={statusOptions}
                            value={query.status ?? SELLER_APPLICATION_STATUS_ALL}
                            onValueChange={(val) => {
                                setStatus(val === SELLER_APPLICATION_STATUS_ALL || !val ? undefined : val)
                            }}
                            size="sm"
                            className="w-full sm:w-44"
                        />
                    }
                />

                <ServerPagination
                    page={currentPage}
                    pageSize={currentPageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    hasPrev={currentPage > 1}
                    hasNext={currentPage < totalPages}
                    buildHref={buildPaginationHref}
                    onPageSizeChange={setPageSize}
                    disabled={isPending}
                />
            </div>

            {/* Approve Dialog */}
            <ApproveDialog
                app={approvingApp}
                open={Boolean(approvingApp)}
                onOpenChange={(open) => !open && setApprovingApp(null)}
                onSucceeded={() => {
                    setApprovingApp(null)
                    router.refresh()
                }}
            />

            {/* Reject Dialog */}
            <RejectDialog
                app={rejectingApp}
                open={Boolean(rejectingApp)}
                onOpenChange={(open) => !open && setRejectingApp(null)}
                onSucceeded={() => {
                    setRejectingApp(null)
                    router.refresh()
                }}
            />
        </>
    )
}
