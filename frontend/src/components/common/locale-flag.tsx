import { useId, type ComponentType, type SVGProps } from 'react'

import type { Locale } from '@/types'
import { cn } from '@/utils'

type FlagProps = SVGProps<SVGSVGElement>

// Cờ vẽ bằng SVG inline, không dùng emoji: Windows không render emoji cờ (chỉ hiện "VN"/"GB").
function VietnamFlag(props: FlagProps) {
    return (
        <svg viewBox="0 0 30 20" {...props}>
            <rect width="30" height="20" fill="#da251d" />
            <polygon
                fill="#ffff00"
                points="15,4 16.18,7.64 20,7.64 16.91,9.88 18.09,13.52 15,11.27 11.91,13.52 13.09,9.88 10,7.64 13.82,7.64"
            />
        </svg>
    )
}

function UnitedKingdomFlag(props: FlagProps) {
    // Cờ có thể xuất hiện nhiều lần trên một trang (header + menu) — id clipPath phải duy nhất.
    const clipId = useId()

    return (
        <svg viewBox="0 0 60 30" {...props}>
            <clipPath id={clipId}>
                <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
            </clipPath>
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clipId})`} stroke="#c8102e" strokeWidth="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
        </svg>
    )
}

const FLAGS: Record<Locale, ComponentType<FlagProps>> = {
    vi: VietnamFlag,
    en: UnitedKingdomFlag,
}

interface LocaleFlagProps {
    locale: Locale
    className?: string
}

// Trang trí thuần — tên ngôn ngữ luôn đi kèm ở dạng text/aria-label nơi dùng, nên cờ `aria-hidden`.
// Khung chữ nhật 3:2 nằm ở span: Button/MenuItem ép mọi svg không có class `size-*` thành `size-4` vuông,
// nên svg dùng `size-full` để thoát quy tắc đó và `slice` để lấp kín khung mà không méo.
export function LocaleFlag({ locale, className }: LocaleFlagProps) {
    const Flag = FLAGS[locale]
    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex aspect-3/2 h-4 shrink-0 overflow-hidden rounded-xs ring-1 ring-foreground/10',
                className,
            )}
        >
            <Flag preserveAspectRatio="xMidYMid slice" className="size-full" />
        </span>
    )
}
