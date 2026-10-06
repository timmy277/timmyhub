'use client'

import React, { useEffect, useState } from 'react'
import {
    AlertCircle,
    Ban,
    CheckCircle2,
    Layers,
    Package,
    Sparkles,
    Star,
    Store,
    Tag,
    Video,
    XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ProductDetail } from '@timmyhub/contracts'
import { ProductStatus } from '@timmyhub/contracts'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components'
import { StatusTone } from '@/constants'

import { getProductDetailAction } from '../actions'
import { ReviewProductDialog } from './review-product-dialog'
import { SuspendProductDialog } from './suspend-product-dialog'

interface ProductDetailPanelProps {
    id: string
    isAdmin?: boolean
    initialDetail?: ProductDetail | null
}

function formatVnd(val: number | null | undefined): string {
    if (val === null || val === undefined) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

export function ProductDetailPanel({ id, isAdmin = false, initialDetail }: ProductDetailPanelProps) {
    const [product, setProduct] = useState<ProductDetail | null>(initialDetail ?? null)
    const [loading, setLoading] = useState(!initialDetail)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    // Dialog state
    const [reviewMode, setReviewMode] = useState<'APPROVE' | 'REJECT' | null>(null)
    const [suspendOpen, setSuspendOpen] = useState(false)

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            const res = await getProductDetailAction(id)
            if (mounted) {
                if (res.ok && res.data) {
                    setProduct(res.data)
                    if (res.data.images?.[0]) setSelectedImage(res.data.images[0])
                } else {
                    toast.error('Không tìm thấy thông tin sản phẩm.')
                }
                setLoading(false)
            }
        }
        void load()
        return () => {
            mounted = false
        }
    }, [id])

    if (loading) {
        return (
            <div className="py-20 text-center space-y-3">
                <div className="size-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground">Đang tải thông tin sản phẩm…</p>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="py-16 text-center space-y-3 bg-card/40 rounded-2xl border border-dashed border-border">
                <Package className="size-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Không tìm thấy thông tin sản phẩm</p>
                <p className="text-xs text-muted-foreground">
                    Sản phẩm này có thể đã bị gỡ bỏ hoặc bạn không có quyền xem.
                </p>
            </div>
        )
    }

    const currentImage = selectedImage || product.images?.[0]

    return (
        <div className="space-y-6 pb-8">
            {/* ═══════════════════════════════════════════════════════════════════
             * HEADER BANNER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-muted/20">
                <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-foreground truncate">{product.name}</h2>

                        {product.isSuspended ? (
                            <StatusBadge label="Tạm ngưng bán" tone={StatusTone.NEUTRAL} />
                        ) : (
                            <StatusBadge
                                label={
                                    product.status === ProductStatus.APPROVED
                                        ? 'Đang bán'
                                        : product.status === ProductStatus.PENDING
                                          ? 'Chờ duyệt'
                                          : product.status === ProductStatus.REJECTED
                                            ? 'Bị từ chối'
                                            : 'Bản nháp'
                                }
                                tone={
                                    product.status === ProductStatus.APPROVED
                                        ? StatusTone.SUCCESS
                                        : product.status === ProductStatus.PENDING
                                          ? StatusTone.NEUTRAL
                                          : product.status === ProductStatus.REJECTED
                                            ? StatusTone.DANGER
                                            : StatusTone.NEUTRAL
                                }
                            />
                        )}

                        {product.isFeatured && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                                <Sparkles className="size-2.5" />
                                Nổi bật
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono">{product.slug}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                            <Tag className="size-3 text-primary" />
                            {product.categoryName || 'Chưa phân loại'}
                        </span>
                        {product.shopName && (
                            <>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                    <Store className="size-3 text-primary" />
                                    {product.shopName}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {isAdmin && product.status === ProductStatus.PENDING && (
                        <>
                            <Button
                                size="sm"
                                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => setReviewMode('APPROVE')}
                            >
                                <CheckCircle2 className="size-3.5" />
                                <span>Phê duyệt</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-xl font-bold text-xs gap-1"
                                onClick={() => setReviewMode('REJECT')}
                            >
                                <XCircle className="size-3.5" />
                                <span>Từ chối</span>
                            </Button>
                        </>
                    )}

                    {!product.isSuspended && product.status === ProductStatus.APPROVED && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold gap-1 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                            onClick={() => setSuspendOpen(true)}
                        >
                            <Ban className="size-3.5" />
                            <span>Tạm ngưng</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Warning / Audit alert if rejected or suspended */}
            {product.isSuspended && product.suspendedReason && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1">
                    <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="size-4" />
                        <span>Sản phẩm đang bị tạm ngưng kinh doanh</span>
                    </p>
                    <p className="text-muted-foreground pl-5.5">Lý do: {product.suspendedReason}</p>
                </div>
            )}

            {product.status === ProductStatus.REJECTED && product.reviewNote && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1">
                    <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="size-4" />
                        <span>Sản phẩm bị từ chối phê duyệt</span>
                    </p>
                    <p className="text-muted-foreground pl-5.5">Phản hồi của kiểm duyệt viên: {product.reviewNote}</p>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * MEDIA & KPI OVERVIEW
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Media gallery (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                    <Card className="border border-border/80 bg-card overflow-hidden rounded-2xl">
                        <div className="aspect-square bg-muted/40 relative flex items-center justify-center overflow-hidden">
                            {currentImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={currentImage} alt={product.name} className="size-full object-contain p-2" />
                            ) : (
                                <Package className="size-16 text-muted-foreground" />
                            )}
                        </div>

                        {/* Image thumbnails */}
                        {product.images && product.images.length > 1 && (
                            <div className="p-3 border-t border-border/60 flex items-center gap-2 overflow-x-auto">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedImage(img)}
                                        className={`size-14 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                                            currentImage === img
                                                ? 'border-primary shadow-sm'
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img} alt="" className="size-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Videos if available */}
                    {product.videos && product.videos.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                <Video className="size-4 text-primary" />
                                <span>Video giới thiệu sản phẩm ({product.videos.length})</span>
                            </p>
                            <div className="space-y-1.5">
                                {product.videos.map((vid, idx) => (
                                    <video
                                        key={idx}
                                        src={vid}
                                        controls
                                        className="w-full rounded-lg max-h-48 bg-black"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info & Metrics (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">Khoảng giá</span>
                            <span className="text-base font-extrabold text-primary font-mono block mt-1">
                                {product.minPrice !== null &&
                                product.maxPrice !== null &&
                                product.minPrice !== product.maxPrice
                                    ? `${formatVnd(product.minPrice)} - ${formatVnd(product.maxPrice)}`
                                    : formatVnd(product.minPrice)}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">Tổng tồn kho</span>
                            <span className="text-base font-extrabold text-foreground block mt-1">
                                {product.totalStock}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">Đã bán</span>
                            <span className="text-base font-extrabold text-foreground block mt-1">
                                {product.soldCount}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">Đánh giá</span>
                            <span className="text-base font-extrabold text-amber-500 block mt-1 flex items-center gap-1">
                                <Star className="size-4 fill-current" />
                                <span>{product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : '5.0'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden">
                        <CardHeader className="p-4 border-b border-border/60">
                            <CardTitle className="text-sm font-bold">Mô tả sản phẩm</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {product.description || 'Chưa có thông tin mô tả chi tiết.'}
                        </CardContent>
                    </Card>

                    {/* Variants Table */}
                    {product.variants && product.variants.length > 0 && (
                        <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden">
                            <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="size-4 text-primary" />
                                    <span>Danh sách biến thể phân loại ({product.variants.length})</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-2.5">Mã SKU</th>
                                            <th className="px-4 py-2.5">Phân loại</th>
                                            <th className="px-4 py-2.5 text-right">Giá bán</th>
                                            <th className="px-4 py-2.5 text-right">Tồn kho</th>
                                            <th className="px-4 py-2.5 text-center">Mặc định</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {product.variants.map((v) => (
                                            <tr key={v.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-2.5 font-mono text-foreground font-medium">
                                                    {v.sku || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {v.optionKey || 'Mặc định'}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold font-mono text-foreground">
                                                    {formatVnd(v.price)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold">{v.stock}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {v.isDefault ? (
                                                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                            Mặc định
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Review Dialog */}
            <ReviewProductDialog
                product={product}
                mode={reviewMode}
                open={Boolean(reviewMode)}
                onOpenChange={(open) => !open && setReviewMode(null)}
                onSucceeded={() => {
                    setReviewMode(null)
                    void getProductDetailAction(id).then((r) => r.ok && r.data && setProduct(r.data))
                }}
            />

            {/* Suspend Dialog */}
            <SuspendProductDialog
                product={product}
                isAdmin={isAdmin}
                open={suspendOpen}
                onOpenChange={setSuspendOpen}
                onSucceeded={() => {
                    setSuspendOpen(false)
                    void getProductDetailAction(id).then((r) => r.ok && r.data && setProduct(r.data))
                }}
            />
        </div>
    )
}
