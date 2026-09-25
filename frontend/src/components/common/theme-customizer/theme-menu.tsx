'use client'

import { useTranslations } from 'next-intl'
import { PaletteIcon } from 'lucide-react'

import {
    Button,
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui'

import { ThemeCustomizer } from './theme-customizer'

// Icon trên header, mở panel tuỳ chỉnh giao diện thả xuống ngay bên dưới. Dùng Popover chứ không phải
// DropdownMenu: panel chứa Select và nút bấm tự do, không phải danh sách menu item.
export function ThemeMenu() {
    const t = useTranslations('theme')

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t('triggerLabel')}>
                            <PaletteIcon aria-hidden />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('triggerLabel')}</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
                <PopoverHeader className="border-b p-4">
                    <PopoverTitle>{t('panelTitle')}</PopoverTitle>
                    <PopoverDescription>{t('panelDescription')}</PopoverDescription>
                </PopoverHeader>
                <div className="max-h-[min(70svh,36rem)] overflow-y-auto overscroll-contain">
                    <ThemeCustomizer />
                </div>
            </PopoverContent>
        </Popover>
    )
}
