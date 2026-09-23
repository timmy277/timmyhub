'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'
import { LOCALES } from '@/constants'
import { useLocaleSwitch } from '@/hooks'

export function LocaleSwitcher() {
    const t = useTranslations('common')
    const { locale, isPending, switchLocale } = useLocaleSwitch()

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
                        onClick={() => switchLocale(code)}
                    >
                        {t(code === 'vi' ? 'languageVi' : 'languageEn')}
                    </Button>
                ))}
            </div>
        </div>
    )
}
