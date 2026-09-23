'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME } from '@/constants'
import type { Locale } from '@/types'
import { isLocale } from '@/utils'

export async function setLocale(locale: Locale): Promise<void> {
    if (!isLocale(locale)) return

    const cookieStore = await cookies()
    cookieStore.set(LOCALE_COOKIE_NAME, locale, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS })

    // Locale đọc trong request.ts ở root layout, không phải segment route — phải revalidate cả layout
    // để render lại bằng locale mới, revalidate mỗi page riêng lẻ sẽ không đủ.
    revalidatePath('/', 'layout')
}
