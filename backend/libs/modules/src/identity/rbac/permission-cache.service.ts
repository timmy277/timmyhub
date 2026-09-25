import { Injectable } from '@nestjs/common'

import { PERMISSION_CACHE_TTL_MS } from '../identity.constants'

// Cache in-process TTL 15 phút, đúng hành vi mô tả ở rbac-advanced.md §6 (Redis perm:{userId} + fallback LRU).
// ADR-0015 (modular monolith, 1 process) làm cho tầng Redis chưa cần thiết ngay: chưa có consumer nào khác
// process cần đọc cache này. Giữ interface hẹp (get/set/invalidate) để thay bằng Redis sau mà không đụng RbacService.
type CacheEntry = { value: ReadonlySet<string>; expiresAt: number }

@Injectable()
export class PermissionCacheService {
    // ===== Dependencies =====
    private readonly store = new Map<string, CacheEntry>()

    // ===== Queries =====
    get(userId: string): ReadonlySet<string> | undefined {
        const entry = this.store.get(userId)
        if (!entry) return undefined
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(userId)
            return undefined
        }
        return entry.value
    }

    // ===== Commands =====
    set(userId: string, permissions: ReadonlySet<string>): void {
        this.store.set(userId, { value: permissions, expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS })
    }

    invalidateUser(userId: string): void {
        this.store.delete(userId)
    }

    invalidateUsers(userIds: readonly string[]): void {
        for (const userId of userIds) this.store.delete(userId)
    }

    invalidateAll(): void {
        this.store.clear()
    }
}
