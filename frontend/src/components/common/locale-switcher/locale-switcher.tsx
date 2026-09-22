'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui'
import { LOCALES, type Locale } from '@/i18n/locale'
import { setLocale } from '@/i18n/set-locale'

// Đổi locale qua Server Action + cookie (localePrefix "never"), không có segment [locale] trong URL nên
// URL giữ nguyên khi đổi ngôn ngữ.
export function LocaleSwitcher() {
    const t = useTranslations('common')
    const locale = useLocale()
    const [isPending, startTransition] = useTransition()

    function handleSelect(next: Locale) {
        if (next === locale || isPending) return
        startTransition(async () => {
            await setLocale(next)
        })
    }

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">{t('language')}</span>
            <div className="flex gap-2" role="group" aria-label={t('language')}>
                {LOCALES.map((code) => (
                    <Button
                        key={code}
                        type="button"
                        variant={locale === code ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        aria-pressed={locale === code}
                        disabled={isPending}
                        onClick={() => handleSelect(code)}
                    >
                        {t(code === 'vi' ? 'languageVi' : 'languageEn')}
                    </Button>
                ))}
            </div>
        </div>
    )
}
