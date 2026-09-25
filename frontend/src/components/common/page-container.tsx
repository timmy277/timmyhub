import type { ReactNode } from 'react'

import { cn } from '@/utils'

interface PageContainerProps {
    children: ReactNode
    // Có `title` thì render `<h1>` — mỗi trang một h1 (SEO + điều hướng bằng heading của trình đọc màn hình).
    title?: string
    description?: string
    // Nút hành động cấp trang, nằm bên phải tiêu đề (xuống dòng ở màn hẹp).
    actions?: ReactNode
    className?: string
}

// Khung nội dung chuẩn của một trang trong NavLayout: padding, khoảng cách và tiêu đề thống nhất. Server Component.
export function PageContainer({ children, title, description, actions, className }: PageContainerProps) {
    return (
        <div className={cn('flex flex-1 flex-col gap-4 p-4', className)}>
            {(title ?? actions) && (
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                        {title && <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </header>
            )}
            {children}
        </div>
    )
}
