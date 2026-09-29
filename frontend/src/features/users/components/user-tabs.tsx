'use client'

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { FileTextIcon, PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui'
import { USER_QUERY_PARAM, USER_TAB, USER_TAB_ID_LABEL_LENGTH } from '@/constants'

import {
    activeUserTabKey,
    addUserTab,
    buildUserTabCloseHref,
    buildUserTabsHref,
    parseUserTabKeys,
    parseUserTabItem,
    userTabKey,
    type UserTabItem,
    type UserTabState,
} from '../user-tab-query'
import { getOpenUserTabsSnapshot, subscribeToOpenUserTabs, writeOpenUserTabs } from '../user-tabs-storage'

interface UserTabsProps {
    active: UserTabState
    userId: string
}

interface UserTabStripItem {
    // `value` của tab trên thanh tab, cũng là `key` của React: `list`, `create`, `update:<uuid>`, `detail:<uuid>`.
    value: string
    label: string
    icon: ReactNode
    target: UserTabState
    // Tab danh sách là nền của màn hình nên luôn mở và không đóng được, nên nó không gắn với mục nào trong `open`
    // (`null`). Tab bản ghi thì đóng được, và đóng nghĩa là gỡ chính nó khỏi `open`.
    item: UserTabItem | null
}

// Thanh tab dựng theo đúng kiểu "folder tab" của TimmyHub gốc (Mantine `Tabs variant="outline"`): cả dải có một đường
// kẻ chạy hết chân, tab đang xem là một ô viền bo hai góc trên. Gốc dựng đường kẻ bằng pseudo-element của `Tabs.List`
// rồi cho tab một viền dưới **cùng màu nền** để "cắt" đường kẻ đó; ở đây làm y hệt: `-mb-px` kéo đáy tab trùng đúng
// đường kẻ, `data-active:border-b-card` tô viền dưới bằng màu card nên đường kẻ bị ngắt dưới tab đang xem.
//
// `variant="line"` chỉ để lấy `bg-transparent` + `rounded-none` của cva (variant mặc định là pill nền `bg-muted`).
// Danh sách rộng ít nhất bằng khung nhìn và nới theo số tab; từng tab giữ nguyên chiều rộng để thanh có thể cuộn.
// Mọi thứ còn lại của cva đều phải ghi đè: `h-8` → `h-auto`, `p-[3px]` → `p-0`, `w-fit` → `min-w-full w-max`, `gap-1` → `gap-0`,
// `h-[calc(100%-1px)]` → `h-9`, `flex-1` → `flex-none`, `rounded-md` → bo hai góc trên. Đã kiểm bằng chính `cn`
// (tailwind-merge) nên không còn cặp class nào chọi nhau. Hai chỗ tailwind-merge cố ý giữ lại cả hai vì chúng thuộc
// hai nhóm khác nhau — `rounded-md` với `rounded-t-md`/`rounded-b-none`, và `data-active:border-border` với
// `data-active:border-b-card` — đều dựa vào thứ tự CSS của Tailwind: utility theo cạnh luôn được xếp sau utility
// toàn phần nên cạnh thắng.
const TABS_LIST_CLASS =
    'group-data-horizontal/tabs:h-auto min-w-full w-max flex-nowrap justify-start gap-0 rounded-none border-b border-border p-0'

// `dark:group-data-horizontal/tabs:data-active:border-b-card` có độ ưu tiên cao hơn `dark:data-active:border-input`
// của cva, nên ở dark mode đường kẻ vẫn bị cắt đúng chỗ thay vì bị viền `input` mờ che mất.
const TABS_TRIGGER_CLASS = [
    '-mb-px h-9 flex-none rounded-t-md rounded-b-none px-4 text-muted-foreground',
    'after:hidden',
    'data-active:border-border data-active:border-b-card dark:group-data-horizontal/tabs:data-active:border-b-card',
].join(' ')

function sameUserTabs(left: readonly UserTabItem[], right: readonly UserTabItem[]): boolean {
    return (
        left.length === right.length &&
        left.every((item, index) => {
            const other = right[index]
            return other !== undefined && userTabKey(item) === userTabKey(other)
        })
    )
}

// Thanh tab của màn quản lý người dùng, dựng theo mẫu `ManagementPage` của TimmyHub gốc: tab danh sách luôn có mặt,
// tab bản ghi chỉ hiện khi đang mở, và mỗi tab bản ghi có nút × để đóng.
//
// Mỗi lần mở một bản ghi chỉ thêm **một** tab: mở Xem thì có tab Xem, mở Sửa thì có tab Sửa, hai tab độc lập — mở cái
// này không kéo theo cái kia, và mỗi cái đóng riêng được. Muốn đi từ Xem sang Sửa thì mở thêm tab Sửa; tab Xem vẫn nằm
// đó để quay lại, đúng như `addTab` của gốc (nó chỉ nối thêm vào `openTabs`).
//
// Tab đã mở thì **còn mãi cho tới khi bấm ×**, kể cả lúc đang đứng ở danh sách — về danh sách không đóng bản ghi đang
// xem, nên bấm qua lại giữa xem bản ghi và danh sách không phải mở lại từ đầu.
//
// Mỗi tab là một `<Link>` thật: tab đang chọn nằm trong URL nên tải lại/chia sẻ link vẫn giữ đúng panel; danh sách tab
// mở được lưu riêng trong localStorage. `onValueChange` cố ý không điều hướng vì click của `<Link>` đã làm việc đó.
export function UserTabs({ active, userId }: UserTabsProps) {
    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const searchQuery = searchParams.toString()
    const legacyOpen = searchParams.get(USER_QUERY_PARAM.OPEN)
    const activeKey = activeUserTabKey(active)
    const openSnapshot = useSyncExternalStore(
        useCallback((onChange) => subscribeToOpenUserTabs(userId, onChange), [userId]),
        useCallback(() => getOpenUserTabsSnapshot(userId), [userId]),
        () => '[]',
    )
    const open = useMemo(() => {
        try {
            return parseUserTabKeys(JSON.parse(openSnapshot))
        } catch {
            return []
        }
    }, [openSnapshot])
    const activeTabRef = useRef<HTMLAnchorElement | null>(null)

    const commitOpenTabs = useCallback((next: UserTabItem[]) => writeOpenUserTabs(userId, next), [userId])

    useEffect(() => {
        let stored: UserTabItem[] = []
        try {
            stored = parseUserTabKeys(JSON.parse(getOpenUserTabsSnapshot(userId)))
        } catch {
            // Ignore invalid localStorage data and replace it with the normalized active tab list below.
        }
        const legacyTabs = parseUserTabKeys(legacyOpen?.split(',') ?? [])
        const next = legacyTabs.reduce((items, item) => addUserTab(items, item), stored)
        const activeItem = parseUserTabItem(activeKey)
        const withActive = activeItem ? addUserTab(next, activeItem) : next

        if (!sameUserTabs(stored, withActive)) {
            writeOpenUserTabs(userId, withActive)
        }
    }, [activeKey, legacyOpen, userId])

    useEffect(() => {
        if (legacyOpen !== null) {
            const params = new URLSearchParams(searchQuery)
            params.delete(USER_QUERY_PARAM.OPEN)
            const query = params.toString()
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
        }
    }, [legacyOpen, pathname, router, searchQuery])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [activeKey])

    // ===== Derived =====
    // Nhãn chỉ hiện 8 ký tự đầu của định danh — uuid đầy đủ (36 ký tự) làm tab dài quá khổ, mà tab chỉ cần đủ để người
    // dùng đối chiếu với bản ghi đang mở.
    const describeTab = (item: UserTabItem): { label: string; icon: ReactNode } => {
        if (item.tab === USER_TAB.CREATE) {
            return { label: t('tabCreate'), icon: <PlusIcon className="size-3.5" /> }
        }

        const id = item.id.slice(0, USER_TAB_ID_LABEL_LENGTH)

        if (item.tab === USER_TAB.UPDATE) {
            return { label: t('tabUpdateWithId', { id }), icon: <PencilIcon className="size-3.5" /> }
        }

        return { label: t('tabDetailWithId', { id }), icon: <FileTextIcon className="size-3.5" /> }
    }

    // Thứ tự tab đúng bằng thứ tự mở, y như `openTabs` của gốc: mở thêm thì nối vào cuối, không sắp xếp lại.
    const visibleOpen = useMemo(() => (active.tab === USER_TAB.LIST ? open : addUserTab(open, active)), [active, open])
    const items: UserTabStripItem[] = [
        {
            value: USER_TAB.LIST,
            label: t('tabList'),
            icon: <FileTextIcon className="size-3.5" />,
            target: { tab: USER_TAB.LIST },
            item: null,
        },
        ...visibleOpen.map((item) => ({
            value: userTabKey(item),
            target: item,
            item,
            ...describeTab(item),
        })),
    ]

    // ===== Handlers =====
    // Tab danh sách giữ nguyên danh sách tab đã mở; route chỉ thay đổi tab đang được chọn.
    const hrefFor = (target: UserTabState) => buildUserTabsHref(pathname, searchParams, target)

    const handleClose = (event: MouseEvent<HTMLSpanElement>, item: UserTabItem) => {
        // Nút × nằm trong `<Link>` nên phải tự chặn điều hướng của thẻ cha, không thì vừa đóng tab vừa mở lại chính
        // nó. `stopPropagation` để Radix không nhận click này thành một lần đổi tab.
        event.preventDefault()
        event.stopPropagation()
        const href = buildUserTabCloseHref(pathname, searchParams, item, open)
        commitOpenTabs(open.filter((existing) => userTabKey(existing) !== userTabKey(item)))
        if (active.tab !== USER_TAB.LIST && userTabKey(active) === userTabKey(item)) {
            router.push(href)
        }
    }

    return (
        <Tabs value={activeUserTabKey(active)} onValueChange={() => undefined}>
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
