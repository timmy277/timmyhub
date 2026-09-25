'use client'

import { useTranslations } from 'next-intl'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui'
import { DEFAULT_LOCALE, LOCALE_LABEL_KEY, LOCALES } from '@/constants'
import { useLocaleSwitch } from '@/hooks'
import { isLocale } from '@/utils'

import { LocaleFlag } from './locale-flag'

// Icon cờ của ngôn ngữ hiện tại trên header, bấm mở menu chọn ngôn ngữ.
export function LocaleSwitcher() {
    // ===== Hooks =====
    const t = useTranslations('common')
    const { locale, isPending, switchLocale } = useLocaleSwitch()

    // ===== Derived =====
    const current = isLocale(locale) ? locale : DEFAULT_LOCALE

    // ===== Handlers =====
    const handleValueChange = (value: string) => {
        if (isLocale(value)) switchLocale(value)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    aria-label={t('languageAria', { language: t(LOCALE_LABEL_KEY[current]) })}
                >
                    <LocaleFlag locale={current} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-44 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={current} onValueChange={handleValueChange}>
                    {LOCALES.map((code) => (
                        <DropdownMenuRadioItem key={code} value={code} disabled={isPending}>
                            <LocaleFlag locale={code} className="h-3.5" />
                            {t(LOCALE_LABEL_KEY[code])}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
