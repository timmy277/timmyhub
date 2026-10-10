'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
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
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ProductDetail } from '@timmyhub/contracts'
import { ProductStatus } from '@timmyhub/contracts'

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components'
import { StatusTone } from '@/constants'
import { formatCurrencyVND } from '@/utils'

import { getProductDetailAction } from '../actions'
import { ReviewProductDialog } from './review-product-dialog'
import { SuspendProductDialog } from './suspend-product-dialog'

interface ProductDetailPanelProps {
    id: string
    isAdmin?: boolean
    initialDetail?: ProductDetail | null
}

const formatVnd = formatCurrencyVND

export function ProductDetailPanel({ id, isAdmin = false, initialDetail }: ProductDetailPanelProps) {
    const t = useTranslations('products')
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
                    toast.error(t('notFoundTitle'))
                }
                setLoading(false)
            }
        }
        void load()
        return () => {
            mounted = false
        }
    }, [id, t])

    if (loading) {
        return (
            <div className="py-20 text-center space-y-3">
                <div className="size-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground">{t('loadingDetail')}</p>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="py-16 text-center space-y-3 bg-card/40 rounded-2xl border border-dashed border-border">
                <Package className="size-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">{t('notFoundTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('notFoundDesc')}</p>
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
                            <StatusBadge label={t('status.SUSPENDED')} tone={StatusTone.NEUTRAL} />
                        ) : (
                            <StatusBadge
                                label={
                                    product.status === ProductStatus.APPROVED
                                        ? t('status.APPROVED')
                                        : product.status === ProductStatus.PENDING
                                          ? t('status.PENDING')
                                          : product.status === ProductStatus.REJECTED
                                            ? t('status.REJECTED')
                                            : t('status.DRAFT')
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
                                {t('featured')}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono">{product.slug}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                            <Tag className="size-3 text-primary" />
                            {product.categoryName || t('uncategorized')}
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
                                <span>{t('actions.approve')}</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-xl font-bold text-xs gap-1"
                                onClick={() => setReviewMode('REJECT')}
                            >
                                <XCircle className="size-3.5" />
                                <span>{t('actions.reject')}</span>
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
                            <span>{t('actions.suspend')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Warning / Audit alert if rejected or suspended */}
            {product.isSuspended && product.suspendedReason && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1">
                    <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="size-4" />
                        <span>{t('suspendedAlertTitle')}</span>
                    </p>
                    <p className="text-muted-foreground pl-5.5">
                        {t('suspendedAlertReason', { reason: product.suspendedReason })}
                    </p>
                </div>
            )}

            {product.status === ProductStatus.REJECTED && product.reviewNote && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1">
                    <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="size-4" />
                        <span>{t('rejectedAlertTitle')}</span>
                    </p>
                    <p className="text-muted-foreground pl-5.5">
                        {t('rejectedAlertFeedback', { note: product.reviewNote })}
                    </p>
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
                                <Image
                                    src={currentImage}
                                    alt={product.name}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 40vw"
                                    className="object-contain p-2"
                                />
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
                                        className={`relative size-14 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                                            currentImage === img
                                                ? 'border-primary shadow-sm'
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <Image src={img} alt="" fill sizes="56px" className="object-cover" />
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
                                <span>{t('videosTitle', { count: product.videos.length })}</span>
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
                            <span className="text-[11px] text-muted-foreground block">{t('priceRangeCard')}</span>
                            <span className="text-base font-extrabold text-primary font-mono block mt-1">
                                {product.minPrice !== null &&
                                product.maxPrice !== null &&
                                product.minPrice !== product.maxPrice
                                    ? `${formatVnd(product.minPrice)} - ${formatVnd(product.maxPrice)}`
                                    : formatVnd(product.minPrice)}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">{t('totalStockCard')}</span>
                            <span className="text-base font-extrabold text-foreground block mt-1">
                                {product.totalStock}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">{t('soldCountCard')}</span>
                            <span className="text-base font-extrabold text-foreground block mt-1">
                                {product.soldCount}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
                            <span className="text-[11px] text-muted-foreground block">{t('ratingCard')}</span>
                            <span className="text-base font-extrabold text-amber-500 block mt-1 flex items-center gap-1">
                                <Star className="size-4 fill-current" />
                                <span>{product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : '5.0'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden">
                        <CardHeader className="p-4 border-b border-border/60">
                            <CardTitle className="text-sm font-bold">{t('descriptionTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {product.description || t('noDescription')}
                        </CardContent>
                    </Card>

                    {/* Variants Table */}
                    {product.variants && product.variants.length > 0 && (
                        <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden">
                            <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="size-4 text-primary" />
                                    <span>{t('variantsTitle', { count: product.variants.length })}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-2.5">{t('skuCol')}</th>
                                            <th className="px-4 py-2.5">{t('variantCol')}</th>
                                            <th className="px-4 py-2.5 text-right">{t('priceCol')}</th>
                                            <th className="px-4 py-2.5 text-right">{t('stockCol')}</th>
                                            <th className="px-4 py-2.5 text-center">{t('defaultCol')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {product.variants.map((v) => (
                                            <tr key={v.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-2.5 font-mono text-foreground font-medium">
                                                    {v.sku || '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {v.optionKey || t('defaultBadge')}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold font-mono text-foreground">
                                                    {formatVnd(v.price)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold">{v.stock}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {v.isDefault ? (
                                                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                            {t('defaultBadge')}
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
