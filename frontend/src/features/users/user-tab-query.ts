import { USER_QUERY_PARAM, USER_TAB, USER_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type UserTabSearchParams = SearchParams | URLSearchParams

export type UserTabItem =
    | { tab: typeof USER_TAB.CREATE }
    | { tab: typeof USER_TAB.UPDATE; id: string }
    | { tab: typeof USER_TAB.DETAIL; id: string }

export type UserTabState = { tab: typeof USER_TAB.LIST } | UserTabItem

export interface UserTabsState {
    active: UserTabState
}

const LIST_STATE: UserTabState = { tab: USER_TAB.LIST }

export function userTabKey(item: UserTabItem): string {
    if (item.tab === USER_TAB.CREATE) return USER_TAB.CREATE
    return `${item.tab}${USER_TAB_ID_SEPARATOR}${item.id}`
}

export function activeUserTabKey(active: UserTabState): string {
    return active.tab === USER_TAB.LIST ? USER_TAB.LIST : userTabKey(active)
}

export function parseUserTabItem(raw: string): UserTabItem | null {
    const separatorAt = raw.indexOf(USER_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === USER_TAB.CREATE && separatorAt === -1) return { tab: USER_TAB.CREATE }
    if (name === USER_TAB.UPDATE && id !== '') return { tab: USER_TAB.UPDATE, id }
    if (name === USER_TAB.DETAIL && id !== '') return { tab: USER_TAB.DETAIL, id }
    return null
}

export function parseUserTabKeys(value: unknown): UserTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: UserTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseUserTabItem(raw)
        if (!item) continue
        const key = userTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addUserTab(open: readonly UserTabItem[], item: UserTabItem): UserTabItem[] {
    const key = userTabKey(item)
    return open.some((existing) => userTabKey(existing) === key) ? [...open] : [...open, item]
}

function readParam(params: UserTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseUserTabs(params: UserTabSearchParams): UserTabsState {
    const raw = readParam(params, USER_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseUserTabItem(raw) ?? LIST_STATE) : LIST_STATE }
}

// The URL contains only the active tab. Open tabs are stored locally by user account.
export function buildUserTabsHref(pathname: string, searchParams: URLSearchParams, active: UserTabState): string {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(USER_QUERY_PARAM.OPEN)

    if (active.tab === USER_TAB.LIST) params.delete(USER_QUERY_PARAM.TABS)
    else params.set(USER_QUERY_PARAM.TABS, userTabKey(active))

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousUserTabAfterClose(open: readonly UserTabItem[], item: UserTabItem): UserTabState {
    const closedAt = open.findIndex((existing) => userTabKey(existing) === userTabKey(item))
    return closedAt > 0 ? open[closedAt - 1] : LIST_STATE
}

export function withoutUserTab(open: readonly UserTabItem[], item: UserTabItem): UserTabItem[] {
    const key = userTabKey(item)
    return open.filter((existing) => userTabKey(existing) !== key)
}

export function buildUserTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: UserTabItem,
    open: readonly UserTabItem[],
): string {
    const { active } = parseUserTabs(searchParams)
    const isActive = active.tab !== USER_TAB.LIST && userTabKey(active) === userTabKey(item)
    return buildUserTabsHref(pathname, searchParams, isActive ? previousUserTabAfterClose(open, item) : active)
}
