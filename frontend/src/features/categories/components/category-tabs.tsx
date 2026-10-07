'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { FileTextIcon, FolderTreeIcon, PlusIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components'
import { CATEGORY_TAB, CATEGORY_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeCategoryTabKey,
    addCategoryTab,
    buildCategoryTabCloseHref,
    buildCategoryTabsHref,
    categoryTabKey,
    parseCategoryTabItem,
    parseCategoryTabKeys,
    withoutCategoryTab,
    type CategoryTabItem,
    type CategoryTabState,
} from '../category-tab-query'
import {
    getOpenCategoryTabsSnapshot,
    subscribeToOpenCategoryTabs,
    writeOpenCategoryTabs,
} from '../category-tabs-storage'

interface CategoryTabsProps {
    active: CategoryTabState
    userId: string
    activeLabel?: string
}

interface CategoryTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: CategoryTabState
    item: CategoryTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameCategoryTabs(left: readonly CategoryTabItem[], right: readonly CategoryTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && categoryTabKey(item) === categoryTabKey(other)
        })
    )
}

export function CategoryTabs({ active, userId, activeLabel }: CategoryTabsProps) {
    const t = useTranslations('categories')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeCategoryTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenCategoryTabs(userId, onChange), [userId]),
        useCallback(() => getOpenCategoryTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseCategoryTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: CategoryTabItem[]) => writeOpenCategoryTabs(userId, next), [userId])

    useEffect(() => {
        let stored: CategoryTabItem[] = []
        try {
            stored = parseCategoryTabKeys(JSON.parse(getOpenCategoryTabsSnapshot(userId)))
        } catch {
            // ignore
        }
        const activeItem = parseCategoryTabItem(activeKey)
        const itemWithLabel =
            activeItem && activeItem.tab === CATEGORY_TAB.DETAIL
                ? { ...activeItem, label: activeLabel ?? activeItem.label }
                : activeItem
        const withActive = itemWithLabel ? addCategoryTab(stored, itemWithLabel) : stored

        if (!sameCategoryTabs(stored, withActive)) {
            writeOpenCategoryTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
    }, [activeKey])

    const handleCloseTab = (event: React.SyntheticEvent, item: CategoryTabItem) => {
        event.preventDefault()
        event.stopPropagation()

        const nextOpen = withoutCategoryTab(open, item)
        commitOpenTabs(nextOpen)
        router.push(buildCategoryTabCloseHref(pathname, searchParams, item, open))
    }

    const visibleOpen = useMemo(
        () => (active.tab === CATEGORY_TAB.LIST ? open : addCategoryTab(open, active)),
        [active, open],
    )

    const items = useMemo<CategoryTabStripItem[]>(() => {
        const listTab: CategoryTabStripItem = {
            value: CATEGORY_TAB.LIST,
            label: t('tabList'),
            icon: <FolderTreeIcon className="size-4 shrink-0" aria-hidden="true" />,
            target: { tab: CATEGORY_TAB.LIST },
            item: null,
        }

        const openItems: CategoryTabStripItem[] = visibleOpen.map((tabItem) => {
            if (tabItem.tab === CATEGORY_TAB.CREATE) {
                return {
                    value: CATEGORY_TAB.CREATE,
                    label: t('tabCreate'),
                    icon: <PlusIcon className="size-4 shrink-0" aria-hidden="true" />,
                    target: tabItem,
                    item: tabItem,
                }
            }

            const shortId = tabItem.id.slice(0, CATEGORY_TAB_ID_LABEL_LENGTH)
            const displayLabel = tabItem.label
                ? t('tabDetailWithId', { id: tabItem.label })
                : t('tabDetailWithId', { id: shortId })

            return {
                value: categoryTabKey(tabItem),
                label: displayLabel,
                icon: <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />,
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
                    const href = buildCategoryTabsHref(pathname, searchParams, tab.target)

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
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label={t('closeTab', { label: tab.label })}
                                        className="-me-1 ms-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                                        onClick={(e) => handleCloseTab(e, tab.item!)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleCloseTab(e, tab.item!)
                                            }
                                        }}
                                    >
                                        <XIcon className="size-3" />
                                    </span>
                                )}
                            </Link>
                        </TabsTrigger>
                    )
                })}
            </TabsList>
        </Tabs>
    )
}
