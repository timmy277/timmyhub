'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { FileTextIcon, PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { RBAC_KIND, RBAC_TAB, RBAC_TAB_ID_LABEL_LENGTH, type RbacKind } from '@/constants'

import {
    activeRbacTabKey,
    addRbacTab,
    buildRbacTabCloseHref,
    buildRbacTabsHref,
    parseRbacTabItem,
    parseRbacTabKeys,
    rbacTabKey,
    type RbacTabItem,
    type RbacTabState,
} from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, subscribeToOpenRbacTabs, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface RbacTabsProps {
    kind: RbacKind
    active: RbacTabState
    userId: string
}

interface RbacTabStripItem {
    // `value` của tab trên thanh tab, cũng là `key` của React: `list`, `create`, `update:<id>`, `detail:<id>`.
    value: string
    label: string
    icon: ReactNode
    target: RbacTabState
    // Tab danh sách là nền nên luôn mở và không đóng được (`null`); tab bản ghi đóng được (gỡ khỏi `open`).
    item: RbacTabItem | null
}

// Thanh tab dựng theo đúng kiểu "folder tab" của TimmyHub gốc (Mantine `Tabs variant="outline"`) — giống hệt
// `UserTabs`, để hai màn quản trị trông như một. Cả dải có một đường kẻ chạy hết chân; tab đang xem là ô viền bo hai
// góc trên, viền dưới tô màu card để "cắt" đường kẻ (`-mb-px` + `data-active:border-b-card`).
const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameRbacTabs(left: readonly RbacTabItem[], right: readonly RbacTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && rbacTabKey(item) === rbacTabKey(other)
        })
    )
}

// Thanh tab của màn quản trị vai trò/quyền: tab danh sách luôn có mặt, tab bản ghi chỉ hiện khi đang mở, mỗi tab bản ghi
// có nút × để đóng. Mở Xem và mở Sửa là hai tab độc lập (role) — mở cái này không kéo theo cái kia.
//
// Mỗi tab là một `<Link>` thật: tab đang chọn nằm trong URL nên tải lại/chia sẻ link vẫn đúng panel; danh sách tab mở
// lưu riêng ở localStorage (`rbac-tabs-storage`). `onValueChange` cố ý không điều hướng vì click của `<Link>` đã làm.
export function RbacTabs({ kind, active, userId }: RbacTabsProps) {
    // ===== Hooks =====
    const t = useTranslations('rbac')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const activeKey = activeRbacTabKey(active)
    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenRbacTabs(kind, userId, onChange), [kind, userId]),
        useCallback(() => getOpenRbacTabsSnapshot(kind, userId), [kind, userId]),
        () => '[]',
    )
    const open = useMemo(() => {
        try {
            return parseRbacTabKeys(kind, JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [kind, openSnapshot])
    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: RbacTabItem[]) => writeOpenRbacTabs(kind, userId, next), [kind, userId])

    // Đồng bộ: tab đang xem luôn phải có mặt trong danh sách tab mở (dán link trực tiếp vẫn ra thanh tab đúng).
    useEffect(() => {
        let stored: RbacTabItem[] = []
        try {
            stored = parseRbacTabKeys(kind, JSON.parse(getOpenRbacTabsSnapshot(kind, userId)))
        } catch {
            // Bỏ qua dữ liệu localStorage hỏng rồi ghi lại danh sách đã chuẩn hoá bên dưới.
        }
        const activeItem = parseRbacTabItem(kind, activeKey)
        const withActive = activeItem ? addRbacTab(stored, activeItem) : stored

        if (!sameRbacTabs(stored, withActive)) {
            writeOpenRbacTabs(kind, userId, withActive)
        }
    }, [activeKey, kind, userId])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    // ===== Derived =====
    const describeTab = (item: RbacTabItem): { label: string; icon: ReactNode } => {
        if (item.tab === RBAC_TAB.CREATE) {
            const label = kind === RBAC_KIND.ROLES ? t('tabCreateRole') : t('tabCreatePermission')
            return { label, icon: <PlusIcon className="size-3.5" /> }
        }

        const id = item.id.slice(0, RBAC_TAB_ID_LABEL_LENGTH)

        if (item.tab === RBAC_TAB.UPDATE) {
            return { label: t('tabUpdateRole', { id }), icon: <PencilIcon className="size-3.5" /> }
        }

        const label = kind === RBAC_KIND.ROLES ? t('tabDetailRole', { id }) : t('tabDetailPermission', { id })
        return { label, icon: <FileTextIcon className="size-3.5" /> }
    }

    const visibleOpen = useMemo(() => (active.tab === RBAC_TAB.LIST ? open : addRbacTab(open, active)), [active, open])
    const items: RbacTabStripItem[] = [
        {
            value: RBAC_TAB.LIST,
            label: kind === RBAC_KIND.ROLES ? t('tabListRoles') : t('tabListPermissions'),
            icon: <FileTextIcon className="size-3.5" />,
            target: { tab: RBAC_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: rbacTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    // ===== Handlers =====
    const hrefFor = (target: RbacTabState) => buildRbacTabsHref(pathname, searchParams, target)

    const handleClose = (event: MouseEvent<HTMLSpanElement>, item: RbacTabItem) => {
        // Nút × nằm trong `<Link>` nên phải tự chặn điều hướng của thẻ cha, không thì vừa đóng tab vừa mở lại chính nó.
        event.preventDefault()
        event.stopPropagation()
        const href = buildRbacTabCloseHref(kind, pathname, searchParams, item, open)
        commitOpenTabs(open.filter((existing) => rbacTabKey(existing) !== rbacTabKey(item)))
        if (active.tab !== RBAC_TAB.LIST && rbacTabKey(active) === rbacTabKey(item)) {
            router.push(href)
        }
    }

    return (
        <Tabs value={activeKey} onValueChange={() => undefined}>
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
