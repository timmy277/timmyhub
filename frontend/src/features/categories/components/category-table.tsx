'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import type { CategoryItem } from '@timmyhub/contracts'

import { AgGridTable, ConfirmDialog, FloatCombobox } from '@/components'
import {
    CATEGORY_STATUS_FILTER_ALL,
    CATEGORY_STATUS_FILTER_ACTIVE,
    CATEGORY_STATUS_FILTER_INACTIVE,
    CATEGORY_TAB,
    USER_TABLE_ROW_HEIGHT_PX,
} from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { createCategoryColumns } from '@/config'
import { deleteCategoryAction } from '../actions'
import { buildCategoryTabsHref, type CategoryTabState } from '../category-tab-query'

interface CategoryTableProps {
    rows: CategoryItem[]
    totalItems: number
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
    error?: string
}

export function CategoryTable({
    rows,
    canCreate = true,
    canUpdate = true,
    canDelete = true,
    error,
}: CategoryTableProps) {
    const t = useTranslations('categories')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // State for local filtering & search
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebouncedValue(searchQuery, 300)
    const [statusFilter, setStatusFilter] = useState<string>(CATEGORY_STATUS_FILTER_ALL)
    const [levelFilter, setLevelFilter] = useState<'ALL' | 'ROOT' | 'CHILD'>('ALL')

    // Dialog state
    const [pendingDelete, setPendingDelete] = useState<CategoryItem | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const hrefFor = useCallback(
        (target: CategoryTabState) => buildCategoryTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const handleRefresh = () => {
        toast.info(t('refreshing'))
        router.refresh()
    }

    const handleReset = () => {
        setSearchQuery('')
        setStatusFilter(CATEGORY_STATUS_FILTER_ALL)
        setLevelFilter('ALL')
        return true
    }

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return
        setIsDeleting(true)
        try {
            const res = await deleteCategoryAction(pendingDelete.id)
            if (res.ok) {
                toast.success(t('messages.deleteSuccess'))
                router.refresh()
            } else {
                toast.error(res.message || tCommon('errorGeneric'))
            }
        } catch {
            toast.error(tCommon('errorGeneric'))
        } finally {
            setIsDeleting(false)
            setPendingDelete(null)
        }
    }

    // Filtered rows
    const filteredRows = useMemo(() => {
        return rows.filter((item) => {
            // Status filter
            if (statusFilter === CATEGORY_STATUS_FILTER_ACTIVE && !item.isActive) return false
            if (statusFilter === CATEGORY_STATUS_FILTER_INACTIVE && item.isActive) return false

            // Level filter
            if (levelFilter === 'ROOT' && item.parentId !== null) return false
            if (levelFilter === 'CHILD' && item.parentId === null) return false

            // Search filter
            if (debouncedSearch.trim()) {
                const q = debouncedSearch.trim().toLowerCase()
                const matchesName = item.name.toLowerCase().includes(q)
                const matchesSlug = item.slug.toLowerCase().includes(q)
                const matchesParent = item.parentName?.toLowerCase().includes(q) ?? false
                if (!matchesName && !matchesSlug && !matchesParent) return false
            }

            return true
        })
    }, [rows, statusFilter, levelFilter, debouncedSearch])

    // Columns
    const columns = useMemo(() => {
        return createCategoryColumns({
            t,
            actions: {
                onDetail: (cat) => {
                    router.push(hrefFor({ tab: CATEGORY_TAB.DETAIL, id: cat.id, label: cat.name }))
                },
                onEdit: (cat) => {
                    router.push(hrefFor({ tab: CATEGORY_TAB.DETAIL, id: cat.id, label: cat.name }))
                },
                onDelete: (cat) => {
                    setPendingDelete(cat)
                },
            },
            canUpdate,
            canDelete,
        })
    }, [canDelete, canUpdate, hrefFor, router, t])

    const statusOptions = useMemo(
        () => [
            { value: CATEGORY_STATUS_FILTER_ALL, label: t('status.all') },
            { value: CATEGORY_STATUS_FILTER_ACTIVE, label: t('status.active') },
            { value: CATEGORY_STATUS_FILTER_INACTIVE, label: t('status.inactive') },
        ],
        [t],
    )

    const levelOptions = useMemo(
        () => [
            { value: 'ALL', label: t('level.all') },
            { value: 'ROOT', label: t('level.root') },
            { value: 'CHILD', label: t('level.child') },
        ],
        [t],
    )

    const toolbarFilters = useMemo(
        () => (
            <div className="flex flex-wrap items-center gap-2">
                <FloatCombobox
                    label={t('columns.status')}
                    options={statusOptions}
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val || CATEGORY_STATUS_FILTER_ALL)}
                    size="sm"
                    className="w-full sm:w-40"
                />
                <FloatCombobox
                    label={t('columns.parent')}
                    options={levelOptions}
                    value={levelFilter}
                    onValueChange={(val) => setLevelFilter((val as 'ALL' | 'ROOT' | 'CHILD') || 'ALL')}
                    size="sm"
                    className="w-full sm:w-40"
                />
            </div>
        ),
        [statusOptions, statusFilter, levelOptions, levelFilter, t],
    )

    return (
        <div className="space-y-4">
            <AgGridTable<CategoryItem>
                rowData={filteredRows}
                columnDefs={columns}
                getRowId={(p) => p.data.id}
                error={error}
                onRefresh={handleRefresh}
                onReset={handleReset}
                onAdd={canCreate ? () => router.push(hrefFor({ tab: CATEGORY_TAB.CREATE })) : undefined}
                addLabel={t('tabCreate')}
                searchLabel={t('searchPlaceholder')}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                toolbarFilters={toolbarFilters}
                exportFileName={t('exportFileName')}
                pagination={true}
                gridProps={{
                    rowHeight: USER_TABLE_ROW_HEIGHT_PX,
                }}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title={t('messages.deleteConfirmTitle')}
                description={t('messages.deleteConfirmDesc', { name: pendingDelete?.name ?? '' })}
                confirmLabel={isDeleting ? t('messages.deletingBtn') : t('messages.deleteConfirmBtn')}
                variant="destructive"
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
