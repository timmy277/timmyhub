import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'
import { cn } from '@/utils'

interface ErrorStateProps {
    // Mặc định lấy chuỗi chung `common.errorTitle`.
    title?: string
    description?: string
    // Có `onRetry` mới hiện nút thử lại.
    onRetry?: () => void
    retryLabel?: string
    className?: string
}

// Khối báo lỗi kèm nút thử lại, dùng cho error boundary của route và lỗi tải dữ liệu trong bảng. `role="alert"` để
// trình đọc màn hình đọc ngay khi khối xuất hiện.
export function ErrorState({ title, description, onRetry, retryLabel, className }: ErrorStateProps) {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/40',
                'bg-destructive/5 p-6 text-center',
                className,
            )}
        >
            <TriangleAlertIcon className="size-8 text-destructive" aria-hidden />
            <div className="flex flex-col gap-1">
                <p className="font-heading text-base font-medium text-foreground">{title ?? t('errorTitle')}</p>
                {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
            </div>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    <RefreshCwIcon data-icon="inline-start" />
                    {retryLabel ?? t('retry')}
                </Button>
            )}
        </div>
    )
}
