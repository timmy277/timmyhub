'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { VoucherItem } from '@timmyhub/contracts'
import { AgGridTable, ConfirmDialog, FloatCombobox } from '@/components'
import { VOUCHER_TAB, VOUCHER_TABLE_ROW_HEIGHT_PX } from '@/constants'

import { deleteVoucherAction, toggleVoucherStatusAction } from '../actions'
import { buildVoucherTabsHref, type VoucherTabState } from '../voucher-tab-query'
import { createVoucherColumns } from '@/config'

interface VoucherTableProps {
    rows: VoucherItem[]
    error?: string
    onRefresh?: () => void
}

const TYPE_FILTER_ALL = 'ALL'
const STATUS_FILTER_ALL = 'ALL'

export function VoucherTable({ rows, error, onRefresh }: VoucherTableProps) {
    const t = useTranslations('vouchers')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL)
    const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL)
    const [deletingVoucher, setDeletingVoucher] = useState<VoucherItem | null>(null)

    const typeFilterOptions = useMemo(
        () => [
            { value: TYPE_FILTER_ALL, label: t('allTypes') },
            { value: 'PERCENTAGE', label: t('typePercentage') },
            { value: 'FIXED_AMOUNT', label: t('typeFixedAmount') },
            { value: 'FREE_SHIPPING', label: t('typeFreeShipping') },
        ],
        [t],
    )

    const statusFilterOptions = useMemo(
        () => [
            { value: STATUS_FILTER_ALL, label: t('allStatuses') },
            { value: 'ACTIVE', label: t('statusActive') },
            { value: 'DISABLED', label: t('statusDisabled') },
        ],
        [t],
    )

    const filteredRows = useMemo(() => {
        return rows.filter((item) => {
            if (typeFilter !== TYPE_FILTER_ALL && item.type !== typeFilter) {
                return false
            }
            if (statusFilter !== STATUS_FILTER_ALL) {
                if (statusFilter === 'ACTIVE' && !item.isActive) return false
                if (statusFilter === 'DISABLED' && item.isActive) return false
            }
            return true
        })
    }, [rows, typeFilter, statusFilter])

    const hrefFor = useCallback(
        (target: VoucherTabState) => buildVoucherTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const handleDetail = useCallback(
        (item: VoucherItem) => {
            router.push(
                hrefFor({
                    tab: VOUCHER_TAB.DETAIL,
                    id: item.id,
                    label: item.code,
                }),
            )
        },
        [hrefFor, router],
    )

    const handleToggleStatus = useCallback(
        async (item: VoucherItem) => {
            try {
                const nextActive = !item.isActive
                const res = await toggleVoucherStatusAction(item.id, nextActive)
                if (!res.ok) {
                    toast.error(res.message || t('toggleFailed'))
                    return
                }
                toast.success(
                    nextActive ? t('enableSuccess', { code: item.code }) : t('disableSuccess', { code: item.code }),
                )
                if (onRefresh) onRefresh()
                router.refresh()
            } catch {
                toast.error(t('toggleError'))
            }
        },
        [onRefresh, router, t],
    )

    const handleConfirmDelete = async () => {
        if (!deletingVoucher) return
        try {
            const res = await deleteVoucherAction(deletingVoucher.id)
            if (!res.ok) {
                toast.error(res.message || t('deleteFailed'))
                return
            }
            toast.success(t('deleteSuccess', { code: deletingVoucher.code }))
            setDeletingVoucher(null)
            if (onRefresh) onRefresh()
            router.refresh()
        } catch {
            toast.error(t('deleteError'))
        }
    }

    const columns = useMemo(() => {
        return createVoucherColumns({
            t,
            actions: {
                onDetail: handleDetail,
                onToggleStatus: handleToggleStatus,
                onDelete: (item) => setDeletingVoucher(item),
            },
        })
    }, [t, handleDetail, handleToggleStatus])

    const toolbarFilters = useMemo(
        () => (
            <div className="flex flex-wrap items-center gap-2">
                <FloatCombobox
                    options={typeFilterOptions}
                    value={typeFilter}
                    onValueChange={(val) => setTypeFilter(val ?? TYPE_FILTER_ALL)}
                    label={t('typeFilterLabel')}
                    size="sm"
                    className="w-36"
                />
                <FloatCombobox
                    options={statusFilterOptions}
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val ?? STATUS_FILTER_ALL)}
                    label={t('statusFilterLabel')}
                    size="sm"
                    className="w-36"
                />
            </div>
        ),
        [typeFilterOptions, typeFilter, statusFilterOptions, statusFilter, t],
    )

    return (
        <>
            <AgGridTable<VoucherItem>
                rowData={filteredRows}
                columnDefs={columns}
                gridProps={{ rowHeight: VOUCHER_TABLE_ROW_HEIGHT_PX }}
                exportFileName={t('exportFileName')}
                toolbarFilters={toolbarFilters}
                onAdd={() => router.push(hrefFor({ tab: VOUCHER_TAB.CREATE }))}
                searchLabel={t('searchPlaceholder')}
                error={error}
                onRefresh={onRefresh}
            />

            <ConfirmDialog
                open={!!deletingVoucher}
                onOpenChange={(open) => !open && setDeletingVoucher(null)}
                title={t('deleteDialogTitle')}
                description={t('deleteDialogDesc', { code: deletingVoucher?.code ?? '' })}
                confirmLabel={t('deleteConfirmBtn')}
                cancelLabel={t('close')}
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </>
    )
}
