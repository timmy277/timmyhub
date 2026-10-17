'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

// Không giữ state riêng: icon do CSS chọn theo class `dark` mà next-themes đã gắn lên <html> trước khi
// hydrate, nên server và client luôn render cùng một markup — không lệch hydration, không nháy icon.
export function ThemeModeToggle() {
    const t = useTranslations('nav')
    const { resolvedTheme, setTheme } = useTheme()

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('themeMode')}
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                >
                    <MoonIcon aria-hidden className="text-primary dark:hidden" />
                    <SunIcon aria-hidden className="hidden text-primary dark:block" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{t('themeMode')}</TooltipContent>
        </Tooltip>
    )
}
