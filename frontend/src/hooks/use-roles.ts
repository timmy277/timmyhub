'use client'

import { useQuery } from '@tanstack/react-query'

import type { RoleSummary } from '@timmyhub/contracts'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

// Lấy danh sách Roles từ backend RBAC service (dùng cho các dropdown chọn vai trò, filter...).
// Cache theo QUERY_KEY.RBAC.ROLES, tự động invalidate khi có thao tác tạo/sửa/xoá role.
export function useRoles() {
    const query = useQuery({
        queryKey: QUERY_KEY.RBAC.ROLES,
        queryFn: async (): Promise<RoleSummary[]> => {
            const response = await apiClient.get<RoleSummary[]>(API_ROUTE.RBAC.ROLES)
            return response.data
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    })

    return {
        roles: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    }
}
