'use client'

import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils'

import { IconButtonWithTooltip } from './icon-button-with-tooltip'

export interface RowAction {
    key: string
    // Nhãn ngắn hiện trong tooltip ("Khoá").
    label: string
    // Tên truy cập đầy đủ, kèm bản ghi ("Khoá an.nguyen@…") — nhiều hàng cùng nút thì trình đọc màn hình mới phân biệt.
    ariaLabel: string
    icon: LucideIcon
    onClick: () => void
    disabled?: boolean
    destructive?: boolean
}

interface RowActionsProps {
    actions: readonly RowAction[]
    className?: string
}

// Cụm nút thao tác cuối hàng (bảng, danh sách). 7 trạng thái: mặc định · đang tải (N/A — hàng chưa có dữ liệu thì cột
// không render) · rỗng (mảng rỗng → không render gì) · lỗi (N/A) · không có quyền (nơi dùng bỏ action khỏi mảng) ·
// vô hiệu hoá (`disabled`, tooltip vẫn hiện lý do) · thành công (N/A — thao tác tự báo toast).
export function RowActions({ actions, className }: RowActionsProps) {
    if (actions.length === 0) return null

    return (
        <div className={cn('flex items-center gap-1', className)}>
            {actions.map(({ key, label, ariaLabel, icon: Icon, onClick, disabled, destructive }) => (
                <IconButtonWithTooltip
                    key={key}
                    aria-label={ariaLabel}
                    tooltip={label}
                    icon={<Icon />}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        key === 'edit' &&
                            'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300',
                        key === 'view' &&
                            'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
                        key === 'toggle' &&
                            destructive &&
                            'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300',
                        key !== 'toggle' &&
                            (key === 'delete' || destructive) &&
                            'text-destructive hover:text-destructive',
                    )}
                />
            ))}
        </div>
    )
}
