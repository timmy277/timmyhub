import { WITHDRAWAL_QUERY_PARAM, WITHDRAWAL_TAB, WITHDRAWAL_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type WithdrawalTabSearchParams = SearchParams | URLSearchParams

export type WithdrawalTabItem = {
    tab: typeof WITHDRAWAL_TAB.DETAIL
    id: string
    label?: string
}

export type WithdrawalTabState = { tab: typeof WITHDRAWAL_TAB.LIST } | WithdrawalTabItem

export interface WithdrawalTabsState {
    active: WithdrawalTabState
}

const LIST_STATE: WithdrawalTabState = { tab: WITHDRAWAL_TAB.LIST }

export function withdrawalTabKey(item: WithdrawalTabItem): string {
    return `${item.tab}${WITHDRAWAL_TAB_ID_SEPARATOR}${item.id}`
}

export function activeWithdrawalTabKey(active: WithdrawalTabState): string {
    return active.tab === WITHDRAWAL_TAB.LIST ? WITHDRAWAL_TAB.LIST : withdrawalTabKey(active)
}

export function parseWithdrawalTabItem(raw: string): WithdrawalTabItem | null {
    const separatorAt = raw.indexOf(WITHDRAWAL_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === WITHDRAWAL_TAB.DETAIL && id !== '') {
        return { tab: WITHDRAWAL_TAB.DETAIL, id }
    }
    return null
}

export function parseWithdrawalTabKeys(value: unknown): WithdrawalTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: WithdrawalTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseWithdrawalTabItem(raw)
        if (!item) continue
        const key = withdrawalTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

export function addWithdrawalTab(open: readonly WithdrawalTabItem[], item: WithdrawalTabItem): WithdrawalTabItem[] {
    const key = withdrawalTabKey(item)
    return open.some((existing) => withdrawalTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutWithdrawalTab(open: readonly WithdrawalTabItem[], item: WithdrawalTabItem): WithdrawalTabItem[] {
    const key = withdrawalTabKey(item)
    return open.filter((existing) => withdrawalTabKey(existing) !== key)
}

function readParam(params: WithdrawalTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

export function parseWithdrawalTabs(params: WithdrawalTabSearchParams): WithdrawalTabsState {
    const raw = readParam(params, WITHDRAWAL_QUERY_PARAM.TABS)
    return { active: typeof raw === 'string' ? (parseWithdrawalTabItem(raw) ?? LIST_STATE) : LIST_STATE }
}

export function buildWithdrawalTabsHref(
    pathname: string,
    currentParams: URLSearchParams | Readonly<URLSearchParams>,
    target: WithdrawalTabState,
): string {
    const next = new URLSearchParams(currentParams.toString())
    if (target.tab === WITHDRAWAL_TAB.LIST) {
        next.delete(WITHDRAWAL_QUERY_PARAM.TABS)
    } else {
        next.set(WITHDRAWAL_QUERY_PARAM.TABS, withdrawalTabKey(target))
    }
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
}

export function buildWithdrawalTabCloseHref(
    pathname: string,
    currentParams: URLSearchParams | Readonly<URLSearchParams>,
    closing: WithdrawalTabItem,
    openTabs: readonly WithdrawalTabItem[],
): string {
    const nextOpen = withoutWithdrawalTab(openTabs, closing)
    const activeRaw = currentParams.get(WITHDRAWAL_QUERY_PARAM.TABS)
    const isActiveClosing = activeRaw === withdrawalTabKey(closing)

    if (!isActiveClosing) {
        return buildWithdrawalTabsHref(
            pathname,
            currentParams,
            activeRaw ? (parseWithdrawalTabItem(activeRaw) ?? LIST_STATE) : LIST_STATE,
        )
    }

    const fallback = nextOpen[nextOpen.length - 1] ?? LIST_STATE
    return buildWithdrawalTabsHref(pathname, currentParams, fallback)
}
