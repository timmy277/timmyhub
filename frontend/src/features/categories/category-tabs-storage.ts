import { parseCategoryTabKeys, categoryTabKey, type CategoryTabItem } from './category-tab-query'

const STORAGE_PREFIX = 'timmyhub:category-tabs:v1'
const UPDATE_EVENT = 'timmyhub:category-tabs-updated'

export function categoryTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenCategoryTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(categoryTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenCategoryTabs(userId: string, onChange: () => void): () => void {
    const storageKey = categoryTabsStorageKey(userId)
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

export function writeOpenCategoryTabs(userId: string, tabs: readonly CategoryTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseCategoryTabKeys(tabs.map(categoryTabKey))
    try {
        window.localStorage.setItem(categoryTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(categoryTabKey)))
    } catch {
        // LocalStorage đầy hoặc bị chặn không làm hỏng ứng dụng
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
