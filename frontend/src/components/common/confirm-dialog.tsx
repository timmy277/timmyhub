'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from '@/components/ui'

export interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: ReactNode
    confirmLabel: string
    // Mặc định `common.cancel`.
    cancelLabel?: string
    variant?: 'default' | 'destructive'
    // Có thể trả Promise: hộp thoại giữ mở, khoá nút và hiện spinner tới khi xong. Promise bị từ chối thì hộp thoại
    // vẫn mở để người dùng thử lại — nơi gọi tự báo lỗi (vd `toast.promise`).
    onConfirm: () => void | Promise<void>
    icon?: ReactNode
}

// Hộp xác nhận cho hành động nhạy cảm (khoá, xoá…), bọc AlertDialog của shadcn. 7 trạng thái: mặc định · đang tải
// (đang chờ `onConfirm` — nút xác nhận hiện spinner, `aria-busy`) · rỗng (N/A) · lỗi (Promise từ chối → giữ mở để thử
// lại) · không có quyền (nơi gọi không mở hộp thoại) · vô hiệu hoá (hai nút khoá trong lúc chờ, không đóng được bằng
// Esc) · thành công (tự đóng; nơi gọi báo toast).
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = 'default',
    onConfirm,
    icon,
}: ConfirmDialogProps) {
    // ===== State =====
    const [pending, setPending] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('common')

    // ===== Derived =====
    const isDestructive = variant === 'destructive'

    // ===== Handlers =====
    const handleOpenChange = (next: boolean) => {
        if (!pending) onOpenChange(next)
    }

    const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
        // Chặn Radix tự đóng — chỉ đóng khi `onConfirm` hoàn tất.
        event.preventDefault()
        setPending(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } catch {
            // Cố ý nuốt lỗi: nơi gọi đã báo lỗi cho người dùng; hộp thoại giữ mở để thử lại.
        } finally {
            setPending(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent aria-busy={pending}>
                <AlertDialogHeader>
                    <AlertDialogMedia className={isDestructive ? 'bg-destructive/10 text-destructive' : undefined}>
                        {icon ?? <TriangleAlertIcon />}
                    </AlertDialogMedia>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>{cancelLabel ?? t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction variant={variant} disabled={pending} onClick={handleConfirm}>
                        {pending && (
                            <Loader2Icon
                                data-icon="inline-start"
                                className="animate-spin motion-reduce:animate-none"
                                aria-hidden
                            />
                        )}
                        {pending ? t('processing') : confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
