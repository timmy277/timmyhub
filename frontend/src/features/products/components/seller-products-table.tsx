'use client'

import React, { useState } from 'react'
import { CheckCircle2, Clock, Film, Package, Plus, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ProductQueryInput, ProductSummary } from '@timmyhub/contracts'

import { QUERY_KEY } from '@/constants'
import type { SellerProductPermissionFlags } from '@/constants'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Input,
    Tabs,
    TabsList,
    TabsTrigger,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components'

import { getMyProductsAction, sellerRestoreProductAction } from '../actions'
import { CreateProductModal } from './create-product-modal'
import { SuspendProductDialog } from './suspend-product-dialog'

interface SellerProductsTableProps {
    permissions?: SellerProductPermissionFlags
}

export function SellerProductsTable({ permissions }: SellerProductsTableProps = {}) {
    const t = useTranslations('products')
    const tMsg = useTranslations('products.messages')

    const canCreate = !permissions || permissions.CREATE
    const canSuspend = !permissions || permissions.SUSPEND
    const canRestore = !permissions || permissions.RESTORE

    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [createModalOpen, setCreateModalOpen] = useState(false)

    // Suspend dialog state
    const [suspendTarget, setSuspendTarget] = useState<ProductSummary | null>(null)
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)

    // Restoring state
    const [restoringId, setRestoringId] = useState<string | null>(null)

    // Query seller products
    const {
        data: productsData,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.PRODUCTS.SELLER_LIST({ status: statusFilter, q: searchQuery }),
        queryFn: async () => {
            const queryParams: ProductQueryInput = {
                pageSize: 50,
            }
            if (searchQuery.trim()) queryParams.q = searchQuery.trim()

            if (statusFilter === 'PENDING') queryParams.status = 'PENDING'
            else if (statusFilter === 'APPROVED') {
                queryParams.status = 'APPROVED'
                queryParams.isSuspended = false
            } else if (statusFilter === 'REJECTED') queryParams.status = 'REJECTED'
            else if (statusFilter === 'SUSPENDED') queryParams.isSuspended = true
            else if (statusFilter === 'DRAFT') queryParams.status = 'DRAFT'

            const res = await getMyProductsAction(queryParams)
            if (!res.ok) throw new Error(res.code)
            return res.data
        },
    })

    const products = productsData?.items ?? []

    // Restore handler
    const handleRestore = async (product: ProductSummary) => {
        setRestoringId(product.id)
        try {
            const res = await sellerRestoreProductAction(product.id)
            if (res.ok) {
                toast.success(tMsg('restoreSuccess'))
                refetch()
            } else {
                toast.error(tMsg('restoreFailed', { error: res.message || res.code }))
            }
        } catch {
            toast.error(tMsg('restoreFailed', { error: '' }))
        } finally {
            setRestoringId(null)
        }
    }

    const formatVnd = (num: number | null) => {
        if (num === null || num === undefined) return '--'
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
    }

    const renderStatusBadge = (p: ProductSummary) => {
        if (p.isSuspended) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge
                                variant="outline"
                                className="cursor-help gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-500 font-semibold text-[11px]"
                            >
                                <ShieldAlert className="size-3" />
                                <span>{t('status.SUSPENDED')}</span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-xs space-y-1">
                            <p className="font-bold text-rose-400">Lý do tạm ngưng:</p>
                            <p className="text-muted-foreground">{p.suspendedReason || 'Không có lý do cụ thể'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        switch (p.status) {
            case 'PENDING':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-500 font-semibold text-[11px]"
                    >
                        <Clock className="size-3" />
                        <span>{t('status.PENDING')}</span>
                    </Badge>
                )
            case 'APPROVED':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold text-[11px]"
                    >
                        <CheckCircle2 className="size-3" />
                        <span>{t('status.APPROVED')}</span>
                    </Badge>
                )
            case 'REJECTED':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-500 font-semibold text-[11px]"
                    >
                        <XCircle className="size-3" />
                        <span>{t('status.REJECTED')}</span>
                    </Badge>
                )
            default:
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-muted-foreground/40 bg-muted/20 text-muted-foreground font-semibold text-[11px]"
                    >
                        <span>{t('status.DRAFT')}</span>
                    </Badge>
                )
        }
    }

    return (
        <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Package className="size-5 text-primary" />
                        <span>{t('title')}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">{t('desc')}</CardDescription>
                </div>
                {canCreate && (
                    <Button
                        size="sm"
                        className="rounded-xl font-bold gap-2 bg-primary text-white shadow-md hover:bg-primary/90 shrink-0"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        <Plus className="size-4" />
                        <span>{t('addProduct')}</span>
                    </Button>
                )}
            </CardHeader>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                    <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
                        <TabsTrigger value="ALL" className="text-xs rounded-lg font-medium">
                            {t('all')}
                        </TabsTrigger>
                        <TabsTrigger value="APPROVED" className="text-xs rounded-lg font-medium">
                            {t('tabApproved')}
                        </TabsTrigger>
                        <TabsTrigger value="PENDING" className="text-xs rounded-lg font-medium">
                            {t('tabPending')}
                        </TabsTrigger>
                        <TabsTrigger value="SUSPENDED" className="text-xs rounded-lg font-medium">
                            {t('tabSuspended')}
                        </TabsTrigger>
                        <TabsTrigger value="REJECTED" className="text-xs rounded-lg font-medium">
                            {t('tabRejected')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-64">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="pl-8 text-xs rounded-xl h-9 bg-background/60"
                    />
                </div>
            </div>

            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <RefreshCw className="size-6 animate-spin text-primary" />
                        <span className="text-xs font-medium">Đang tải danh sách sản phẩm…</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                            <Package className="size-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{t('emptyProducts')}</p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('emptyProductsDesc')}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs gap-1.5"
                            onClick={() => setCreateModalOpen(true)}
                        >
                            <Plus className="size-3.5" />
                            <span>{t('addProduct')}</span>
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-3.5">{t('columns.product')}</th>
                                    <th className="px-6 py-3.5">{t('columns.category')}</th>
                                    <th className="px-6 py-3.5">{t('columns.price')}</th>
                                    <th className="px-6 py-3.5">{t('columns.stock')}</th>
                                    <th className="px-6 py-3.5">{t('columns.sold')}</th>
                                    <th className="px-6 py-3.5">{t('columns.status')}</th>
                                    <th className="px-6 py-3.5 text-right">{t('columns.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {products.map((p) => {
                                    const priceDisplay =
                                        p.minPrice === p.maxPrice
                                            ? formatVnd(p.minPrice)
                                            : `${formatVnd(p.minPrice)} - ${formatVnd(p.maxPrice)}`

                                    return (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                            {/* Product Info */}
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {p.images && p.images[0] ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={p.images[0]}
                                                            alt={p.name}
                                                            className="size-11 rounded-xl object-cover border border-border/80 bg-muted/30 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                                                            No img
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 max-w-[240px]">
                                                        <p
                                                            className="font-semibold text-foreground truncate"
                                                            title={p.name}
                                                        >
                                                            {p.name}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[11px] text-muted-foreground font-mono truncate">
                                                                Slug: {p.slug}
                                                            </span>
                                                            {p.videos && p.videos.length > 0 && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-500 gap-0.5 shrink-0"
                                                                >
                                                                    <Film className="size-2.5" />
                                                                    <span>{p.videos.length} video</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {p.categoryName || 'Mặc định'}
                                            </td>

                                            {/* Price */}
                                            <td className="px-6 py-3.5 font-semibold text-foreground">
                                                {priceDisplay}
                                            </td>

                                            {/* Stock */}
                                            <td className="px-6 py-3.5 text-muted-foreground font-medium">
                                                {p.totalStock}
                                            </td>

                                            {/* Sold */}
                                            <td className="px-6 py-3.5 text-muted-foreground font-medium">
                                                {p.soldCount}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-3.5">{renderStatusBadge(p)}</td>

                                            {/* Actions */}
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {p.isSuspended
                                                        ? canRestore && (
                                                              <Button
                                                                  size="sm"
                                                                  variant="outline"
                                                                  className="h-8 px-2.5 rounded-lg text-xs gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                                                                  onClick={() => handleRestore(p)}
                                                                  disabled={restoringId === p.id}
                                                              >
                                                                  {restoringId === p.id ? (
                                                                      <RefreshCw className="size-3 animate-spin" />
                                                                  ) : (
                                                                      <span>{t('actions.restore')}</span>
                                                                  )}
                                                              </Button>
                                                          )
                                                        : canSuspend && (
                                                              <Button
                                                                  size="sm"
                                                                  variant="outline"
                                                                  className="h-8 px-2.5 rounded-lg text-xs gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                                                                  onClick={() => {
                                                                      setSuspendTarget(p)
                                                                      setSuspendDialogOpen(true)
                                                                  }}
                                                              >
                                                                  <span>{t('actions.suspend')}</span>
                                                              </Button>
                                                          )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>

            {/* Modals & Dialogs */}
            <CreateProductModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onSucceeded={() => refetch()}
            />

            <SuspendProductDialog
                product={suspendTarget}
                open={suspendDialogOpen}
                onOpenChange={setSuspendDialogOpen}
                onSucceeded={() => refetch()}
                isAdmin={false}
            />
        </Card>
    )
}
