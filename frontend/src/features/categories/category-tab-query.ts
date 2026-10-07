import { CATEGORY_QUERY_PARAM, CATEGORY_TAB, CATEGORY_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type CategoryTabSearchParams = SearchParams | URLSearchParams

export type CategoryTabItem =
    | { tab: typeof CATEGORY_TAB.CREATE }
    | {
          tab: typeof CATEGORY_TAB.DETAIL
          id: string
          label?: string
      }

export type CategoryTabState = { tab: typeof CATEGORY_TAB.LIST } | CategoryTabItem

export interface CategoryTabsState {
    active: CategoryTabState
}

const LIST_STATE: CategoryTabState = { tab: CATEGORY_TAB.LIST }

export function categoryTabKey(item: CategoryTabItem): string {
    if (item.tab === CATEGORY_TAB.CREATE) return CATEGORY_TAB.CREATE
    return `${item.tab}${CATEGORY_TAB_ID_SEPARATOR}${item.id}`
}

export function activeCategoryTabKey(active: CategoryTabState): string {
    if (active.tab === CATEGORY_TAB.LIST) return CATEGORY_TAB.LIST
    return categoryTabKey(active)
}

export function parseCategoryTabItem(raw: string): CategoryTabItem | null {
    if (raw === CATEGORY_TAB.CREATE) return { tab: CATEGORY_TAB.CREATE }
    const separatorAt = raw.indexOf(CATEGORY_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === CATEGORY_TAB.DETAIL && id !== '') {
        return { tab: CATEGORY_TAB.DETAIL, id }
    }
    return null
}

export function parseCategoryTabKeys(value: unknown): CategoryTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: CategoryTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseCategoryTabItem(raw)
        if (!item) continue
        const key = categoryTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addCategoryTab(open: readonly CategoryTabItem[], item: CategoryTabItem): CategoryTabItem[] {
    const key = categoryTabKey(item)
    return open.some((existing) => categoryTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutCategoryTab(open: readonly CategoryTabItem[], item: CategoryTabItem): CategoryTabItem[] {
    const key = categoryTabKey(item)
    return open.filter((existing) => categoryTabKey(existing) !== key)
}

function readParam(params: CategoryTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseCategoryTabs(params: CategoryTabSearchParams): CategoryTabsState {
    const raw = readParam(params, CATEGORY_QUERY_PARAM.TABS)
    if (!raw) return { active: LIST_STATE }
    const parsed = parseCategoryTabItem(raw)
    return { active: parsed ?? LIST_STATE }
}

export function buildCategoryTabsHref(
    pathname: string,
    searchParams: URLSearchParams,
    active: CategoryTabState,
): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === CATEGORY_TAB.LIST) {
        params.delete(CATEGORY_QUERY_PARAM.TABS)
    } else {
        params.set(CATEGORY_QUERY_PARAM.TABS, categoryTabKey(active))
    }

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousCategoryTabAfterClose(
    open: readonly CategoryTabItem[],
    item: CategoryTabItem,
): CategoryTabState {
    const closedAt = open.findIndex((existing) => categoryTabKey(existing) === categoryTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildCategoryTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: CategoryTabItem,
    open: readonly CategoryTabItem[],
): string {
    const { active } = parseCategoryTabs(searchParams)
    const isActive = active.tab !== CATEGORY_TAB.LIST && categoryTabKey(active) === categoryTabKey(item)

    return buildCategoryTabsHref(pathname, searchParams, isActive ? previousCategoryTabAfterClose(open, item) : active)
}
