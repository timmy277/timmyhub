import { VOUCHER_TABS_STORAGE_KEY_PREFIX } from '@/constants'
import { parseVoucherTabKeys, voucherTabKey, type VoucherTabItem } from './voucher-tab-query'

const UPDATE_EVENT = 'timmyhub:voucher-tabs-updated'

export function voucherTabsStorageKey(userId: string): string {
    return `${VOUCHER_TABS_STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`
}

export function getOpenVoucherTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined' || !userId) return '[]'
    try {
        return window.localStorage.getItem(voucherTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenVoucherTabs(userId: string, onChange: () => void): () => void {
    if (typeof window === 'undefined' || !userId) return () => {}
    const storageKey = voucherTabsStorageKey(userId)
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

export function writeOpenVoucherTabs(userId: string, items: readonly VoucherTabItem[]): void {
    if (typeof window === 'undefined' || !userId) return
    const uniqueTabs = parseVoucherTabKeys(items.map(voucherTabKey))
    try {
        const payload = JSON.stringify(uniqueTabs.map(voucherTabKey))
        window.localStorage.setItem(voucherTabsStorageKey(userId), payload)
    } catch {
        // quota exceeded / disabled localStorage -> ignore
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
