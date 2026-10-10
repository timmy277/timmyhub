import { SELLER_ORDER_QUERY_PARAM, SELLER_ORDER_TAB, SELLER_ORDER_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type SellerOrderTabSearchParams = SearchParams | URLSearchParams

export type SellerOrderTabItem = {
    tab: typeof SELLER_ORDER_TAB.DETAIL
    id: string
    label?: string
}

export type SellerOrderTabState = { tab: typeof SELLER_ORDER_TAB.LIST } | SellerOrderTabItem

export interface SellerOrderTabsState {
    active: SellerOrderTabState
}

const LIST_STATE: SellerOrderTabState = { tab: SELLER_ORDER_TAB.LIST }

export function sellerOrderTabKey(item: SellerOrderTabItem): string {
    return `${item.tab}${SELLER_ORDER_TAB_ID_SEPARATOR}${item.id}`
}

export function activeSellerOrderTabKey(active: SellerOrderTabState): string {
    return active.tab === SELLER_ORDER_TAB.LIST ? SELLER_ORDER_TAB.LIST : sellerOrderTabKey(active)
}

export function parseSellerOrderTabItem(raw: string): SellerOrderTabItem | null {
    const separatorAt = raw.indexOf(SELLER_ORDER_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === SELLER_ORDER_TAB.DETAIL && id !== '') {
        return { tab: SELLER_ORDER_TAB.DETAIL, id }
    }
    return null
}

export function parseSellerOrderTabKeys(value: unknown): SellerOrderTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: SellerOrderTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseSellerOrderTabItem(raw)
        if (!item) continue
        const key = sellerOrderTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addSellerOrderTab(open: readonly SellerOrderTabItem[], item: SellerOrderTabItem): SellerOrderTabItem[] {
    const key = sellerOrderTabKey(item)
    return open.some((existing) => sellerOrderTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutSellerOrderTab(
    open: readonly SellerOrderTabItem[],
    item: SellerOrderTabItem,
): SellerOrderTabItem[] {
    const key = sellerOrderTabKey(item)
    return open.filter((existing) => sellerOrderTabKey(existing) !== key)
}

function readParam(params: SellerOrderTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseSellerOrderTabs(params: SellerOrderTabSearchParams): SellerOrderTabsState {
    const raw = readParam(params, SELLER_ORDER_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseSellerOrderTabItem(raw) ?? LIST_STATE) : LIST_STATE }
}

export function buildSellerOrderTabsHref(
    pathname: string,
    searchParams: URLSearchParams,
    active: SellerOrderTabState,
): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === SELLER_ORDER_TAB.LIST) {
        params.delete(SELLER_ORDER_QUERY_PARAM.TABS)
    } else {
        params.set(SELLER_ORDER_QUERY_PARAM.TABS, sellerOrderTabKey(active))
    }

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousSellerOrderTabAfterClose(
    open: readonly SellerOrderTabItem[],
    item: SellerOrderTabItem,
): SellerOrderTabState {
    const closedAt = open.findIndex((existing) => sellerOrderTabKey(existing) === sellerOrderTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildSellerOrderTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: SellerOrderTabItem,
    open: readonly SellerOrderTabItem[],
): string {
    const { active } = parseSellerOrderTabs(searchParams)
    const isActive = active.tab !== SELLER_ORDER_TAB.LIST && sellerOrderTabKey(active) === sellerOrderTabKey(item)
    return buildSellerOrderTabsHref(
        pathname,
        searchParams,
        isActive ? previousSellerOrderTabAfterClose(open, item) : active,
    )
}
