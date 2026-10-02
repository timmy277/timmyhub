'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import type { EffectivePermissions, PermissionName } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { apiClient } from '@/services'

// Lấy danh sách quyền hiệu lực (effective permissions) của người dùng hiện tại từ backend RBAC service.
// Cache-aside phía React Query theo userId, tự động re-fetch khi user thay đổi hoặc sau 5 phút.
export function usePermissions() {
    const { data: session, status } = useSession()
    const userId = session?.user?.id

    const query = useQuery({
        queryKey: ['user-permissions', userId],
        queryFn: async (): Promise<string[]> => {
            if (!userId) return []
            const response = await apiClient.get<EffectivePermissions>(
                API_ROUTE.RBAC.USER_EFFECTIVE_PERMISSIONS(userId),
            )
            return response.data.permissions
        },
        enabled: Boolean(userId),
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    })

    const permissionsSet = useMemo(() => new Set(query.data ?? []), [query.data])

    const hasPermission = (permission: PermissionName | string): boolean => {
        return permissionsSet.has(permission)
    }

    const hasAnyPermission = (permissions: (PermissionName | string)[]): boolean => {
        return permissions.some((p) => permissionsSet.has(p))
    }

    const hasAllPermissions = (permissions: (PermissionName | string)[]): boolean => {
        return permissions.every((p) => permissionsSet.has(p))
    }

    return {
        permissions: query.data ?? [],
        permissionsSet,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isLoading: status === 'loading' || query.isLoading,
        isFetched: query.isFetched,
    }
}
