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
import { LOCALES } from '@/constants'
import { useLocaleSwitch } from '@/hooks'
import { isLocale } from '@/utils'
import { LocaleFlag } from './locale-flag'

// Icon cờ của ngôn ngữ hiện tại trên header, bấm mở menu chọn ngôn ngữ.
export function LocaleSwitcher() {
    const t = useTranslations('common')
    const { locale, isPending, switchLocale } = useLocaleSwitch()
    const current = isLocale(locale) ? locale : LOCALES[0]

    const labelOf = (code: (typeof LOCALES)[number]) => t(code === 'vi' ? 'languageVi' : 'languageEn')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    aria-label={`${t('language')}: ${labelOf(current)}`}
                >
                    <LocaleFlag locale={current} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-44 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={current}
                    onValueChange={(value) => {
                        if (isLocale(value)) switchLocale(value)
                    }}
                >
                    {LOCALES.map((code) => (
                        <DropdownMenuRadioItem key={code} value={code} disabled={isPending}>
                            <LocaleFlag locale={code} className="h-3.5" />
                            {labelOf(code)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
