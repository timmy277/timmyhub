'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ProductDetail, ProductSummary, ReviewProductInput } from '@timmyhub/contracts'
import { ReviewProductSchema } from '@timmyhub/contracts'

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Textarea,
} from '@/components'

import { adminApproveProductAction, adminRejectProductAction } from '../actions'

const REJECT_REASONS = [
    'Hình ảnh sản phẩm mờ, chất lượng thấp hoặc chứa nội dung nhạy cảm',
    'Mô tả sản phẩm không rõ ràng hoặc sai lệch tính năng',
    'Danh mục sản phẩm không phù hợp với phân loại sản phẩm',
    'Giá bán hoặc thông tin biến thể không đồng nhất',
    'Sản phẩm thuộc danh mục hạn chế kinh doanh trên sàn',
]

interface ReviewProductDialogProps {
    product: ProductSummary | ProductDetail | null
    mode: 'APPROVE' | 'REJECT' | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSucceeded: () => void
}

export function ReviewProductDialog({ product, mode, open, onOpenChange, onSucceeded }: ReviewProductDialogProps) {
    const t = useTranslations('adminProducts')

    const isApprove = mode === 'APPROVE'

    const {
        register,
        handleSubmit,
        setValue,
        control,
        reset,
        formState: { isSubmitting, errors },
    } = useForm<ReviewProductInput>({
        resolver: zodResolver(ReviewProductSchema),
        defaultValues: {
            action: mode ?? 'APPROVE',
            reviewNote: '',
        },
    })

    useEffect(() => {
        if (open && mode) {
            reset({
                action: mode,
                reviewNote: '',
            })
        }
    }, [open, mode, reset])

    const currentNote = useWatch({ control, name: 'reviewNote' }) ?? ''

    if (!product || !mode) return null

    const onSubmit = async (data: ReviewProductInput) => {
        try {
            if (isApprove) {
                const res = await adminApproveProductAction(product.id)
                if (res.ok) {
                    toast.success(t('approveSuccess'))
                    onOpenChange(false)
                    onSucceeded()
                } else {
                    toast.error(res.message || res.code)
                }
            } else {
                if (!data.reviewNote?.trim()) {
                    toast.error(t('rejectReasonRequired'))
                    return
                }
                const res = await adminRejectProductAction(product.id, {
                    action: 'REJECT',
                    reviewNote: data.reviewNote.trim(),
                })
                if (res.ok) {
                    toast.success(t('rejectSuccess'))
                    reset()
                    onOpenChange(false)
                    onSucceeded()
                } else {
                    toast.error(res.message || res.code)
                }
            }
        } catch {
            toast.error(t('processError'))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={`size-9 rounded-xl flex items-center justify-center ${
                                    isApprove ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}
                            >
                                {isApprove ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
                            </div>
                            <DialogTitle className="text-lg font-bold text-foreground">
                                {isApprove ? t('approveTitle') : t('rejectTitle')}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            {isApprove ? t('approveDesc', { name: product.name }) : t('rejectDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-3">
                            {product.images && product.images[0] ? (
                                <div className="relative size-11 rounded-lg overflow-hidden border border-border/60 shrink-0">
                                    <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        sizes="44px"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="size-11 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                                    No img
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Shop:{' '}
                                    <span className="font-semibold text-foreground">
                                        {product.shopName || product.shopId}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {!isApprove && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground">
                                    {t('rejectReasonLabel')}
                                </label>
                                <Textarea
                                    {...register('reviewNote')}
                                    placeholder={t('rejectReasonPlaceholder')}
                                    className="text-xs rounded-xl min-h-[90px] resize-none"
                                    maxLength={500}
                                />
                                {errors.reviewNote && (
                                    <p className="text-[11px] text-destructive font-medium mt-1">
                                        {errors.reviewNote.message}
                                    </p>
                                )}

                                <div className="space-y-1.5 pt-1">
                                    <p className="text-[11px] font-medium text-muted-foreground">
                                        {t('commonReasons')}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {REJECT_REASONS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setValue('reviewNote', preset, { shouldValidate: true })}
                                                className="text-[11px] px-2.5 py-1 rounded-lg border border-border/60 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className={`rounded-xl text-xs font-bold gap-2 text-white ${
                                isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                            disabled={isSubmitting || (!isApprove && !currentNote.trim())}
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="size-3.5 animate-spin" />
                                    <span>{t('submitting')}</span>
                                </>
                            ) : isApprove ? (
                                <span>{t('approveConfirm')}</span>
                            ) : (
                                <span>{t('rejectConfirm')}</span>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
