import { useTransition } from 'react'
import { useLocale } from 'next-intl'

import type { Locale } from '@timmyhub/contracts'

import { setLocale } from '@/services'

export function useLocaleSwitch() {
    // ===== Hooks =====
    const locale = useLocale()
    const [isPending, startTransition] = useTransition()

    // ===== Handlers =====
    function switchLocale(next: Locale) {
        if (next === locale || isPending) return
        startTransition(async () => {
            await setLocale(next)
        })
    }

    return { locale, isPending, switchLocale }
}
