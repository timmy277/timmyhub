'use client'

import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { FileTextIcon, ScrollTextIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button, Tabs, TabsList, TabsTrigger } from '@/components'
import { SELLER_ORDER_TAB, SELLER_ORDER_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeSellerOrderTabKey,
    addSellerOrderTab,
    buildSellerOrderTabCloseHref,
    buildSellerOrderTabsHref,
    parseSellerOrderTabItem,
    parseSellerOrderTabKeys,
    sellerOrderTabKey,
    withoutSellerOrderTab,
    type SellerOrderTabItem,
    type SellerOrderTabState,
} from '../seller-order-tab-query'
import {
    getOpenSellerOrderTabsSnapshot,
    subscribeToOpenSellerOrderTabs,
    writeOpenSellerOrderTabs,
} from '../seller-order-tabs-storage'

interface SellerOrderTabsProps {
    active: SellerOrderTabState
    userId: string
    activeLabel?: string
}

interface SellerTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: SellerOrderTabState
    item: SellerOrderTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameSellerOrderTabs(left: readonly SellerOrderTabItem[], right: readonly SellerOrderTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && sellerOrderTabKey(item) === sellerOrderTabKey(other)
        })
    )
}

export function SellerOrderTabs({ active, userId, activeLabel }: SellerOrderTabsProps) {
    const t = useTranslations('sellerOrders')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeSellerOrderTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenSellerOrderTabs(userId, onChange), [userId]),
        useCallback(() => getOpenSellerOrderTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseSellerOrderTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: SellerOrderTabItem[]) => writeOpenSellerOrderTabs(userId, next), [userId])

    useEffect(() => {
        let stored: SellerOrderTabItem[] = []
        try {
            stored = parseSellerOrderTabKeys(JSON.parse(getOpenSellerOrderTabsSnapshot(userId)))
        } catch {
            // ignore
        }
        const activeItem = parseSellerOrderTabItem(activeKey)
        const itemWithLabel = activeItem ? { ...activeItem, label: activeLabel ?? activeItem.label } : null
        const withActive = itemWithLabel ? addSellerOrderTab(stored, itemWithLabel) : stored

        if (!sameSellerOrderTabs(stored, withActive)) {
            writeOpenSellerOrderTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    const describeTab = (item: SellerOrderTabItem): { label: string; icon: ReactNode } => {
        const displayCode =
            item.id === (active.tab !== SELLER_ORDER_TAB.LIST ? active.id : '') && activeLabel
                ? activeLabel
                : item.label
                  ? item.label
                  : item.id.slice(-SELLER_ORDER_TAB_ID_LABEL_LENGTH).toUpperCase()

        return {
            label: t('tabDetail', { code: displayCode }),
            icon: <FileTextIcon className="size-3.5" />,
        }
    }

    const currentActiveItem = useMemo(() => {
        if (active.tab === SELLER_ORDER_TAB.LIST) return null
        return { ...active, label: activeLabel ?? active.label }
    }, [active, activeLabel])

    const visibleOpen = useMemo(
        () => (currentActiveItem ? addSellerOrderTab(open, currentActiveItem) : open),
        [currentActiveItem, open],
    )

    const items: SellerTabStripItem[] = [
        {
            value: SELLER_ORDER_TAB.LIST,
            label: t('tabList'),
            icon: <ScrollTextIcon className="size-3.5" />,
            target: { tab: SELLER_ORDER_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: sellerOrderTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    const handleClose = (e: MouseEvent, item: SellerOrderTabItem) => {
        e.preventDefault()
        e.stopPropagation()

        const nextOpen = withoutSellerOrderTab(visibleOpen, item)
        commitOpenTabs(nextOpen)

        const closeHref = buildSellerOrderTabCloseHref(pathname, searchParams, item, visibleOpen)
        router.push(closeHref)
    }

    return (
        <Tabs value={activeKey} className="w-full">
            <div className="overflow-x-auto pb-px scrollbar-none">
                <TabsList variant="line" className={TABS_LIST_CLASS} aria-label={t('openTabsRegion')}>
                    {items.map((tab) => {
                        const href = buildSellerOrderTabsHref(pathname, searchParams, tab.target)
                        const isCurrentActive = tab.value === activeKey

                        return (
                            <TabsTrigger key={tab.value} value={tab.value} asChild className={TABS_TRIGGER_CLASS}>
                                <Link
                                    href={href}
                                    ref={isCurrentActive ? activeTabRef : undefined}
                                    className="flex items-center gap-2 group text-xs sm:text-sm font-medium"
                                >
                                    <span className="flex items-center gap-1.5">
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </span>

                                    {tab.item && (
                                        <Button
                                            type="button"
                                            onClick={(e) => handleClose(e, tab.item!)}
                                            className="rounded-xs p-0.5 opacity-60 hover:opacity-100 hover:bg-muted/80 transition-opacity"
                                            title={t('closeTab')}
                                            variant="ghost"
                                        >
                                            <XIcon className="size-3" />
                                        </Button>
                                    )}
                                </Link>
                            </TabsTrigger>
                        )
                    })}
                </TabsList>
            </div>
        </Tabs>
    )
}
