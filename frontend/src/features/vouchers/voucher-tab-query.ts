import { VOUCHER_QUERY_PARAM, VOUCHER_TAB, VOUCHER_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type VoucherTabSearchParams = SearchParams | URLSearchParams

export type VoucherTabItem =
    | { tab: typeof VOUCHER_TAB.CREATE }
    | {
          tab: typeof VOUCHER_TAB.DETAIL
          id: string
          label?: string
      }

export type VoucherTabState = { tab: typeof VOUCHER_TAB.LIST } | VoucherTabItem

export interface VoucherTabsState {
    active: VoucherTabState
}

const LIST_STATE: VoucherTabState = { tab: VOUCHER_TAB.LIST }

export function voucherTabKey(item: VoucherTabItem): string {
    if (item.tab === VOUCHER_TAB.CREATE) return VOUCHER_TAB.CREATE
    return `${item.tab}${VOUCHER_TAB_ID_SEPARATOR}${item.id}`
}

export function activeVoucherTabKey(active: VoucherTabState): string {
    if (active.tab === VOUCHER_TAB.LIST) return VOUCHER_TAB.LIST
    return voucherTabKey(active)
}

export function parseVoucherTabItem(raw: string): VoucherTabItem | null {
    if (raw === VOUCHER_TAB.CREATE) return { tab: VOUCHER_TAB.CREATE }
    const separatorAt = raw.indexOf(VOUCHER_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === VOUCHER_TAB.DETAIL && id !== '') {
        return { tab: VOUCHER_TAB.DETAIL, id }
    }
    return null
}

export function parseVoucherTabKeys(value: unknown): VoucherTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: VoucherTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseVoucherTabItem(raw)
        if (!item) continue
        const key = voucherTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

function getParam(params: VoucherTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) {
        return params.get(key) ?? undefined
    }
    const val = params[key]
    return Array.isArray(val) ? val[0] : val
}

export function parseVoucherTabs(searchParams: VoucherTabSearchParams): VoucherTabsState {
    const rawActive = getParam(searchParams, VOUCHER_QUERY_PARAM.TAB)
    if (!rawActive || rawActive === VOUCHER_TAB.LIST) {
        return { active: LIST_STATE }
    }

    const parsed = parseVoucherTabItem(rawActive)
    if (!parsed) {
        return { active: LIST_STATE }
    }

    return { active: parsed }
}

export function buildVoucherTabsHref(
    pathname: string,
    currentParams: VoucherTabSearchParams,
    target: VoucherTabState,
): string {
    const next =
        currentParams instanceof URLSearchParams
            ? new URLSearchParams(currentParams)
            : new URLSearchParams(
                  Object.entries(currentParams).reduce<Record<string, string>>((acc, [k, v]) => {
                      if (typeof v === 'string') acc[k] = v
                      else if (Array.isArray(v) && typeof v[0] === 'string') acc[k] = v[0]
                      return acc
                  }, {}),
              )

    if (target.tab === VOUCHER_TAB.LIST) {
        next.delete(VOUCHER_QUERY_PARAM.TAB)
    } else {
        next.set(VOUCHER_QUERY_PARAM.TAB, voucherTabKey(target))
    }

    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
}

export function addVoucherTab(open: readonly VoucherTabItem[], item: VoucherTabItem): VoucherTabItem[] {
    const key = voucherTabKey(item)
    return open.some((existing) => voucherTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutVoucherTab(open: readonly VoucherTabItem[], item: VoucherTabItem): VoucherTabItem[] {
    const key = voucherTabKey(item)
    return open.filter((existing) => voucherTabKey(existing) !== key)
}

export function previousVoucherTabAfterClose(open: readonly VoucherTabItem[], item: VoucherTabItem): VoucherTabState {
    const closedAt = open.findIndex((existing) => voucherTabKey(existing) === voucherTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildVoucherTabCloseHref(
    pathname: string,
    searchParams: VoucherTabSearchParams,
    item: VoucherTabItem,
    open: readonly VoucherTabItem[],
): string {
    const { active } = parseVoucherTabs(searchParams)
    const isActive = active.tab !== VOUCHER_TAB.LIST && voucherTabKey(active) === voucherTabKey(item)

    return buildVoucherTabsHref(pathname, searchParams, isActive ? previousVoucherTabAfterClose(open, item) : active)
}
