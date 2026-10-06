import { parseProductTabKeys, productTabKey, type ProductTabItem } from './product-tab-query'

const STORAGE_PREFIX = 'timmyhub:product-tabs:v1'
const UPDATE_EVENT = 'timmyhub:product-tabs-updated'

export function productTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenProductTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(productTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenProductTabs(userId: string, onChange: () => void): () => void {
    const storageKey = productTabsStorageKey(userId)
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

export function writeOpenProductTabs(userId: string, tabs: readonly ProductTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseProductTabKeys(tabs.map(productTabKey))
    try {
        window.localStorage.setItem(productTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(productTabKey)))
    } catch {
        // LocalStorage đầy hoặc bị chặn không làm hỏng ứng dụng
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
