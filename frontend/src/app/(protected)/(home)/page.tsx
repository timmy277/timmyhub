import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { DASHBOARD_PERMISSION, ROUTE } from '@/constants'
import { getVideoFeedAction } from '@/features/content'
import { HomePage } from '@/features/home'
import { getActor } from '@/lib/actor-permissions'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('home')
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'

    return {
        title: t('title'),
        description: t('description'),
        keywords: [
            'TimmyHub',
            'thương mại điện tử',
            'mua sắm online',
            'điện thoại chính hãng',
            'voucher giảm giá',
            'freeship',
            'công nghệ',
        ],
        alternates: {
            canonical: siteUrl,
        },
        openGraph: {
            title: t('title'),
            description: t('description'),
            url: siteUrl,
            siteName: 'TimmyHub',
            locale: 'vi_VN',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: t('title'),
            description: t('description'),
        },
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
    }
}

export default async function Page() {
    const actor = await getActor()
    if (actor?.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const videoFeedRes = await getVideoFeedAction({ limit: 3, random: true })
    const initialVideoFeed = videoFeedRes.ok ? videoFeedRes.data : undefined

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timmyhub.com'
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: siteUrl,
                name: 'TimmyHub',
                description: 'Sàn thương mại điện tử đa tiện ích hàng đầu',
                potentialAction: {
                    '@type': 'SearchAction',
                    target: `${siteUrl}/?q={search_term_string}`,
                    'query-input': 'required name=search_term_string',
                },
            },
            {
                '@type': 'Organization',
                '@id': `${siteUrl}/#organization`,
                name: 'TimmyHub',
                url: siteUrl,
                logo: `${siteUrl}/favicon.ico`,
            },
        ],
    }

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <HomePage initialVideoFeed={initialVideoFeed} />
        </>
    )
}
