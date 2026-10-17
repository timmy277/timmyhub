import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import {
    AuthProvider,
    QueryProvider,
    SessionTokenWatcher,
    ThemeAttributesSync,
    Toaster,
    TooltipProvider,
} from '@/components'
import { FloatingChatDock, StarryBackground } from '@/components/common'
import { FONT_VARIABLE_CLASS_NAMES, THEME_INIT_SCRIPT } from '@/constants'

import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'TimmyHub - Sàn Thương Mại Điện Tử Đa Tiện Ích Hàng Đầu',
        template: '%s · TimmyHub',
    },
    description:
        'Mua sắm trực tuyến hàng ngàn sản phẩm công nghệ, điện thoại, phụ kiện chính hãng với ưu đãi freeship, voucher giảm giá mỗi ngày và bảo hành uy tín tại TimmyHub.',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        title: 'TimmyHub - Sàn Thương Mại Điện Tử Đa Tiện Ích Hàng Đầu',
        description:
            'Mua sắm trực tuyến hàng ngàn sản phẩm công nghệ, điện thoại, phụ kiện chính hãng với ưu đãi freeship, voucher giảm giá mỗi ngày và bảo hành uy tín tại TimmyHub.',
        url: siteUrl,
        siteName: 'TimmyHub',
        locale: 'vi_VN',
        type: 'website',
    },
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
    const locale = await getLocale()
    const messages = await getMessages()

    return (
        <html lang={locale} suppressHydrationWarning className={`${FONT_VARIABLE_CLASS_NAMES} h-full antialiased`}>
            <head>
                <meta
                    name="description"
                    content="Mua sắm trực tuyến hàng ngàn sản phẩm công nghệ, điện thoại, phụ kiện chính hãng với ưu đãi freeship, voucher giảm giá mỗi ngày và bảo hành uy tín tại TimmyHub."
                />
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body className="min-h-full flex flex-col">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <NextIntlClientProvider locale={locale} messages={messages}>
                        <AuthProvider>
                            <QueryProvider>
                                <TooltipProvider>
                                    <StarryBackground />
                                    <SessionTokenWatcher />
                                    <ThemeAttributesSync />
                                    {children}
                                    <FloatingChatDock />
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
