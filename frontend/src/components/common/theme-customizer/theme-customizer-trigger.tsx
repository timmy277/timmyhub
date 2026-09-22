'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PaletteIcon } from 'lucide-react'

import {
    Button,
    ScrollArea,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui'
import { ThemeCustomizer } from './theme-customizer'

// Nút nổi mở panel tuỳ chỉnh giao diện, dùng cho mọi user trên site (không giới hạn dev/admin).
export function ThemeCustomizerTrigger() {
    const t = useTranslations('theme')
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    aria-label={t('triggerLabel')}
                    className="fixed right-4 bottom-4 z-40 size-10 rounded-full shadow-lg"
                >
                    <PaletteIcon />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                    <SheetTitle>{t('panelTitle')}</SheetTitle>
                    <SheetDescription>{t('panelDescription')}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <ThemeCustomizer />
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
