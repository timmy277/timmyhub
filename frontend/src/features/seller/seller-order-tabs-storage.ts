import { parseSellerOrderTabKeys, sellerOrderTabKey, type SellerOrderTabItem } from './seller-order-tab-query'

const STORAGE_PREFIX = 'timmyhub:seller-order-tabs:v1'
const UPDATE_EVENT = 'timmyhub:seller-order-tabs-updated'

export function sellerOrderTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenSellerOrderTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(sellerOrderTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenSellerOrderTabs(userId: string, onChange: () => void): () => void {
    const storageKey = sellerOrderTabsStorageKey(userId)
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

export function writeOpenSellerOrderTabs(userId: string, tabs: readonly SellerOrderTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseSellerOrderTabKeys(tabs.map(sellerOrderTabKey))
    try {
        window.localStorage.setItem(
            sellerOrderTabsStorageKey(userId),
            JSON.stringify(uniqueTabs.map(sellerOrderTabKey)),
        )
    } catch {
        // LocalStorage đầy hoặc bị chặn không làm hỏng ứng dụng
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
