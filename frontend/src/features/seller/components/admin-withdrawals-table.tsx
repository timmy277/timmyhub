'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AgGridTable, FloatCombobox, ServerPagination } from '@/components'
import { createWithdrawalColumns, type AdminWithdrawalRow } from '@/config'
import { USER_TABLE_ROW_HEIGHT_PX, WITHDRAWAL_STATUS, WITHDRAWAL_STATUS_ALL, type WithdrawalStatus } from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { useWithdrawalListQuery } from '../hooks/use-withdrawal-list-query'

export interface AdminWithdrawalsTableProps {
    rows: AdminWithdrawalRow[]
    totalItems: number
    page: number
    pageSize: number
    status?: string
    search?: string
    onDetailClick?: (item: AdminWithdrawalRow) => void
    onApproveClick: (item: AdminWithdrawalRow) => void
    onRejectClick: (item: AdminWithdrawalRow) => void
}

export function AdminWithdrawalsTable({
    rows,
    totalItems,
    page,
    pageSize,
    status,
    search,
    onDetailClick,
    onApproveClick,
    onRejectClick,
}: AdminWithdrawalsTableProps) {
    // ===== State =====
    const [searchInput, setSearchInput] = useState(search ?? '')
    const debouncedSearch = useDebouncedValue(searchInput, 300)
    const lastSyncedSearch = useRef(search ?? '')

    // ===== Hooks =====
    const t = useTranslations('adminWithdrawals')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isPending, setPageSize, setStatus, setSearch, resetList } = useWithdrawalListQuery()

    // Sync external query to searchInput
    useEffect(() => {
        const fromUrl = search ?? ''
        if (fromUrl === lastSyncedSearch.current) return
        lastSyncedSearch.current = fromUrl
        setSearchInput(fromUrl)
    }, [search])

    // Sync debounced search to URL query
    useEffect(() => {
        if (debouncedSearch === lastSyncedSearch.current) return
        lastSyncedSearch.current = debouncedSearch
        setSearch(debouncedSearch.trim() ? debouncedSearch : undefined)
    }, [debouncedSearch, setSearch])

    // ===== Derived =====
    const handleCopyAccount = useCallback(
        async (account: string) => {
            try {
                await navigator.clipboard.writeText(account)
                toast.success(t('copiedAccount'))
            } catch {
                toast.error('Copy failed')
            }
        },
        [t],
    )

    const columns = useMemo(
        () =>
            createWithdrawalColumns({
                t,
                actions: {
                    onDetail: onDetailClick,
                    onApprove: onApproveClick,
                    onReject: onRejectClick,
                    onCopyAccount: handleCopyAccount,
                },
            }),
        [t, onDetailClick, onApproveClick, onRejectClick, handleCopyAccount],
    )

    const statusOptions = useMemo(
        () => [
            { value: WITHDRAWAL_STATUS_ALL, label: t('filterAllStatuses') },
            { value: WITHDRAWAL_STATUS.REQUESTED, label: t('statusRequested') },
            { value: WITHDRAWAL_STATUS.PAID, label: t('statusPaid') },
            { value: WITHDRAWAL_STATUS.REJECTED, label: t('statusRejected') },
        ],
        [t],
    )

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    // ===== Handlers =====
    const handleRefresh = () => {
        toast.info(t('refreshing'))
        router.refresh()
    }

    const handleSearchChange = (value: string) => {
        setSearchInput(value)
    }

    const handleReset = () => {
        setSearchInput('')
        resetList()
        return true
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
        <div className="flex flex-col gap-4">
            <AgGridTable<AdminWithdrawalRow>
                rowData={rows}
                columnDefs={columns}
                getRowId={(params) => params.data.id}
                loading={isPending}
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
                        if (e.data && onDetailClick) {
                            onDetailClick(e.data)
                        }
                    },
                }}
                toolbarFilters={
                    <FloatCombobox
                        label={t('filterStatus')}
                        options={statusOptions}
                        value={status ?? WITHDRAWAL_STATUS_ALL}
                        onValueChange={(val) => {
                            setStatus(val === WITHDRAWAL_STATUS_ALL || !val ? undefined : (val as WithdrawalStatus))
                        }}
                        size="sm"
                        className="w-full sm:w-44"
                    />
                }
            />

            <ServerPagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                hasPrev={page > 1}
                hasNext={page < totalPages}
                buildHref={buildPaginationHref}
                onPageSizeChange={setPageSize}
                disabled={isPending}
            />
        </div>
    )
}
