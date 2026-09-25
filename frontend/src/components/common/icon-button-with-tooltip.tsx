'use client'

import type { ComponentProps, ReactNode } from 'react'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

type IconButtonSize = 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

export interface IconButtonWithTooltipProps extends Omit<ComponentProps<typeof Button>, 'children' | 'size'> {
    // Bắt buộc: nút chỉ có icon thì `aria-label` là tên truy cập duy nhất (WCAG 4.1.2). Chuỗi đã qua i18n.
    'aria-label': string
    icon: ReactNode
    // Chữ trong tooltip; bỏ trống thì dùng `aria-label`. Tách riêng để aria có thể dài hơn (kèm tên bản ghi).
    tooltip?: string
    tooltipSide?: ComponentProps<typeof TooltipContent>['side']
    size?: IconButtonSize
}

// Nút icon kèm tooltip. 7 trạng thái: mặc định · đang tải (N/A — nơi dùng tự đổi icon/disabled) · rỗng (N/A) ·
// lỗi (N/A) · không có quyền (nơi dùng không render hoặc `disabled`) · vô hiệu hoá (bọc span nhận focus để tooltip
// vẫn giải thích lý do — nút disabled không nhận hover/focus) · thành công (N/A — thao tác tự báo toast).
// Vùng bấm tối thiểu 24×24 px: `icon-xs` là 24px, các cỡ còn lại lớn hơn.
export function IconButtonWithTooltip({
    'aria-label': ariaLabel,
    icon,
    tooltip,
    tooltipSide,
    size = 'icon-sm',
    variant = 'ghost',
    type = 'button',
    disabled,
    className,
    ...buttonProps
}: IconButtonWithTooltipProps) {
    // ===== Derived =====
    const button = (
        <Button
            type={type}
            size={size}
            variant={variant}
            aria-label={ariaLabel}
            disabled={disabled}
            className={className}
            {...buttonProps}
        >
            {icon}
        </Button>
    )

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {disabled ? (
                    // Span nhận focus bàn phím thay cho nút disabled, mang cùng tên truy cập để trình đọc màn hình
                    // đọc được lý do.
                    <span
                        tabIndex={0}
                        role="button"
                        aria-disabled="true"
                        aria-label={ariaLabel}
                        className="inline-flex rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        {button}
                    </span>
                ) : (
                    button
                )}
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>{tooltip ?? ariaLabel}</TooltipContent>
        </Tooltip>
    )
}
