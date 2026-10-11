import { CAMPAIGN_QUERY_PARAM, CAMPAIGN_TAB, CAMPAIGN_TAB_ID_SEPARATOR } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>
export type CampaignTabSearchParams = SearchParams | URLSearchParams

export type CampaignTabItem =
    | { tab: typeof CAMPAIGN_TAB.CREATE }
    | {
          tab: typeof CAMPAIGN_TAB.DETAIL
          id: string
          label?: string
      }

export type CampaignTabState = { tab: typeof CAMPAIGN_TAB.LIST } | CampaignTabItem

export interface CampaignTabsState {
    active: CampaignTabState
}

const LIST_STATE: CampaignTabState = { tab: CAMPAIGN_TAB.LIST }

export function campaignTabKey(item: CampaignTabItem): string {
    if (item.tab === CAMPAIGN_TAB.CREATE) return CAMPAIGN_TAB.CREATE
    return `${item.tab}${CAMPAIGN_TAB_ID_SEPARATOR}${item.id}`
}

export function activeCampaignTabKey(active: CampaignTabState): string {
    if (active.tab === CAMPAIGN_TAB.LIST) return CAMPAIGN_TAB.LIST
    return campaignTabKey(active)
}

export function parseCampaignTabItem(raw: string): CampaignTabItem | null {
    if (raw === CAMPAIGN_TAB.CREATE) return { tab: CAMPAIGN_TAB.CREATE }
    const separatorAt = raw.indexOf(CAMPAIGN_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === CAMPAIGN_TAB.DETAIL && id !== '') {
        return { tab: CAMPAIGN_TAB.DETAIL, id }
    }
    return null
}

export function parseCampaignTabKeys(value: unknown): CampaignTabItem[] {
    if (!Array.isArray(value)) return []

    const seen = new Set<string>()
    const items: CampaignTabItem[] = []
    for (const raw of value) {
        if (typeof raw !== 'string') continue
        const item = parseCampaignTabItem(raw)
        if (!item) continue
        const key = campaignTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }
    return items
}

function getParam(params: CampaignTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) {
        return params.get(key) ?? undefined
    }
    const val = params[key]
    return Array.isArray(val) ? val[0] : val
}

export function parseCampaignTabs(searchParams: CampaignTabSearchParams): CampaignTabsState {
    const rawActive = getParam(searchParams, CAMPAIGN_QUERY_PARAM.TAB)
    if (!rawActive || rawActive === CAMPAIGN_TAB.LIST) {
        return { active: LIST_STATE }
    }

    const parsed = parseCampaignTabItem(rawActive)
    if (!parsed) {
        return { active: LIST_STATE }
    }

    return { active: parsed }
}

export function buildCampaignTabsHref(
    pathname: string,
    currentParams: CampaignTabSearchParams,
    target: CampaignTabState,
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

    if (target.tab === CAMPAIGN_TAB.LIST) {
        next.delete(CAMPAIGN_QUERY_PARAM.TAB)
    } else {
        next.set(CAMPAIGN_QUERY_PARAM.TAB, campaignTabKey(target))
    }

    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
}

export function addCampaignTab(open: readonly CampaignTabItem[], item: CampaignTabItem): CampaignTabItem[] {
    const key = campaignTabKey(item)
    return open.some((existing) => campaignTabKey(existing) === key) ? [...open] : [...open, item]
}

export function withoutCampaignTab(open: readonly CampaignTabItem[], item: CampaignTabItem): CampaignTabItem[] {
    const key = campaignTabKey(item)
    return open.filter((existing) => campaignTabKey(existing) !== key)
}

export function previousCampaignTabAfterClose(
    open: readonly CampaignTabItem[],
    item: CampaignTabItem,
): CampaignTabState {
    const closedAt = open.findIndex((existing) => campaignTabKey(existing) === campaignTabKey(item))
    return closedAt > 0 ? open[closedAt - 1]! : LIST_STATE
}

export function buildCampaignTabCloseHref(
    pathname: string,
    searchParams: CampaignTabSearchParams,
    item: CampaignTabItem,
    open: readonly CampaignTabItem[],
): string {
    const { active } = parseCampaignTabs(searchParams)
    const isActive = active.tab !== CAMPAIGN_TAB.LIST && campaignTabKey(active) === campaignTabKey(item)

    return buildCampaignTabsHref(pathname, searchParams, isActive ? previousCampaignTabAfterClose(open, item) : active)
}
