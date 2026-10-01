'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { FileTextIcon, ScrollTextIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { AUDIT_TAB, AUDIT_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeAuditTabKey,
    addAuditTab,
    auditTabKey,
    buildAuditTabCloseHref,
    buildAuditTabsHref,
    parseAuditTabItem,
    parseAuditTabKeys,
    type AuditTabItem,
    type AuditTabState,
} from '../audit-tab-query'
import { getOpenAuditTabsSnapshot, subscribeToOpenAuditTabs, writeOpenAuditTabs } from '../audit-tabs-storage'

interface AuditTabsProps {
    active: AuditTabState
    userId: string
}

interface AuditTabStripItem {
    value: string
    label: string
    icon: ReactNode
    target: AuditTabState
    // Tab danh sách là nền của màn hình nên luôn mở và không đóng được (`null`). Tab bản ghi đóng được.
    item: AuditTabItem | null
}

// Cùng kiểu "folder tab" với màn quản lý người dùng — cả dải có một đường kẻ chạy hết chân, tab đang xem là một ô viền
// bo hai góc trên. Ở đây chỉ có **một** loại tab bản ghi (chi tiết) vì bảng audit là bất biến (ADR-0011).
const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameAuditTabs(left: readonly AuditTabItem[], right: readonly AuditTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && auditTabKey(item) === auditTabKey(other)
        })
    )
}

export function AuditTabs({ active, userId }: AuditTabsProps) {
    // ===== Hooks =====
    const t = useTranslations('auditLog')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeAuditTabKey(active)
    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenAuditTabs(userId, onChange), [userId]),
        useCallback(() => getOpenAuditTabsSnapshot(userId), [userId]),
        () => '[]',
    )
    const open = useMemo(() => {
        try {
            return parseAuditTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])
    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: AuditTabItem[]) => writeOpenAuditTabs(userId, next), [userId])

    useEffect(() => {
        let stored: AuditTabItem[] = []
        try {
            stored = parseAuditTabKeys(JSON.parse(getOpenAuditTabsSnapshot(userId)))
        } catch {
            // Dữ liệu localStorage hỏng thì bỏ qua và thay bằng danh sách chuẩn hoá bên dưới.
        }
        const activeItem = parseAuditTabItem(activeKey)
        const withActive = activeItem ? addAuditTab(stored, activeItem) : stored

        if (!sameAuditTabs(stored, withActive)) {
            writeOpenAuditTabs(userId, withActive)
        }
    }, [activeKey, userId])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    // ===== Derived =====
    const describeTab = (item: AuditTabItem): { label: string; icon: ReactNode } => ({
        label: t('tabDetailWithId', { id: item.id.slice(0, AUDIT_TAB_ID_LABEL_LENGTH) }),
        icon: <FileTextIcon className="size-3.5" />,
    })

    const visibleOpen = useMemo(
        () => (active.tab === AUDIT_TAB.LIST ? open : addAuditTab(open, active)),
        [active, open],
    )

    const items: AuditTabStripItem[] = [
        {
            value: AUDIT_TAB.LIST,
            label: t('tabList'),
            icon: <ScrollTextIcon className="size-3.5" />,
            target: { tab: AUDIT_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: auditTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    // ===== Handlers =====
    const hrefFor = (target: AuditTabState) => buildAuditTabsHref(pathname, searchParams, target)

    const handleClose = (event: MouseEvent<HTMLSpanElement>, item: AuditTabItem) => {
        // Nút × nằm trong `<Link>` nên phải tự chặn điều hướng của thẻ cha, không thì vừa đóng tab vừa mở lại chính nó.
        event.preventDefault()
        event.stopPropagation()
        const href = buildAuditTabCloseHref(pathname, searchParams, item, open)
        commitOpenTabs(open.filter((existing) => auditTabKey(existing) !== auditTabKey(item)))
        if (active.tab !== AUDIT_TAB.LIST && auditTabKey(active) === auditTabKey(item)) {
            router.push(href)
        }
    }

    return (
        <Tabs value={activeAuditTabKey(active)} onValueChange={() => undefined}>
            <div
                className="w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="region"
                aria-label={t('openTabsRegion')}
                tabIndex={0}
            >
                <TabsList variant="line" className={TABS_LIST_CLASS}>
                    {items.map(({ value, label, icon, target, item }) => (
                        <TabsTrigger key={value} value={value} asChild className={TABS_TRIGGER_CLASS}>
                            <Link href={hrefFor(target)} ref={value === activeKey ? activeTabRef : undefined}>
                                {icon}
                                {label}
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
