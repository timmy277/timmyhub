import { PRODUCT_QUERY_PARAM, PRODUCT_TAB, PRODUCT_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type ProductTabSearchParams = SearchParams | URLSearchParams

export type ProductTabItem = {
    tab: typeof PRODUCT_TAB.DETAIL
    id: string
    label?: string
}

export type ProductTabState = { tab: typeof PRODUCT_TAB.LIST } | { tab: typeof PRODUCT_TAB.CREATE } | ProductTabItem

export interface ProductTabsState {
    active: ProductTabState
}

const LIST_STATE: ProductTabState = { tab: PRODUCT_TAB.LIST }
const CREATE_STATE: ProductTabState = { tab: PRODUCT_TAB.CREATE }

export function productTabKey(item: ProductTabItem): string {
    return `${item.tab}${PRODUCT_TAB_ID_SEPARATOR}${item.id}`
}

export function activeProductTabKey(active: ProductTabState): string {
    if (active.tab === PRODUCT_TAB.LIST) return PRODUCT_TAB.LIST
    if (active.tab === PRODUCT_TAB.CREATE) return PRODUCT_TAB.CREATE
    return productTabKey(active)
}

export function parseProductTabItem(raw: string): ProductTabItem | null {
    const separatorAt = raw.indexOf(PRODUCT_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === PRODUCT_TAB.DETAIL && id !== '') {
        return { tab: PRODUCT_TAB.DETAIL, id }
    }
    return null
}

export function parseProductTabKeys(value: unknown): ProductTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: ProductTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseProductTabItem(raw)
        if (!item) continue
        const key = productTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addProductTab(open: readonly ProductTabItem[], item: ProductTabItem): ProductTabItem[] {
    const key = productTabKey(item)
    return open.some((existing) => productTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutProductTab(open: readonly ProductTabItem[], item: ProductTabItem): ProductTabItem[] {
    const key = productTabKey(item)
    return open.filter((existing) => productTabKey(existing) !== key)
}

function readParam(params: ProductTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseProductTabs(params: ProductTabSearchParams): ProductTabsState {
    const raw = readParam(params, PRODUCT_QUERY_PARAM.TABS)
    if (!raw) return { active: LIST_STATE }
    if (raw === PRODUCT_TAB.CREATE) return { active: CREATE_STATE }
    const parsed = parseProductTabItem(raw)
    return { active: parsed ?? LIST_STATE }
}

export function buildProductTabsHref(pathname: string, searchParams: URLSearchParams, active: ProductTabState): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === PRODUCT_TAB.LIST) {
        params.delete(PRODUCT_QUERY_PARAM.TABS)
    } else if (active.tab === PRODUCT_TAB.CREATE) {
        params.set(PRODUCT_QUERY_PARAM.TABS, PRODUCT_TAB.CREATE)
    } else {
        params.set(PRODUCT_QUERY_PARAM.TABS, productTabKey(active))
    }

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousProductTabAfterClose(open: readonly ProductTabItem[], item: ProductTabItem): ProductTabState {
    const closedAt = open.findIndex((existing) => productTabKey(existing) === productTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildProductTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: ProductTabItem,
    open: readonly ProductTabItem[],
): string {
    const { active } = parseProductTabs(searchParams)
    const isActive =
        active.tab !== PRODUCT_TAB.LIST &&
        active.tab !== PRODUCT_TAB.CREATE &&
        productTabKey(active) === productTabKey(item)

    return buildProductTabsHref(pathname, searchParams, isActive ? previousProductTabAfterClose(open, item) : active)
}
