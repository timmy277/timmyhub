import { RBAC_QUERY_PARAM, RBAC_TAB, RBAC_TAB_ID_SEPARATOR, RBAC_TAB_ITEM_VALUES, type RbacKind } from '@/constants'

// Mô hình tab của màn quản trị vai trò/quyền, **dùng chung** cho cả hai màn (khác `user-tab-query` chỉ phục vụ một
// màn): mọi hàm nhận `kind` để biết tập tab bản ghi nào hợp lệ. Hàm thuần, không đụng React/Next (luật #22) — nên
// kiểm chứng được bằng harness không cần trình duyệt.
//
// Chỉ tab ĐANG XEM nằm trong URL; danh sách tab đã mở do `rbac-tabs-storage` giữ ở localStorage (theo từng tài khoản).
type SearchParams = Record<string, string | string[] | undefined>
export type RbacTabSearchParams = SearchParams | URLSearchParams

export type RbacTabItem =
    | { tab: typeof RBAC_TAB.CREATE }
    | { tab: typeof RBAC_TAB.UPDATE; id: string }
    | { tab: typeof RBAC_TAB.DETAIL; id: string }

export type RbacTabState = { tab: typeof RBAC_TAB.LIST } | RbacTabItem

export interface RbacTabsState {
    active: RbacTabState
}

const LIST_STATE: RbacTabState = { tab: RBAC_TAB.LIST }

export function rbacTabKey(item: RbacTabItem): string {
    if (item.tab === RBAC_TAB.CREATE) return RBAC_TAB.CREATE
    return `${item.tab}${RBAC_TAB_ID_SEPARATOR}${item.id}`
}

export function activeRbacTabKey(active: RbacTabState): string {
    return active.tab === RBAC_TAB.LIST ? RBAC_TAB.LIST : rbacTabKey(active)
}

export function parseRbacTabItem(kind: RbacKind, raw: string): RbacTabItem | null {
    const separatorAt = raw.indexOf(RBAC_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)
    const allowed = RBAC_TAB_ITEM_VALUES[kind] as readonly string[]

    if (name === RBAC_TAB.CREATE && separatorAt === -1 && allowed.includes(RBAC_TAB.CREATE)) {
        return { tab: RBAC_TAB.CREATE }
    }
    if (name === RBAC_TAB.UPDATE && id !== '' && allowed.includes(RBAC_TAB.UPDATE)) {
        return { tab: RBAC_TAB.UPDATE, id }
    }
    if (name === RBAC_TAB.DETAIL && id !== '' && allowed.includes(RBAC_TAB.DETAIL)) {
        return { tab: RBAC_TAB.DETAIL, id }
    }
    return null
}

export function parseRbacTabKeys(kind: RbacKind, value: unknown): RbacTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: RbacTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseRbacTabItem(kind, raw)
        if (!item) continue
        const key = rbacTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addRbacTab(open: readonly RbacTabItem[], item: RbacTabItem): RbacTabItem[] {
    const key = rbacTabKey(item)
    return open.some((existing) => rbacTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutRbacTab(open: readonly RbacTabItem[], item: RbacTabItem): RbacTabItem[] {
    const key = rbacTabKey(item)
    return open.filter((existing) => rbacTabKey(existing) !== key)
}

function readParam(params: RbacTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseRbacTabs(kind: RbacKind, params: RbacTabSearchParams): RbacTabsState {
    const raw = readParam(params, RBAC_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseRbacTabItem(kind, raw) ?? LIST_STATE) : LIST_STATE }
}

// URL chỉ chứa tab đang xem; danh sách tab mở nằm ở localStorage nên hàm này không ghi chúng vào query.
export function buildRbacTabsHref(pathname: string, searchParams: URLSearchParams, active: RbacTabState): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === RBAC_TAB.LIST) params.delete(RBAC_QUERY_PARAM.TABS)
    else params.set(RBAC_QUERY_PARAM.TABS, rbacTabKey(active))

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousRbacTabAfterClose(open: readonly RbacTabItem[], item: RbacTabItem): RbacTabState {
    const closedAt = open.findIndex((existing) => rbacTabKey(existing) === rbacTabKey(item))
    return closedAt > 0 ? open[closedAt - 1] : LIST_STATE
}

export function buildRbacTabCloseHref(
    kind: RbacKind,
    pathname: string,
    searchParams: URLSearchParams,
    item: RbacTabItem,
    open: readonly RbacTabItem[],
): string {
    const { active } = parseRbacTabs(kind, searchParams)
    const isActive = active.tab !== RBAC_TAB.LIST && rbacTabKey(active) === rbacTabKey(item)
    return buildRbacTabsHref(pathname, searchParams, isActive ? previousRbacTabAfterClose(open, item) : active)
}
