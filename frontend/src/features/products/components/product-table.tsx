'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ProductSummary } from '@timmyhub/contracts'
import { ProductStatus } from '@timmyhub/contracts'

import { AgGridTable, ConfirmDialog, FloatCombobox } from '@/components'
import { PRODUCT_STATUS_FILTER_ALL, PRODUCT_TAB, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { createProductColumns } from '@/config'
import { adminRestoreProductAction, sellerDeleteProductAction, sellerRestoreProductAction } from '../actions'
import { buildProductTabsHref, type ProductTabState } from '../product-tab-query'
import { ReviewProductDialog } from './review-product-dialog'
import { SuspendProductDialog } from './suspend-product-dialog'

interface ProductTableProps {
    rows: ProductSummary[]
    totalItems: number
    isAdmin?: boolean
    canCreate?: boolean
    error?: string
}

export function ProductTable({ rows, isAdmin = false, canCreate = false, error }: ProductTableProps) {
    const t = useTranslations('products')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // State for local filtering & search
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebouncedValue(searchQuery, 300)
    const [statusFilter, setStatusFilter] = useState<string>(PRODUCT_STATUS_FILTER_ALL)

    // Dialogs state
    const [reviewProduct, setReviewProduct] = useState<ProductSummary | null>(null)
    const [reviewMode, setReviewMode] = useState<'APPROVE' | 'REJECT' | null>(null)
    const [suspendProduct, setSuspendProduct] = useState<ProductSummary | null>(null)
    const [pendingRestore, setPendingRestore] = useState<ProductSummary | null>(null)
    const [pendingDelete, setPendingDelete] = useState<ProductSummary | null>(null)
    const [isRestoring, setIsRestoring] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const hrefFor = useCallback(
        (target: ProductTabState) => buildProductTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const handleRefresh = () => {
        toast.info(t('refreshing'))
        router.refresh()
    }

    const handleReset = () => {
        setSearchQuery('')
        setStatusFilter(PRODUCT_STATUS_FILTER_ALL)
        return true
    }

    const handleRestoreConfirm = async () => {
        if (!pendingRestore) return
        setIsRestoring(true)
        try {
            const res = isAdmin
                ? await adminRestoreProductAction(pendingRestore.id)
                : await sellerRestoreProductAction(pendingRestore.id)

            if (res.ok) {
                toast.success(t('restoreSuccessNamed', { name: pendingRestore.name }))
                router.refresh()
            } else {
                toast.error(res.message || t('restoreFailed'))
            }
        } catch {
            toast.error(t('restoreError'))
        } finally {
            setIsRestoring(false)
            setPendingRestore(null)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return
        setIsDeleting(true)
        try {
            const res = await sellerDeleteProductAction(pendingDelete.id)
            if (res.ok) {
                toast.success(t('deleteSuccessNamed', { name: pendingDelete.name }))
                router.refresh()
            } else {
                toast.error(res.message || t('deleteFailed'))
            }
        } catch {
            toast.error(t('deleteError'))
        } finally {
            setIsDeleting(false)
            setPendingDelete(null)
        }
    }

    // Filter rows based on debounced search & status dropdown
    const filteredRows = useMemo(() => {
        return rows.filter((item) => {
            if (statusFilter !== PRODUCT_STATUS_FILTER_ALL) {
                if (statusFilter === 'SUSPENDED') {
                    if (!item.isSuspended) return false
                } else if (item.status !== statusFilter || item.isSuspended) {
                    return false
                }
            }

            if (debouncedSearch.trim()) {
                const q = debouncedSearch.toLowerCase().trim()
                const matchesName = item.name.toLowerCase().includes(q)
                const matchesSlug = item.slug.toLowerCase().includes(q)
                const matchesCat = item.categoryName?.toLowerCase().includes(q) ?? false
                const matchesShop = item.shopName?.toLowerCase().includes(q) ?? false
                if (!matchesName && !matchesSlug && !matchesCat && !matchesShop) return false
            }

            return true
        })
    }, [rows, statusFilter, debouncedSearch])

    const columns = useMemo(
        () =>
            createProductColumns({
                t,
                isAdmin,
                canCreateOrUpdate: canCreate,
                actions: {
                    onDetail: (prod) =>
                        router.push(hrefFor({ tab: PRODUCT_TAB.DETAIL, id: prod.id, label: prod.name })),
                    onApprove: (prod) => {
                        setReviewProduct(prod)
                        setReviewMode('APPROVE')
                    },
                    onReject: (prod) => {
                        setReviewProduct(prod)
                        setReviewMode('REJECT')
                    },
                    onSuspend: (prod) => setSuspendProduct(prod),
                    onRestore: (prod) => setPendingRestore(prod),
                    onDelete: (prod) => setPendingDelete(prod),
                },
            }),
        [t, isAdmin, canCreate, router, hrefFor],
    )

    const statusOptions = useMemo(
        () => [
            { value: PRODUCT_STATUS_FILTER_ALL, label: t('filterAllStatuses') },
            { value: ProductStatus.APPROVED, label: t('status.APPROVED') },
            { value: ProductStatus.PENDING, label: t('status.PENDING') },
            { value: 'SUSPENDED', label: t('status.SUSPENDED') },
            { value: ProductStatus.REJECTED, label: t('status.REJECTED') },
        ],
        [t],
    )

    const toolbarFilters = useMemo(
        () => (
            <FloatCombobox
                label={t('filterStatus')}
                options={statusOptions}
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val || PRODUCT_STATUS_FILTER_ALL)}
                size="sm"
                className="w-full sm:w-40"
            />
        ),
        [t, statusOptions, statusFilter],
    )

    return (
        <div className="space-y-4">
            <AgGridTable<ProductSummary>
                rowData={filteredRows}
                columnDefs={columns}
                getRowId={(p) => p.data.id}
                error={error}
                onRefresh={handleRefresh}
                onReset={handleReset}
                onAdd={canCreate ? () => router.push(hrefFor({ tab: PRODUCT_TAB.CREATE })) : undefined}
                addLabel={t('addProduct')}
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

            {/* Review Dialog (Admin Approve / Reject) */}
            <ReviewProductDialog
                product={reviewProduct}
                mode={reviewMode}
                open={Boolean(reviewProduct && reviewMode)}
                onOpenChange={(open) => {
                    if (!open) {
                        setReviewProduct(null)
                        setReviewMode(null)
                    }
                }}
                onSucceeded={() => {
                    setReviewProduct(null)
                    setReviewMode(null)
                    router.refresh()
                }}
            />

            {/* Suspend Product Dialog */}
            <SuspendProductDialog
                product={suspendProduct}
                isAdmin={isAdmin}
                open={Boolean(suspendProduct)}
                onOpenChange={(open) => !open && setSuspendProduct(null)}
                onSucceeded={() => {
                    setSuspendProduct(null)
                    router.refresh()
                }}
            />

            {/* Confirm Restore Dialog */}
            <ConfirmDialog
                open={Boolean(pendingRestore)}
                onOpenChange={(open) => !open && setPendingRestore(null)}
                title={t('restoreTitle')}
                description={t('restoreDesc', { name: pendingRestore?.name ?? '' })}
                confirmLabel={isRestoring ? t('restoring') : t('restoreConfirm')}
                onConfirm={handleRestoreConfirm}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title={t('deleteTitle')}
                description={t('deleteDesc', { name: pendingDelete?.name ?? '' })}
                confirmLabel={isDeleting ? t('deleting') : t('deleteConfirm')}
                variant="destructive"
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
