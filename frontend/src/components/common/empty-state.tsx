import type { ReactNode } from 'react'
import { InboxIcon } from 'lucide-react'

import { cn } from '@/utils'

interface EmptyStateProps {
    title: string
    description?: string
    // Icon trang trí; mặc định hộp thư rỗng.
    icon?: ReactNode
    // Hành động gợi ý (nút tạo mới, quay về trang chủ…).
    action?: ReactNode
    className?: string
}

// Khối "không có gì để hiện" dùng chung cho danh sách rỗng và trang 404. Server Component — không có state.
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 p-6 text-center', className)}>
            <span aria-hidden className="text-muted-foreground [&_svg]:size-10">
                {icon ?? <InboxIcon />}
            </span>
            <div className="flex flex-col gap-1">
                <p className="font-heading text-base font-medium text-foreground">{title}</p>
                {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
        </div>
    )
}
