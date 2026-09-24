import type { Locale } from '@/types'
import { cn } from '@/utils'

import { IconPath, type IconName } from '../icons'

// Cờ vẽ bằng SVG inline, không dùng emoji: Windows không render emoji cờ (chỉ hiện "VN"/"GB").
const FLAGS: Record<Locale, IconName> = {
    vi: 'flag-vn',
    en: 'flag-uk',
}

interface LocaleFlagProps {
    locale: Locale
    className?: string
}

// Trang trí thuần — tên ngôn ngữ luôn đi kèm ở dạng text/aria-label nơi dùng, nên cờ `aria-hidden`.
// Khung chữ nhật 3:2 nằm ở span: Button/MenuItem ép mọi svg không có class `size-*` thành `size-4` vuông,
// nên svg dùng `size-full` để thoát quy tắc đó và `slice` để lấp kín khung mà không méo.
export function LocaleFlag({ locale, className }: LocaleFlagProps) {
    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex aspect-3/2 h-4 shrink-0 overflow-hidden rounded-xs ring-1 ring-foreground/10',
                className,
            )}
        >
            <IconPath name={FLAGS[locale]} preserveAspectRatio="xMidYMid slice" className="size-full" />
        </span>
    )
}
