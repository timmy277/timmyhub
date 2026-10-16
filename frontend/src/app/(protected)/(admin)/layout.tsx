import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}
import {
    AUDIT_PERMISSION,
    DASHBOARD_PERMISSION,
    RBAC_PERMISSION,
    ROUTE,
    SELLER_APPLICATIONS_PERMISSION,
    USER_PERMISSION,
} from '@/constants'
import { getActor } from '@/lib/actor-permissions'

interface AdminLayoutProps {
    children: ReactNode
}

// Các quyền quản trị — chỉ người có ít nhất 1 quyền này mới được vào nhóm route (admin)
const ADMIN_REQUIRED_PERMISSIONS = [
    DASHBOARD_PERMISSION,
    USER_PERMISSION.LIST,
    RBAC_PERMISSION.ROLES_LIST,
    RBAC_PERMISSION.PERMISSIONS_LIST,
    SELLER_APPLICATIONS_PERMISSION,
    AUDIT_PERMISSION.LIST,
]

// Layout dành riêng cho khu vực quản trị (Dashboard, Người dùng, Vai trò, Quyền hạn, Nhật ký kiểm toán):
// Có sidebar điều hướng bên trái và thanh header bên trên.
// Chỉ người dùng có ít nhất một quyền quản trị mới được vào khu vực này — người dùng thông thường hoặc seller không có quyền admin bị redirect về trang chủ `/`.
export default async function AdminLayout({ children }: AdminLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    // Kiểm tra xem người dùng có ít nhất một quyền trong hệ thống quản trị hay không
    const hasAnyAdminAccess = ADMIN_REQUIRED_PERMISSIONS.some((p) => actor.permissions.has(p))

    // Nếu người dùng không có quyền quản trị nào, chuyển hướng về trang chủ
    if (!hasAnyAdminAccess) {
        redirect(ROUTE.HOME)
    }

    return <NavLayout>{children}</NavLayout>
}
