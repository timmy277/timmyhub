import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'

import {
    AuthProvider,
    QueryProvider,
    SessionTokenWatcher,
    ThemeAttributesSync,
    Toaster,
    TooltipProvider,
} from '@/components'
import { FONT_VARIABLE_CLASS_NAMES, THEME_INIT_SCRIPT } from '@/constants'

import './globals.css'

// Tiêu đề trang con ghép theo `title.template` ("Người dùng · TimmyHub"); trang không đặt title dùng `default`.
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('metadata')
    return {
        title: { default: t('title'), template: t('titleTemplate') },
        description: t('description'),
    }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
    const locale = await getLocale()
    const messages = await getMessages()

    return (
        <html lang={locale} suppressHydrationWarning className={`${FONT_VARIABLE_CLASS_NAMES} h-full antialiased`}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body className="min-h-full flex flex-col">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <NextIntlClientProvider locale={locale} messages={messages}>
                        <AuthProvider>
                            <QueryProvider>
                                <TooltipProvider>
                                    <SessionTokenWatcher />
                                    <ThemeAttributesSync />
                                    {children}
                                    <Toaster />
                                </TooltipProvider>
                            </QueryProvider>
                        </AuthProvider>
                    </NextIntlClientProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
