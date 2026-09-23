import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { ThemeAttributesSync, Toaster, TooltipProvider } from '@/components'
import { FONT_VARIABLE_CLASS_NAMES, THEME_INIT_SCRIPT } from '@/constants'
import './globals.css'

export const metadata: Metadata = {
    title: 'TimmyHub',
    description: 'Sàn thương mại điện tử TimmyHub',
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
                        <TooltipProvider>
                            <ThemeAttributesSync />
                            {children}
                            <Toaster />
                        </TooltipProvider>
                    </NextIntlClientProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
