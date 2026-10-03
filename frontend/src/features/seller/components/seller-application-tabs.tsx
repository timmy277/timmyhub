'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { FileTextIcon, ScrollTextIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components'
import { SELLER_APPLICATION_TAB, SELLER_APPLICATION_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeSellerTabKey,
    addSellerTab,
    buildSellerTabCloseHref,
    buildSellerTabsHref,
    parseSellerTabItem,
    parseSellerTabKeys,
    sellerTabKey,
    type SellerTabItem,
    type SellerTabState,
} from '../seller-tab-query'
import { getOpenSellerTabsSnapshot, subscribeToOpenSellerTabs, writeOpenSellerTabs } from '../seller-tabs-storage'

interface SellerApplicationTabsProps {
    active: SellerTabState
    userId: string
    activeLabel?: string
}

interface SellerTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: SellerTabState
    item: SellerTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameSellerTabs(left: readonly SellerTabItem[], right: readonly SellerTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && sellerTabKey(item) === sellerTabKey(other)
        })
    )
}

export function SellerApplicationTabs({ active, userId, activeLabel }: SellerApplicationTabsProps) {
    // ===== Hooks =====
    const t = useTranslations('sellerApplications')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeSellerTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenSellerTabs(userId, onChange), [userId]),
        useCallback(() => getOpenSellerTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseSellerTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: SellerTabItem[]) => writeOpenSellerTabs(userId, next), [userId])

    useEffect(() => {
        let stored: SellerTabItem[] = []
        try {
            stored = parseSellerTabKeys(JSON.parse(getOpenSellerTabsSnapshot(userId)))
        } catch {
            // bỏ qua nếu hỏng
        }
        const activeItem = parseSellerTabItem(activeKey)
        const itemWithLabel = activeItem ? { ...activeItem, label: activeLabel ?? activeItem.label } : null
        const withActive = itemWithLabel ? addSellerTab(stored, itemWithLabel) : stored

        if (!sameSellerTabs(stored, withActive)) {
            writeOpenSellerTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    // ===== Derived =====
    const describeTab = (item: SellerTabItem): { label: string; icon: ReactNode } => {
        const displayLabel =
            item.id === (active.tab !== SELLER_APPLICATION_TAB.LIST ? active.id : '') && activeLabel
                ? t('tabDetailTitle', { name: activeLabel })
                : item.label
                  ? t('tabDetailTitle', { name: item.label })
                  : t('tabDetailWithId', { id: item.id.slice(0, SELLER_APPLICATION_TAB_ID_LABEL_LENGTH) })

        return {
            label: displayLabel,
            icon: <FileTextIcon className="size-3.5" />,
        }
    }

    const currentActiveItem = useMemo(() => {
        if (active.tab === SELLER_APPLICATION_TAB.LIST) return null
        return { ...active, label: activeLabel ?? active.label }
    }, [active, activeLabel])

    const visibleOpen = useMemo(
        () => (currentActiveItem ? addSellerTab(open, currentActiveItem) : open),
        [currentActiveItem, open],
    )

    const items: SellerTabStripItem[] = [
        {
            value: SELLER_APPLICATION_TAB.LIST,
            label: t('tabList'),
            icon: <ScrollTextIcon className="size-3.5" />,
            target: { tab: SELLER_APPLICATION_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: sellerTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    // ===== Handlers =====
    const hrefFor = (target: SellerTabState) => buildSellerTabsHref(pathname, searchParams, target)

    const handleClose = (event: MouseEvent<HTMLSpanElement>, item: SellerTabItem) => {
        event.preventDefault()
        event.stopPropagation()
        const href = buildSellerTabCloseHref(pathname, searchParams, item, open)
        commitOpenTabs(open.filter((existing) => sellerTabKey(existing) !== sellerTabKey(item)))
        if (active.tab !== SELLER_APPLICATION_TAB.LIST && sellerTabKey(active) === sellerTabKey(item)) {
            router.push(href)
        }
    }

    return (
        <Tabs value={activeSellerTabKey(active)} onValueChange={() => undefined}>
            <div
                className="w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="region"
                aria-label={t('openTabsRegion')}
                tabIndex={0}
            >
                <TabsList variant="line" className={TABS_LIST_CLASS}>
                    {items.map(({ value, label, icon, target, item }) => (
                        <TabsTrigger key={value} value={value} asChild className={TABS_TRIGGER_CLASS}>
                            <Link
                                href={hrefFor(target)}
                                ref={value === activeKey ? activeTabRef : undefined}
                                className="flex items-center gap-2"
                            >
                                {icon}
                                <span className="truncate max-w-[180px]">{label}</span>
                                {item && (
                                    <span
                                        title={t('closeTab')}
                                        onClick={(event) => handleClose(event, item)}
                                        className="-me-1 ms-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                                    >
                                        <XIcon className="size-3" />
                                    </span>
                                )}
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </Tabs>
    )
}
