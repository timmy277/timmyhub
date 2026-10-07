'use client'

import React, { useState } from 'react'
import { CheckCircle2, Clock, Eye, Film, Package, RefreshCw, Search, ShieldAlert, Store, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ProductQueryInput, ProductSummary } from '@timmyhub/contracts'

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input,
    Tabs,
    TabsList,
    TabsTrigger,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components'

import { QUERY_KEY } from '@/constants'
import type { AdminProductPermissionFlags } from '@/constants'
import { adminRestoreProductAction, listAdminProductsAction } from '../actions'
import { ReviewProductDialog } from './review-product-dialog'
import { SuspendProductDialog } from './suspend-product-dialog'

interface AdminProductsViewProps {
    permissions?: AdminProductPermissionFlags
}

export function AdminProductsView({ permissions }: AdminProductsViewProps = {}) {
    const t = useTranslations('adminProducts')
    const tProd = useTranslations('products')

    const canApprove = !permissions || permissions.APPROVE
    const canReject = !permissions || permissions.REJECT
    const canSuspend = !permissions || permissions.SUSPEND
    const canRestore = !permissions || permissions.RESTORE

    const [statusTab, setStatusTab] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // Review Dialog State
    const [reviewTarget, setReviewTarget] = useState<ProductSummary | null>(null)
    const [reviewMode, setReviewMode] = useState<'APPROVE' | 'REJECT' | null>(null)
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

    // Suspend Dialog State
    const [suspendTarget, setSuspendTarget] = useState<ProductSummary | null>(null)
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)

    // Detail Preview Modal State
    const [detailTarget, setDetailTarget] = useState<ProductSummary | null>(null)
    const [detailModalOpen, setDetailModalOpen] = useState(false)

    // Restore Loading State
    const [restoringId, setRestoringId] = useState<string | null>(null)

    // Query Products
    const {
        data: productsData,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.PRODUCTS.ADMIN_LIST({ status: statusTab, q: searchQuery }),
        queryFn: async () => {
            const queryParams: ProductQueryInput = {
                pageSize: 50,
            }
            if (searchQuery.trim()) queryParams.q = searchQuery.trim()

            if (statusTab === 'PENDING') queryParams.status = 'PENDING'
            else if (statusTab === 'APPROVED') {
                queryParams.status = 'APPROVED'
                queryParams.isSuspended = false
            } else if (statusTab === 'REJECTED') queryParams.status = 'REJECTED'
            else if (statusTab === 'SUSPENDED') queryParams.isSuspended = true

            const res = await listAdminProductsAction(queryParams)
            if (!res.ok) throw new Error(res.code)
            return res.data
        },
    })

    const products = productsData?.items ?? []
    const totalItems = productsData?.totalItems ?? 0

    // Restore Action
    const handleRestore = async (p: ProductSummary) => {
        setRestoringId(p.id)
        try {
            const res = await adminRestoreProductAction(p.id)
            if (res.ok) {
                toast.success(t('restoreSuccess'))
                refetch()
            } else {
                toast.error(res.message || res.code)
            }
        } catch {
            toast.error('Có lỗi xảy ra khi khôi phục sản phẩm.')
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
                                <span>{tProd('status.SUSPENDED')}</span>
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
                        <span>{tProd('status.PENDING')}</span>
                    </Badge>
                )
            case 'APPROVED':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold text-[11px]"
                    >
                        <CheckCircle2 className="size-3" />
                        <span>{tProd('status.APPROVED')}</span>
                    </Badge>
                )
            case 'REJECTED':
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-500 font-semibold text-[11px]"
                    >
                        <XCircle className="size-3" />
                        <span>{tProd('status.REJECTED')}</span>
                    </Badge>
                )
            default:
                return (
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-muted-foreground/40 bg-muted/20 text-muted-foreground font-semibold text-[11px]"
                    >
                        <span>{tProd('status.DRAFT')}</span>
                    </Badge>
                )
        }
    }

    return (
        <section className="space-y-6">
            <Card className="border border-border/80 bg-card/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2.5">
                            <Package className="size-6 text-primary" />
                            <span>{t('title')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                            {t('desc')} ({totalItems} sản phẩm)
                        </CardDescription>
                    </div>
                </CardHeader>

                {/* Filter Tabs & Search */}
                <div className="p-4 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full sm:w-auto">
                        <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
                            <TabsTrigger value="ALL" className="text-xs rounded-lg font-medium">
                                {t('all')}
                            </TabsTrigger>
                            <TabsTrigger value="PENDING" className="text-xs rounded-lg font-medium">
                                {t('pending')}
                            </TabsTrigger>
                            <TabsTrigger value="APPROVED" className="text-xs rounded-lg font-medium">
                                {t('approved')}
                            </TabsTrigger>
                            <TabsTrigger value="SUSPENDED" className="text-xs rounded-lg font-medium">
                                {t('suspended')}
                            </TabsTrigger>
                            <TabsTrigger value="REJECTED" className="text-xs rounded-lg font-medium">
                                {t('rejected')}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full sm:w-72">
                        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm tên sản phẩm, slug, shop..."
                            className="pl-8 text-xs rounded-xl h-9 bg-background/60"
                        />
                    </div>
                </div>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <RefreshCw className="size-6 animate-spin text-primary" />
                            <span className="text-xs font-medium">Đang tải danh sách sản phẩm sàn…</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="p-16 text-center space-y-3">
                            <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                                <Package className="size-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">Không có sản phẩm nào</p>
                                <p className="text-xs text-muted-foreground">
                                    Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-3.5">Sản phẩm</th>
                                        <th className="px-6 py-3.5">Gian hàng</th>
                                        <th className="px-6 py-3.5">Danh mục</th>
                                        <th className="px-6 py-3.5">Khoảng giá</th>
                                        <th className="px-6 py-3.5">Tồn kho</th>
                                        <th className="px-6 py-3.5">Đã bán</th>
                                        <th className="px-6 py-3.5">Trạng thái</th>
                                        <th className="px-6 py-3.5 text-right">Kiểm duyệt / Thao tác</th>
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
                                                        <div className="min-w-0 max-w-[200px]">
                                                            <p
                                                                className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                                                title={p.name}
                                                                onClick={() => {
                                                                    setDetailTarget(p)
                                                                    setDetailModalOpen(true)
                                                                }}
                                                            >
                                                                {p.name}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[11px] text-muted-foreground font-mono truncate">
                                                                    {p.slug}
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

                                                {/* Shop */}
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                                                        <Store className="size-3.5 text-muted-foreground shrink-0" />
                                                        <span className="truncate max-w-[130px]">
                                                            {p.shopName || p.shopId}
                                                        </span>
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

                                                {/* Moderation Actions */}
                                                <td className="px-6 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Review Buttons if Pending */}
                                                        {p.status === 'PENDING' && (
                                                            <>
                                                                {canApprove && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-2.5 rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                                        onClick={() => {
                                                                            setReviewTarget(p)
                                                                            setReviewMode('APPROVE')
                                                                            setReviewDialogOpen(true)
                                                                        }}
                                                                    >
                                                                        <CheckCircle2 className="size-3" />
                                                                        <span>{t('approveAction')}</span>
                                                                    </Button>
                                                                )}
                                                                {canReject && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 px-2.5 rounded-lg text-xs gap-1 border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                                                                        onClick={() => {
                                                                            setReviewTarget(p)
                                                                            setReviewMode('REJECT')
                                                                            setReviewDialogOpen(true)
                                                                        }}
                                                                    >
                                                                        <XCircle className="size-3" />
                                                                        <span>{t('rejectAction')}</span>
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Suspend / Restore Buttons */}
                                                        {p.status !== 'PENDING' && (
                                                            <>
                                                                {p.isSuspended
                                                                    ? canRestore && (
                                                                          <Button
                                                                              size="sm"
                                                                              variant="outline"
                                                                              className="h-8 px-2.5 rounded-lg text-xs gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-medium"
                                                                              onClick={() => handleRestore(p)}
                                                                              disabled={restoringId === p.id}
                                                                          >
                                                                              {restoringId === p.id ? (
                                                                                  <RefreshCw className="size-3 animate-spin" />
                                                                              ) : (
                                                                                  <span>{t('restoreAction')}</span>
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
                                                                              <ShieldAlert className="size-3" />
                                                                              <span>{t('suspendAction')}</span>
                                                                          </Button>
                                                                      )}
                                                            </>
                                                        )}

                                                        {/* Detail View */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setDetailTarget(p)
                                                                setDetailModalOpen(true)
                                                            }}
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="size-4" />
                                                        </Button>
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
            </Card>

            {/* Review Dialog */}
            <ReviewProductDialog
                product={reviewTarget}
                mode={reviewMode}
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                onSucceeded={() => refetch()}
            />

            {/* Suspend Dialog */}
            <SuspendProductDialog
                product={suspendTarget}
                open={suspendDialogOpen}
                onOpenChange={setSuspendDialogOpen}
                onSucceeded={() => refetch()}
                isAdmin={true}
            />

            {/* Quick Detail Dialog */}
            {detailTarget && (
                <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                    <DialogContent className="max-w-lg border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Chi tiết sản phẩm #{detailTarget.id.slice(-6)}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Gian hàng: {detailTarget.shopName || detailTarget.shopId}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2 text-xs">
                            <div className="flex gap-3">
                                {detailTarget.images && detailTarget.images[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={detailTarget.images[0]}
                                        alt={detailTarget.name}
                                        className="size-20 rounded-xl object-cover border border-border shrink-0"
                                    />
                                )}
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground text-sm">{detailTarget.name}</p>
                                    <p className="text-muted-foreground">
                                        Danh mục: {detailTarget.categoryName || '--'}
                                    </p>
                                    <p className="text-primary font-bold">Giá: {formatVnd(detailTarget.minPrice)}</p>
                                    <p className="text-muted-foreground">Tồn kho: {detailTarget.totalStock} sản phẩm</p>
                                </div>
                            </div>

                            {detailTarget.isSuspended && (
                                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 space-y-1">
                                    <p className="font-bold">Đang bị tạm ngưng</p>
                                    <p className="text-xs">{detailTarget.suspendedReason}</p>
                                </div>
                            )}

                            {detailTarget.images && detailTarget.images.length > 1 && (
                                <div className="space-y-1.5">
                                    <p className="font-semibold text-muted-foreground">
                                        Thư viện ảnh ({detailTarget.images.length} ảnh):
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {detailTarget.images.map((img, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={i}
                                                src={img}
                                                alt={`Img ${i}`}
                                                className="size-14 rounded-lg object-cover border border-border shrink-0"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detailTarget.videos && detailTarget.videos.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="font-semibold text-muted-foreground">
                                        Video sản phẩm ({detailTarget.videos.length} video):
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {detailTarget.videos.map((vid, i) => (
                                            <div
                                                key={i}
                                                className="rounded-xl overflow-hidden border border-border bg-black/40 aspect-video relative"
                                            >
                                                <video
                                                    src={vid}
                                                    controls
                                                    preload="metadata"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    )
}
