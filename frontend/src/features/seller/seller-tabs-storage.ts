import { parseSellerTabKeys, sellerTabKey, type SellerTabItem } from './seller-tab-query'

const STORAGE_PREFIX = 'timmyhub:seller-application-tabs:v1'
const UPDATE_EVENT = 'timmyhub:seller-application-tabs-updated'

export function sellerTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenSellerTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(sellerTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenSellerTabs(userId: string, onChange: () => void): () => void {
    const storageKey = sellerTabsStorageKey(userId)
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

export function writeOpenSellerTabs(userId: string, tabs: readonly SellerTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseSellerTabKeys(tabs.map(sellerTabKey))
    try {
        window.localStorage.setItem(sellerTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(sellerTabKey)))
    } catch {
        // Trạng thái tab là tiện ích phía client, localStorage đầy/bị chặn không làm hỏng ứng dụng.
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
