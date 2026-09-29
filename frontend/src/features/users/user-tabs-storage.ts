import { parseUserTabKeys, userTabKey, type UserTabItem } from './user-tab-query'

const STORAGE_PREFIX = 'timmyhub:user-management-tabs:v1'
const UPDATE_EVENT = 'timmyhub:user-management-tabs-updated'

export function userTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function readOpenUserTabs(userId: string): UserTabItem[] {
    if (typeof window === 'undefined') return []

    try {
        const stored = window.localStorage.getItem(userTabsStorageKey(userId))
        return stored ? parseUserTabKeys(JSON.parse(stored)) : []
    } catch {
        return []
    }
}

export function getOpenUserTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(userTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenUserTabs(userId: string, onChange: () => void): () => void {
    const storageKey = userTabsStorageKey(userId)
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

export function writeOpenUserTabs(userId: string, tabs: readonly UserTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseUserTabKeys(tabs.map(userTabKey))
    try {
        window.localStorage.setItem(userTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(userTabKey)))
    } catch {
        // Tab state is a convenience; a disabled or full localStorage must not block navigation.
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}

export function userTabsUpdatedEventName(): string {
    return UPDATE_EVENT
}
