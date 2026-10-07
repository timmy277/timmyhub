'use client'

import React, { useState } from 'react'
import { AlertCircle, Check, RefreshCw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { SellerApplicationDetail } from '@timmyhub/contracts'

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

import { approveSellerApplicationAction, rejectSellerApplicationAction } from '../actions'

const REJECT_REASON_PRESETS = [
    'Ảnh CCCD / giấy tờ bị mờ, không rõ thông tin định danh',
    'Mã số thuế không trùng khớp với cơ sở dữ liệu hoặc hồ sơ đăng ký',
    'Tên shop vi phạm quy chuẩn thương hiệu hoặc chứa từ khoá cấm',
    'Địa chỉ kho hàng không hợp lệ hoặc thiếu thông tin cụ thể',
    'Hồ sơ không đáp ứng tiêu chuẩn đối tác người bán trên sàn',
]

interface ApproveDialogProps {
    app: SellerApplicationDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSucceeded: () => void
}

export function ApproveDialog({ app, open, onOpenChange, onSucceeded }: ApproveDialogProps) {
    const t = useTranslations('sellerApplications')
    const [submitting, setSubmitting] = useState(false)

    if (!app) return null

    const handleConfirm = async () => {
        setSubmitting(true)
        try {
            const res = await approveSellerApplicationAction(app.id)
            if (res.ok) {
                toast.success(t('approveSuccess', { shopName: app.shopName }))
                onOpenChange(false)
                onSucceeded()
            } else {
                toast.error(t('approveFailed', { error: res.message || res.code }))
            }
        } catch {
            toast.error(t('approveFailed', { error: '' }))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Check className="size-5 text-emerald-600" />
                        {t('approveDialogTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-left pt-2 text-sm">
                        {t('approveDialogDesc', { shopName: app.shopName })}
                        <br />
                        <span className="block mt-2 text-xs text-muted-foreground">{t('approveDialogNotice')}</span>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="default"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                        {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        {t('confirmApprove')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface RejectDialogProps {
    app: SellerApplicationDetail | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSucceeded: () => void
}

export function RejectDialog({ app, open, onOpenChange, onSucceeded }: RejectDialogProps) {
    const t = useTranslations('sellerApplications')
    const [submitting, setSubmitting] = useState(false)
    const [reason, setReason] = useState('')

    if (!app) return null

    const handleConfirm = async () => {
        if (!reason.trim()) {
            toast.error(t('rejectReasonRequired'))
            return
        }

        setSubmitting(true)
        try {
            const res = await rejectSellerApplicationAction(app.id, {
                status: 'REJECT',
                reviewNote: reason.trim(),
            })
            if (res.ok) {
                toast.success(t('rejectSuccess', { shopName: app.shopName }))
                onOpenChange(false)
                setReason('')
                onSucceeded()
            } else {
                toast.error(t('rejectFailed', { error: res.message || res.code }))
            }
        } catch {
            toast.error(t('rejectFailed', { error: '' }))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="size-5" />
                        {t('rejectDialogTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-left pt-1 text-sm">
                        {t('rejectDialogDesc', { shopName: app.shopName })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        {t('rejectPresetsTitle')}
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5">
                        {REJECT_REASON_PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setReason(preset)}
                                className="text-left text-xs px-2.5 py-1.5 rounded-lg border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-medium text-foreground">
                            {t('rejectReasonLabel')} <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                            placeholder={t('rejectReasonPlaceholder')}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="text-sm rounded-xl resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-2 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={submitting || !reason.trim()}
                        className="gap-1.5"
                    >
                        {submitting ? <RefreshCw className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        {t('confirmReject')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
