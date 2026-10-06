'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { FileTextIcon, PackageIcon, PlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components'
import { PRODUCT_TAB, PRODUCT_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeProductTabKey,
    addProductTab,
    buildProductTabCloseHref,
    buildProductTabsHref,
    parseProductTabItem,
    parseProductTabKeys,
    productTabKey,
    withoutProductTab,
    type ProductTabItem,
    type ProductTabState,
} from '../product-tab-query'
import { getOpenProductTabsSnapshot, subscribeToOpenProductTabs, writeOpenProductTabs } from '../product-tabs-storage'

interface ProductTabsProps {
    active: ProductTabState
    userId: string
    canCreate?: boolean
    activeLabel?: string
}

interface ProductTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: ProductTabState
    item: ProductTabItem | null
}

const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameProductTabs(left: readonly ProductTabItem[], right: readonly ProductTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && productTabKey(item) === productTabKey(other)
        })
    )
}

export function ProductTabs({ active, userId, canCreate = false, activeLabel }: ProductTabsProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeProductTabKey(active)

    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenProductTabs(userId, onChange), [userId]),
        useCallback(() => getOpenProductTabsSnapshot(userId), [userId]),
        () => '[]',
    )

    const open = useMemo(() => {
        try {
            return parseProductTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])

    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: ProductTabItem[]) => writeOpenProductTabs(userId, next), [userId])

    useEffect(() => {
        let stored: ProductTabItem[] = []
        try {
            stored = parseProductTabKeys(JSON.parse(getOpenProductTabsSnapshot(userId)))
        } catch {
            // bỏ qua nếu hỏng
        }
        const activeItem = parseProductTabItem(activeKey)
        const itemWithLabel = activeItem ? { ...activeItem, label: activeLabel ?? activeItem.label } : null
        const withActive = itemWithLabel ? addProductTab(stored, itemWithLabel) : stored

        if (!sameProductTabs(stored, withActive)) {
            writeOpenProductTabs(userId, withActive)
        }
    }, [activeKey, activeLabel, userId])

    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
    }, [activeKey])

    const handleCloseTab = (event: React.SyntheticEvent, item: ProductTabItem) => {
        event.preventDefault()
        event.stopPropagation()

        const nextOpen = withoutProductTab(open, item)
        commitOpenTabs(nextOpen)
        router.push(buildProductTabCloseHref(pathname, searchParams, item, open))
    }

    const items = useMemo<ProductTabStripItem[]>(() => {
        const listItems: ProductTabStripItem[] = [
            {
                value: PRODUCT_TAB.LIST,
                label: 'Danh sách',
                icon: <PackageIcon className="size-4 shrink-0" aria-hidden="true" />,
                target: { tab: PRODUCT_TAB.LIST },
                item: null,
            },
        ]

        if (canCreate) {
            listItems.push({
                value: PRODUCT_TAB.CREATE,
                label: 'Tạo sản phẩm',
                icon: <PlusIcon className="size-4 shrink-0" aria-hidden="true" />,
                target: { tab: PRODUCT_TAB.CREATE },
                item: null,
            })
        }

        const openItems: ProductTabStripItem[] = open.map((tabItem) => {
            const shortId = tabItem.id.slice(0, PRODUCT_TAB_ID_LABEL_LENGTH)
            const displayLabel = tabItem.label ? `Chi tiết: ${tabItem.label}` : `Chi tiết: ${shortId}`

            return {
                value: productTabKey(tabItem),
                label: displayLabel,
                icon: <FileTextIcon className="size-4 shrink-0" aria-hidden="true" />,
                target: tabItem,
                item: tabItem,
            }
        })

        return [...listItems, ...openItems]
    }, [canCreate, open])

    return (
        <Tabs value={activeKey} className="overflow-x-auto">
            <TabsList variant="line" className={TABS_LIST_CLASS}>
                {items.map((tab) => {
                    const isActive = activeKey === tab.value
                    const href = buildProductTabsHref(pathname, searchParams, tab.target)

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
                                        aria-label={`Đóng tab ${tab.label}`}
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
