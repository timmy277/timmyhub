'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { PromotionCampaignItem } from '@timmyhub/contracts'
import { AgGridTable, ConfirmDialog, FloatCombobox } from '@/components'
import { CAMPAIGN_TAB, CAMPAIGN_TABLE_ROW_HEIGHT_PX } from '@/constants'

import { deleteCampaignAction, toggleCampaignStatusAction } from '../actions'
import { buildCampaignTabsHref, type CampaignTabState } from '../campaign-tab-query'
import { createCampaignColumns } from '@/config'

interface CampaignTableProps {
    rows: PromotionCampaignItem[]
    error?: string
    onRefresh?: () => void
}

const TYPE_FILTER_ALL = 'ALL'
const STATUS_FILTER_ALL = 'ALL'

export function CampaignTable({ rows, error, onRefresh }: CampaignTableProps) {
    const t = useTranslations('campaigns')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL)
    const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL)
    const [deletingCampaign, setDeletingCampaign] = useState<PromotionCampaignItem | null>(null)

    const typeFilterOptions = useMemo(
        () => [
            { value: TYPE_FILTER_ALL, label: t('allTypes') },
            { value: 'FLASH_SALE', label: t('typeFlashSale') },
            { value: 'MEGA_SALE', label: t('typeMegaSale') },
            { value: 'SEASONAL', label: t('typeSeasonal') },
            { value: 'CATEGORY_BOOST', label: t('typeCategoryBoost') },
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
        (target: CampaignTabState) => buildCampaignTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const handleDetail = useCallback(
        (item: PromotionCampaignItem) => {
            router.push(
                hrefFor({
                    tab: CAMPAIGN_TAB.DETAIL,
                    id: item.id,
                    label: item.name,
                }),
            )
        },
        [hrefFor, router],
    )

    const handleToggleStatus = useCallback(
        async (item: PromotionCampaignItem) => {
            try {
                const nextActive = !item.isActive
                const res = await toggleCampaignStatusAction(item.id, nextActive)
                if (!res.ok) {
                    toast.error(res.message || t('toggleFailed'))
                    return
                }
                toast.success(
                    nextActive ? t('enableSuccess', { name: item.name }) : t('disableSuccess', { name: item.name }),
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
        if (!deletingCampaign) return
        try {
            const res = await deleteCampaignAction(deletingCampaign.id)
            if (!res.ok) {
                toast.error(res.message || t('deleteFailed'))
                return
            }
            toast.success(t('deleteSuccess', { name: deletingCampaign.name }))
            setDeletingCampaign(null)
            if (onRefresh) onRefresh()
            router.refresh()
        } catch {
            toast.error(t('deleteError'))
        }
    }

    const columns = useMemo(() => {
        return createCampaignColumns({
            t,
            actions: {
                onDetail: handleDetail,
                onToggleStatus: handleToggleStatus,
                onDelete: (item) => setDeletingCampaign(item),
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
            <AgGridTable<PromotionCampaignItem>
                rowData={filteredRows}
                columnDefs={columns}
                gridProps={{ rowHeight: CAMPAIGN_TABLE_ROW_HEIGHT_PX }}
                exportFileName={t('exportFileName')}
                toolbarFilters={toolbarFilters}
                onAdd={() => router.push(hrefFor({ tab: CAMPAIGN_TAB.CREATE }))}
                searchLabel={t('searchPlaceholder')}
                error={error}
                onRefresh={onRefresh}
            />

            <ConfirmDialog
                open={!!deletingCampaign}
                onOpenChange={(open) => !open && setDeletingCampaign(null)}
                title={t('deleteDialogTitle')}
                description={t('deleteDialogDesc', { name: deletingCampaign?.name ?? '' })}
                confirmLabel={t('deleteConfirmBtn')}
                cancelLabel={t('close')}
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </>
    )
}
