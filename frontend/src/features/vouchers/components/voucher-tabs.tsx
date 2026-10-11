'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { PlusIcon, TicketIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components'
import { VOUCHER_TAB } from '@/constants'

import {
    activeVoucherTabKey,
    addVoucherTab,
    buildVoucherTabCloseHref,
    buildVoucherTabsHref,
    parseVoucherTabItem,
    parseVoucherTabKeys,
    voucherTabKey,
    withoutVoucherTab,
    type VoucherTabItem,
    type VoucherTabState,
} from '../voucher-tab-query'
import { getOpenVoucherTabsSnapshot, subscribeToOpenVoucherTabs, writeOpenVoucherTabs } from '../voucher-tabs-storage'

interface VoucherTabsProps {
    active: VoucherTabState
    userId: string
    activeLabel?: string
}

interface VoucherTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: VoucherTabState
    item: VoucherTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameVoucherTabs(left: readonly VoucherTabItem[], right: readonly VoucherTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && voucherTabKey(item) === voucherTabKey(other)
        })
    )
}

export function VoucherTabs({ active, userId, activeLabel }: VoucherTabsProps) {
    const t = useTranslations('vouchers')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeVoucherTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenVoucherTabs(userId, onChange), [userId]),
        useCallback(() => getOpenVoucherTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseVoucherTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: VoucherTabItem[]) => writeOpenVoucherTabs(userId, next), [userId])

    useEffect(() => {
        let stored: VoucherTabItem[] = []
        try {
            stored = parseVoucherTabKeys(JSON.parse(getOpenVoucherTabsSnapshot(userId)))
        } catch {
            // ignore
        }
        const activeItem = parseVoucherTabItem(activeKey)
        const itemWithLabel =
            activeItem && activeItem.tab === VOUCHER_TAB.DETAIL
                ? { ...activeItem, label: activeLabel ?? activeItem.label }
                : activeItem
        const withActive = itemWithLabel ? addVoucherTab(stored, itemWithLabel) : stored

        if (!sameVoucherTabs(stored, withActive)) {
            writeOpenVoucherTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            })
        }
    }, [activeKey])

    const handleCloseTab = (event: React.SyntheticEvent, item: VoucherTabItem) => {
        event.preventDefault()
        event.stopPropagation()

        const nextOpen = withoutVoucherTab(open, item)
        commitOpenTabs(nextOpen)
        router.push(buildVoucherTabCloseHref(pathname, searchParams, item, open))
    }

    const visibleOpen = useMemo<VoucherTabItem[]>(
        () => (active.tab === VOUCHER_TAB.LIST ? open : addVoucherTab(open, active as VoucherTabItem)),
        [active, open],
    )

    const items = useMemo<VoucherTabStripItem[]>(() => {
        const listTab: VoucherTabStripItem = {
            value: VOUCHER_TAB.LIST,
            label: t('tabList'),
            icon: <TicketIcon className="size-4 shrink-0" aria-hidden="true" />,
            target: { tab: VOUCHER_TAB.LIST },
            item: null,
        }

        const openItems: VoucherTabStripItem[] = visibleOpen.map((tabItem: VoucherTabItem) => {
            if (tabItem.tab === VOUCHER_TAB.CREATE) {
                return {
                    value: VOUCHER_TAB.CREATE,
                    label: t('tabCreate'),
                    icon: <PlusIcon className="size-4 shrink-0" aria-hidden="true" />,
                    target: tabItem,
                    item: tabItem,
                }
            }

            const displayLabel = tabItem.label || tabItem.id.slice(0, 8).toUpperCase()

            return {
                value: voucherTabKey(tabItem),
                label: displayLabel,
                icon: <TicketIcon className="size-4 shrink-0" aria-hidden="true" />,
                target: tabItem,
                item: tabItem,
            }
        })

        return [listTab, ...openItems]
    }, [t, visibleOpen])

    return (
        <Tabs value={activeKey} className="overflow-x-auto">
            <TabsList variant="line" className={TABS_LIST_CLASS} aria-label={t('openTabsRegion')}>
                {items.map((tab) => {
                    const isActive = activeKey === tab.value
                    const href = buildVoucherTabsHref(pathname, searchParams, tab.target)

                    return (
                        <TabsTrigger key={tab.value} value={tab.value} asChild className={TABS_TRIGGER_CLASS}>
                            <Link
                                ref={isActive ? activeTabRef : undefined}
                                href={href}
                                className="group relative flex items-center gap-2 select-none"
                            >
                                {tab.icon}
                                <span className="max-w-[200px] truncate">{tab.label}</span>
                                {tab.item && (
                                    <button
                                        type="button"
                                        aria-label={t('closeTab')}
                                        onClick={(e) => handleCloseTab(e, tab.item!)}
                                        className="ml-1 rounded-sm p-0.5 opacity-60 hover:opacity-100 hover:bg-muted"
                                    >
                                        <XIcon className="size-3.5" />
                                    </button>
                                )}
                            </Link>
                        </TabsTrigger>
                    )
                })}
            </TabsList>
        </Tabs>
    )
}
