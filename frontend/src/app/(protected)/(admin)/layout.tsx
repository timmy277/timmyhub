import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { DASHBOARD_PERMISSION, NAV_GROUPS, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

interface AdminLayoutProps {
    children: ReactNode
}

// Layout dành riêng cho khu vực quản trị (Dashboard, Người dùng, Vai trò, Quyền hạn, Nhật ký kiểm toán):
// Có sidebar điều hướng bên trái và thanh header bên trên.
// Chỉ người dùng có ít nhất một quyền quản trị mới được vào khu vực này — người dùng thông thường bị redirect về trang chủ `/`.
export default async function AdminLayout({ children }: AdminLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    // Kiểm tra xem người dùng có ít nhất một quyền trong hệ thống quản trị hay không
    const hasAnyAdminAccess =
        actor.permissions.has(DASHBOARD_PERMISSION) ||
        NAV_GROUPS.some((group) =>
            group.items.some((item) => item.requirePermission && actor.permissions.has(item.requirePermission)),
        )

    // Nếu người dùng không có quyền quản trị nào, chuyển hướng về trang chủ
    if (!hasAnyAdminAccess) {
        redirect(ROUTE.HOME)
    }

    return <NavLayout>{children}</NavLayout>
}
