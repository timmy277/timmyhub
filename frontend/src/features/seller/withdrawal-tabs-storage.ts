import { parseWithdrawalTabKeys, withdrawalTabKey, type WithdrawalTabItem } from './withdrawal-tab-query'

const STORAGE_PREFIX = 'timmyhub:withdrawal-tabs:v1'
const UPDATE_EVENT = 'timmyhub:withdrawal-tabs-updated'

export function withdrawalTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenWithdrawalTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(withdrawalTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenWithdrawalTabs(userId: string, onChange: () => void): () => void {
    const storageKey = withdrawalTabsStorageKey(userId)
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

export function writeOpenWithdrawalTabs(userId: string, tabs: readonly WithdrawalTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseWithdrawalTabKeys(tabs.map(withdrawalTabKey))
    try {
        window.localStorage.setItem(withdrawalTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(withdrawalTabKey)))
    } catch {
        // Trạng thái tab là tiện ích phía client
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
