'use client'

import React, { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { ProductDetail, ProductSummary } from '@timmyhub/contracts'

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

import { adminSuspendProductAction, sellerSuspendProductAction } from '../actions'

const SUSPEND_REASON_PRESETS = [
    'Tạm ngưng để cập nhật giá và tồn kho',
    'Tạm thời hết nguồn hàng hoặc ngưng sản xuất',
    'Chỉnh sửa lại mô tả và thông số kỹ thuật',
    'Kiểm tra lại chất lượng hoặc xử lý phản ánh',
    'Vi phạm tiêu chuẩn hoặc chính sách sàn',
]

interface SuspendProductDialogProps {
    product: ProductSummary | ProductDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSucceeded: () => void
    isAdmin?: boolean
}

export function SuspendProductDialog({
    product,
    open,
    onOpenChange,
    onSucceeded,
    isAdmin = false,
}: SuspendProductDialogProps) {
    const t = useTranslations('products.dialog')
    const tMsg = useTranslations('products.messages')
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    if (!product) return null

    const handleConfirm = async () => {
        if (!reason.trim() || reason.trim().length < 3) {
            toast.error('Vui lòng nhập lý do tạm ngưng (tối thiểu 3 ký tự).')
            return
        }

        setSubmitting(true)
        try {
            const res = isAdmin
                ? await adminSuspendProductAction(product.id, { reason: reason.trim() })
                : await sellerSuspendProductAction(product.id, { reason: reason.trim() })

            if (res.ok) {
                toast.success(tMsg('suspendSuccess'))
                setReason('')
                onOpenChange(false)
                onSucceeded()
            } else {
                toast.error(tMsg('suspendFailed', { error: res.message || res.code }))
            }
        } catch {
            toast.error(tMsg('suspendFailed', { error: '' }))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center gap-2.5 text-amber-500">
                        <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <AlertTriangle className="size-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-foreground">{t('suspendTitle')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        {t('suspendDesc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-3">
                        {product.images && product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={product.images[0]}
                                alt={product.name}
                                className="size-11 rounded-lg object-cover border border-border/60 shrink-0"
                            />
                        ) : (
                            <div className="size-11 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                                No img
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">Slug: {product.slug}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>{t('suspendReasonLabel')}</span>
                            <span className="text-[10px] text-muted-foreground">Tối thiểu 3 ký tự</span>
                        </label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('suspendReasonPlaceholder')}
                            className="text-xs rounded-xl min-h-[90px] resize-none"
                            maxLength={500}
                        />

                        {/* Preset quick picks */}
                        <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-medium text-muted-foreground">Gợi ý lý do nhanh:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {SUSPEND_REASON_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setReason(preset)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg border border-border/60 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-xl text-xs font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={handleConfirm}
                        disabled={submitting || !reason.trim() || reason.trim().length < 3}
                    >
                        {submitting ? (
                            <>
                                <RefreshCw className="size-3.5 animate-spin" />
                                <span>{t('submitting')}</span>
                            </>
                        ) : (
                            <span>{t('suspendConfirm')}</span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
