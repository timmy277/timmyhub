'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui'
import { useBreadcrumbs } from '@/hooks'

export function Breadcrumbs() {
    const t = useTranslations('nav')
    const items = useBreadcrumbs()

    if (items.length === 0) return null

    const lastIndex = items.length - 1

    return (
        <Breadcrumb aria-label={t('breadcrumb')}>
            <BreadcrumbList>
                {items.map((item, index) => {
                    const label = item.titleKey ? t(item.titleKey) : item.title
                    return index === lastIndex ? (
                        <BreadcrumbItem key={item.url}>
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                        </BreadcrumbItem>
                    ) : (
                        <Fragment key={item.url}>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink asChild>
                                    <Link href={item.url}>{label}</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
