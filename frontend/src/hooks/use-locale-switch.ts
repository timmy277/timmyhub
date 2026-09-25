import { useTransition } from 'react'
import { useLocale } from 'next-intl'

import { setLocale } from '@/services'
import type { Locale } from '@/types'

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
