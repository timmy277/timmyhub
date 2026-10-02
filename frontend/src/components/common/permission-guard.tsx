'use client'

import type { ReactNode } from 'react'

import type { PermissionName } from '@timmyhub/contracts'

import { usePermissions } from '@/hooks'

interface PermissionGuardProps {
    permission?: PermissionName | string
    anyPermissions?: (PermissionName | string)[]
    allPermissions?: (PermissionName | string)[]
    fallback?: ReactNode
    children: ReactNode
}

// Ẩn/hiện component dựa theo quyền hạn thực tế của người dùng:
// - Truyền `permission`: kiểm tra quyền đơn
// - Truyền `anyPermissions`: chỉ cần có 1 trong các quyền
// - Truyền `allPermissions`: phải có đủ tất cả các quyền
export function PermissionGuard({
    permission,
    anyPermissions,
    allPermissions,
    fallback = null,
    children,
}: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isFetched } = usePermissions()

    if (!isFetched) {
        return null
    }

    let allowed = true
    if (permission) {
        allowed = allowed && hasPermission(permission)
    }
    if (anyPermissions && anyPermissions.length > 0) {
        allowed = allowed && hasAnyPermission(anyPermissions)
    }
    if (allPermissions && allPermissions.length > 0) {
        allowed = allowed && hasAllPermissions(allPermissions)
    }

    if (!allowed) {
        return fallback
    }

    return <>{children}</>
}
