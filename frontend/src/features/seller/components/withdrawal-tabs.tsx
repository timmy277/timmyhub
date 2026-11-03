'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { CreditCardIcon, FileTextIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components'
import { WITHDRAWAL_TAB, WITHDRAWAL_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeWithdrawalTabKey,
    addWithdrawalTab,
    buildWithdrawalTabCloseHref,
    buildWithdrawalTabsHref,
    parseWithdrawalTabItem,
    parseWithdrawalTabKeys,
    withdrawalTabKey,
    type WithdrawalTabItem,
    type WithdrawalTabState,
} from '../withdrawal-tab-query'
import {
    getOpenWithdrawalTabsSnapshot,
    subscribeToOpenWithdrawalTabs,
    writeOpenWithdrawalTabs,
} from '../withdrawal-tabs-storage'

interface WithdrawalTabsProps {
    active: WithdrawalTabState
    userId: string
    activeLabel?: string
}

interface WithdrawalTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: WithdrawalTabState
    item: WithdrawalTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameWithdrawalTabs(left: readonly WithdrawalTabItem[], right: readonly WithdrawalTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && withdrawalTabKey(item) === withdrawalTabKey(other)
        })
    )
}

export function WithdrawalTabs({ active, userId, activeLabel }: WithdrawalTabsProps) {
    // ===== Hooks =====
    const t = useTranslations('adminWithdrawals')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeWithdrawalTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenWithdrawalTabs(userId, onChange), [userId]),
        useCallback(() => getOpenWithdrawalTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseWithdrawalTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: WithdrawalTabItem[]) => writeOpenWithdrawalTabs(userId, next), [userId])

    useEffect(() => {
        let stored: WithdrawalTabItem[] = []
        try {
            stored = parseWithdrawalTabKeys(JSON.parse(getOpenWithdrawalTabsSnapshot(userId)))
        } catch {
            // ignore
        }
        const activeItem = parseWithdrawalTabItem(activeKey)
        const itemWithLabel = activeItem ? { ...activeItem, label: activeLabel ?? activeItem.label } : null
        const withActive = itemWithLabel ? addWithdrawalTab(stored, itemWithLabel) : stored

        if (!sameWithdrawalTabs(stored, withActive)) {
            writeOpenWithdrawalTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    // ===== Derived =====
    const describeTab = (item: WithdrawalTabItem): { label: string; icon: ReactNode } => {
        const displayLabel =
            item.id === (active.tab !== WITHDRAWAL_TAB.LIST ? active.id : '') && activeLabel
                ? activeLabel
                : item.label
                  ? item.label
                  : `${t('tabDetail')} (${item.id.slice(0, WITHDRAWAL_TAB_ID_LABEL_LENGTH)})`

        return {
            label: displayLabel,
            icon: <FileTextIcon className="size-3.5" />,
        }
    }

    const currentActiveItem = useMemo(() => {
        if (active.tab === WITHDRAWAL_TAB.LIST) return null
        return { ...active, label: activeLabel ?? active.label }
    }, [active, activeLabel])

    const visibleOpen = useMemo(
        () => (currentActiveItem ? addWithdrawalTab(open, currentActiveItem) : open),
        [currentActiveItem, open],
    )

    const items: WithdrawalTabStripItem[] = [
        {
            value: WITHDRAWAL_TAB.LIST,
            label: t('tabList'),
            icon: <CreditCardIcon className="size-3.5" />,
            target: { tab: WITHDRAWAL_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: withdrawalTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    // ===== Handlers =====
    const hrefFor = (target: WithdrawalTabState) => buildWithdrawalTabsHref(pathname, searchParams, target)

    const handleClose = (event: MouseEvent<HTMLSpanElement>, item: WithdrawalTabItem) => {
        event.preventDefault()
        event.stopPropagation()
        const href = buildWithdrawalTabCloseHref(pathname, searchParams, item, open)
        commitOpenTabs(open.filter((existing) => withdrawalTabKey(existing) !== withdrawalTabKey(item)))
        if (active.tab !== WITHDRAWAL_TAB.LIST && withdrawalTabKey(active) === withdrawalTabKey(item)) {
            router.push(href)
        }
    }

    return (
        <Tabs value={activeKey} onValueChange={() => undefined}>
            <div
                className="w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="region"
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
