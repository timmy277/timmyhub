import { auditTabKey, parseAuditTabKeys, type AuditTabItem } from './audit-tab-query'

// Danh sách tab đang mở của màn audit log, lưu theo từng tài khoản trong localStorage — cùng khuôn với
// `user-tabs-storage.ts`. Vì chỉ có tab chi tiết, khoá ở đây đơn giản hơn nhưng giữ nguyên cơ chế
// `useSyncExternalStore` + sự kiện tuỳ biến để nhiều tab trình duyệt đồng bộ nhau.
const STORAGE_PREFIX = 'timmyhub:audit-log-tabs:v1'
const UPDATE_EVENT = 'timmyhub:audit-log-tabs-updated'

export function auditTabsStorageKey(userId: string): string {
    return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

export function getOpenAuditTabsSnapshot(userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(auditTabsStorageKey(userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenAuditTabs(userId: string, onChange: () => void): () => void {
    const storageKey = auditTabsStorageKey(userId)
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

export function writeOpenAuditTabs(userId: string, tabs: readonly AuditTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseAuditTabKeys(tabs.map(auditTabKey))
    try {
        window.localStorage.setItem(auditTabsStorageKey(userId), JSON.stringify(uniqueTabs.map(auditTabKey)))
    } catch {
        // Trạng thái tab chỉ là tiện ích; localStorage bị chặn/đầy không được làm hỏng điều hướng.
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { userId } }))
}
