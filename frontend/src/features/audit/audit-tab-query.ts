import { AUDIT_QUERY_PARAM, AUDIT_TAB, AUDIT_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type AuditTabSearchParams = SearchParams | URLSearchParams

// Chỉ có **một** loại tab bản ghi: chi tiết. Bảng audit là bất biến (ADR-0011) — không có tab tạo/sửa vì không có
// đường ghi qua API.
export type AuditTabItem = { tab: typeof AUDIT_TAB.DETAIL; id: string }

export type AuditTabState = { tab: typeof AUDIT_TAB.LIST } | AuditTabItem

export interface AuditTabsState {
    active: AuditTabState
}

const LIST_STATE: AuditTabState = { tab: AUDIT_TAB.LIST }

export function auditTabKey(item: AuditTabItem): string {
    return `${item.tab}${AUDIT_TAB_ID_SEPARATOR}${item.id}`
}

export function activeAuditTabKey(active: AuditTabState): string {
    return active.tab === AUDIT_TAB.LIST ? AUDIT_TAB.LIST : auditTabKey(active)
}

export function parseAuditTabItem(raw: string): AuditTabItem | null {
    const separatorAt = raw.indexOf(AUDIT_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === AUDIT_TAB.DETAIL && id !== '') return { tab: AUDIT_TAB.DETAIL, id }
    return null
}

export function parseAuditTabKeys(value: unknown): AuditTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: AuditTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseAuditTabItem(raw)
        if (!item) continue
        const key = auditTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addAuditTab(open: readonly AuditTabItem[], item: AuditTabItem): AuditTabItem[] {
    const key = auditTabKey(item)
    return open.some((existing) => auditTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutAuditTab(open: readonly AuditTabItem[], item: AuditTabItem): AuditTabItem[] {
    const key = auditTabKey(item)
    return open.filter((existing) => auditTabKey(existing) !== key)
}

function readParam(params: AuditTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseAuditTabs(params: AuditTabSearchParams): AuditTabsState {
    const raw = readParam(params, AUDIT_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseAuditTabItem(raw) ?? LIST_STATE) : LIST_STATE }
}

// URL chỉ chứa tab đang xem; danh sách tab đang mở do `audit-tabs-storage` giữ theo từng tài khoản.
export function buildAuditTabsHref(pathname: string, searchParams: URLSearchParams, active: AuditTabState): string {
    const params = new URLSearchParams(searchParams.toString())

    if (active.tab === AUDIT_TAB.LIST) params.delete(AUDIT_QUERY_PARAM.TABS)
    else params.set(AUDIT_QUERY_PARAM.TABS, auditTabKey(active))

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

export function previousAuditTabAfterClose(open: readonly AuditTabItem[], item: AuditTabItem): AuditTabState {
    const closedAt = open.findIndex((existing) => auditTabKey(existing) === auditTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildAuditTabCloseHref(
    pathname: string,
    searchParams: URLSearchParams,
    item: AuditTabItem,
    open: readonly AuditTabItem[],
): string {
    const { active } = parseAuditTabs(searchParams)
    const isActive = active.tab !== AUDIT_TAB.LIST && auditTabKey(active) === auditTabKey(item)
    return buildAuditTabsHref(pathname, searchParams, isActive ? previousAuditTabAfterClose(open, item) : active)
}
