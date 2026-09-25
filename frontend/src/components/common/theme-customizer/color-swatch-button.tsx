'use client'

import { CheckIcon } from 'lucide-react'

import { cn } from '@/utils'

interface ColorSwatchButtonProps {
    color: string
    label: string
    selected: boolean
    onSelect: () => void
    disabled?: boolean
}

// Nút swatch tròn dùng chung cho Base Color / Theme / Chart Color. Vùng bấm 24x24px (luật 11),
// hover/select chỉ animate transform/opacity (luật 10), tick hiển thị khi đang chọn.
//
// Cố ý dùng `<button>` trần thay cho `Button` của shadcn: swatch là ô màu tròn 24px tô bằng màu dữ liệu (inline
// `backgroundColor`), không có chữ/padding — mọi variant của `Button` đều áp nền, padding, bo góc và
// `active:translate-y-px` phải ghi đè hết, không còn gì để tái sử dụng. Vẫn giữ `type`, `aria-pressed`,
// `aria-label` và focus ring như Button.
export function ColorSwatchButton({ color, label, selected, onSelect, disabled }: ColorSwatchButtonProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                'relative flex size-6 shrink-0 items-center justify-center rounded-full outline-none',
                'ring-1 ring-inset ring-foreground/10 transition-transform duration-150 ease-out',
                'hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                'motion-reduce:transition-none motion-reduce:hover:scale-100',
            )}
            style={{ backgroundColor: color }}
        >
            {/* Nền là màu tuỳ ý của swatch, không phải token — tick trắng + bóng đổ đọc được trên mọi màu. */}
            {selected ? <CheckIcon className="size-3.5 text-white drop-shadow" aria-hidden /> : null}
        </button>
    )
}
