import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { ThemeAttributesSync, Toaster, TooltipProvider } from '@/components'
import { FONT_VARIABLE_CLASS_NAMES } from '@/lib/theme/fonts'
import './globals.css'

export const metadata: Metadata = {
    title: 'TimmyHub',
    description: 'Sàn thương mại điện tử TimmyHub',
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = window.localStorage.getItem('timmyhub-theme-config')
    if (!raw) return
    var parsed = JSON.parse(raw)
    var config = parsed && parsed.state && parsed.state.config
    if (!config) return
    var root = document.documentElement
    if (config.style) root.setAttribute('data-style', config.style)
    if (config.baseColor) root.setAttribute('data-base-color', config.baseColor)
    if (config.accentColor) root.setAttribute('data-accent', config.accentColor)
    if (config.chartColor) root.setAttribute('data-chart', config.chartColor)
    if (config.headingFont) root.setAttribute('data-font-heading', config.headingFont)
    if (config.bodyFont) root.setAttribute('data-font', config.bodyFont)
  } catch (e) {}
})()
`

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
