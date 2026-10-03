import {
    SELLER_APPLICATION_QUERY_PARAM,
    SELLER_APPLICATION_TAB,
    SELLER_APPLICATION_TAB_ID_SEPARATOR,
} from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type SellerTabSearchParams = SearchParams | URLSearchParams

export type SellerTabItem = {
    tab: typeof SELLER_APPLICATION_TAB.DETAIL
    id: string
    label?: string
}

export type SellerTabState = { tab: typeof SELLER_APPLICATION_TAB.LIST } | SellerTabItem

export interface SellerTabsState {
    active: SellerTabState
}

const LIST_STATE: SellerTabState = { tab: SELLER_APPLICATION_TAB.LIST }

export function sellerTabKey(item: SellerTabItem): string {
    return `${item.tab}${SELLER_APPLICATION_TAB_ID_SEPARATOR}${item.id}`
}

export function activeSellerTabKey(active: SellerTabState): string {
    return active.tab === SELLER_APPLICATION_TAB.LIST ? SELLER_APPLICATION_TAB.LIST : sellerTabKey(active)
}

export function parseSellerTabItem(raw: string): SellerTabItem | null {
    const separatorAt = raw.indexOf(SELLER_APPLICATION_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === SELLER_APPLICATION_TAB.DETAIL && id !== '') {
        return { tab: SELLER_APPLICATION_TAB.DETAIL, id }
    }
    return null
}

export function parseSellerTabKeys(value: unknown): SellerTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: SellerTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseSellerTabItem(raw)
        if (!item) continue
        const key = sellerTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addSellerTab(open: readonly SellerTabItem[], item: SellerTabItem): SellerTabItem[] {
    const key = sellerTabKey(item)
    return open.some((existing) => sellerTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutSellerTab(open: readonly SellerTabItem[], item: SellerTabItem): SellerTabItem[] {
    const key = sellerTabKey(item)
    return open.filter((existing) => sellerTabKey(existing) !== key)
}

function readParam(params: SellerTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseSellerTabs(params: SellerTabSearchParams): SellerTabsState {
    const raw = readParam(params, SELLER_APPLICATION_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseSellerTabItem(raw) ?? LIST_STATE) : LIST_STATE }
}

export function buildSellerTabsHref(pathname: string, searchParams: URLSearchParams, active: SellerTabState): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === SELLER_APPLICATION_TAB.LIST) {
        params.delete(SELLER_APPLICATION_QUERY_PARAM.TABS)
    } else {
        params.set(SELLER_APPLICATION_QUERY_PARAM.TABS, sellerTabKey(active))
    }

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousSellerTabAfterClose(open: readonly SellerTabItem[], item: SellerTabItem): SellerTabState {
    const closedAt = open.findIndex((existing) => sellerTabKey(existing) === sellerTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildSellerTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: SellerTabItem,
    open: readonly SellerTabItem[],
): string {
    const { active } = parseSellerTabs(searchParams)
    const isActive = active.tab !== SELLER_APPLICATION_TAB.LIST && sellerTabKey(active) === sellerTabKey(item)
    return buildSellerTabsHref(pathname, searchParams, isActive ? previousSellerTabAfterClose(open, item) : active)
}
