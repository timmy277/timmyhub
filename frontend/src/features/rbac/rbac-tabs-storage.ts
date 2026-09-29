import { type RbacKind } from '@/constants'

import { parseRbacTabKeys, rbacTabKey, type RbacTabItem } from './rbac-tab-query'

// Danh sách tab đã mở của màn quản trị vai trò/quyền, lưu ở localStorage theo (loại màn, tài khoản) — URL chỉ giữ tab
// đang xem. Cùng khuôn với `user-tabs-storage`: đọc/ghi qua `useSyncExternalStore` để nhiều tab trình duyệt đồng bộ.
const STORAGE_PREFIX = 'timmyhub:rbac-tabs:v1'
const UPDATE_EVENT = 'timmyhub:rbac-tabs-updated'

export function rbacTabsStorageKey(kind: RbacKind, userId: string): string {
    return `${STORAGE_PREFIX}:${kind}:${encodeURIComponent(userId)}`
}

export function getOpenRbacTabsSnapshot(kind: RbacKind, userId: string): string {
    if (typeof window === 'undefined') return '[]'

    try {
        return window.localStorage.getItem(rbacTabsStorageKey(kind, userId)) ?? '[]'
    } catch {
        return '[]'
    }
}

export function subscribeToOpenRbacTabs(kind: RbacKind, userId: string, onChange: () => void): () => void {
    const storageKey = rbacTabsStorageKey(kind, userId)
    const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onChange()
    }
    const handleUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<{ kind?: string; userId?: string }>
        if (customEvent.detail?.kind === kind && customEvent.detail?.userId === userId) onChange()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(UPDATE_EVENT, handleUpdate)
    return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(UPDATE_EVENT, handleUpdate)
    }
}

export function writeOpenRbacTabs(kind: RbacKind, userId: string, tabs: readonly RbacTabItem[]): void {
    if (typeof window === 'undefined') return

    const uniqueTabs = parseRbacTabKeys(
        kind,
        tabs.map((tab) => rbacTabKey(tab)),
    )
    try {
        window.localStorage.setItem(rbacTabsStorageKey(kind, userId), JSON.stringify(uniqueTabs.map(rbacTabKey)))
    } catch {
        // Trạng thái tab chỉ là tiện ích; localStorage bị chặn/đầy không được cản điều hướng.
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { kind, userId } }))
}
