'use client'

import { useEffect } from 'react'
import { createTranslator, NextIntlClientProvider } from 'next-intl'

import { DEFAULT_LOCALE } from '@timmyhub/contracts'

import { ErrorState } from '@/components'
import type { RouteErrorProps } from '@/types'

import defaultMessages from '../../messages/vi.json'

import './globals.css'

// Lỗi ngay trong root layout: file này THAY root layout nên không có NextIntlClientProvider, ThemeProvider hay
// globals.css của app — phải tự dựng `<html>/<body>`, tự nạp CSS và tự bọc provider i18n. Client component này
// không đọc được cookie locale nên dùng catalog ngôn ngữ mặc định, chỉ namespace `common` (ErrorState cần).
// Không export metadata được (Client Component) — dùng `<title>` của React.
const GLOBAL_ERROR_MESSAGES = { common: defaultMessages.common }

export default function GlobalError({ error, retry }: RouteErrorProps) {
    // ===== Derived =====
    const t = createTranslator({ locale: DEFAULT_LOCALE, messages: GLOBAL_ERROR_MESSAGES, namespace: 'common' })

    // ===== Effects =====
    // Ghi lỗi ra console trình duyệt — chưa có dịch vụ theo dõi lỗi; thay khi tích hợp.
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html lang={DEFAULT_LOCALE}>
            <body className="flex min-h-svh flex-col bg-background text-foreground antialiased">
                <title>{t('errorTitle')}</title>
                <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={GLOBAL_ERROR_MESSAGES}>
                    <main className="flex flex-1 items-center justify-center p-4">
                        <ErrorState
                            className="w-full max-w-md"
                            description={
                                error.digest ? t('errorDigest', { digest: error.digest }) : t('errorDescription')
                            }
                            onRetry={retry}
                        />
                    </main>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
