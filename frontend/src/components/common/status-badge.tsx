import { Badge } from '@/components/ui'
import { STATUS_TONE_BADGE_VARIANT, STATUS_TONE_DOT_CLASS, type StatusTone } from '@/constants'
import { cn } from '@/utils'

interface StatusBadgeProps {
    tone: StatusTone
    // Nhãn đã dịch — màu chỉ là tín hiệu phụ, không bao giờ là cách duy nhất truyền trạng thái (WCAG 1.4.1).
    label: string
    className?: string
}

// Badge trạng thái (hoạt động/đã khoá…): chấm màu theo sắc thái + nhãn chữ. 7 trạng thái: mặc định · còn lại N/A —
// chỉ hiển thị, dữ liệu đến từ hàng/bản ghi chứa nó.
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
    return (
        <Badge variant={STATUS_TONE_BADGE_VARIANT[tone]} className={className}>
            <span aria-hidden className={cn('size-1.5 rounded-full', STATUS_TONE_DOT_CLASS[tone])} />
            {label}
        </Badge>
    )
}
