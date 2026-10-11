import { CAMPAIGN_TABS_STORAGE_KEY_PREFIX } from '@/constants'
import { parseCampaignTabKeys, campaignTabKey, type CampaignTabItem } from './campaign-tab-query'

const UPDATE_EVENT = 'timmyhub:campaign-tabs-updated'

export function campaignTabsStorageKey(userId: string): string {
    return `${CAMPAIGN_TABS_STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`
}

export function getOpenCampaignTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined' || !userId) return '[]'
    try {
        return window.localStorage.getItem(campaignTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenCampaignTabs(userId: string, onChange: () => void): () => void {
    if (typeof window === 'undefined' || !userId) return () => {}
    const storageKey = campaignTabsStorageKey(userId)
    const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onChange()
    }
    const handleUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<{ userId?: string }>
        if (customEvent.detail?.userId === userId) onChange()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(UPDATE_EVENT, handleUpdate)
    return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(UPDATE_EVENT, handleUpdate)
    }
}

export function writeOpenCampaignTabs(userId: string, items: readonly CampaignTabItem[]): void {
    if (typeof window === 'undefined' || !userId) return
    const uniqueTabs = parseCampaignTabKeys(items.map(campaignTabKey))
    try {
        const payload = JSON.stringify(uniqueTabs.map(campaignTabKey))
        window.localStorage.setItem(campaignTabsStorageKey(userId), payload)
    } catch {
        // quota exceeded / disabled localStorage -> ignore
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
