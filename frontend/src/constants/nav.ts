import { HistoryIcon, KeyRoundIcon, LayoutGridIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'

import type { BreadcrumbEntry, NavGroup } from '@/types'

import { DASHBOARD_PERMISSION } from './permission'
import { ROUTE } from './route'

// Tên cookie mà `components/ui/sidebar.tsx` ghi khi đóng/mở — NavLayout đọc lại ở server để render đúng trạng thái.
export const SIDEBAR_STATE_COOKIE_NAME = 'sidebar_state'

// Menu bên thanh điều hướng quản trị (Dashboard/Admin) — không chứa Trang chủ vì Trang chủ là landing độc lập cho người dùng.
export const NAV_GROUPS: readonly NavGroup[] = [
    {
        items: [
            {
                titleKey: 'dashboard',
                url: ROUTE.DASHBOARD,
                icon: LayoutGridIcon,
                requirePermission: DASHBOARD_PERMISSION,
            },
            { titleKey: 'users', url: ROUTE.USERS, icon: UsersIcon },
            { titleKey: 'roles', url: ROUTE.ROLES, icon: ShieldCheckIcon },
            { titleKey: 'permissions', url: ROUTE.PERMISSIONS, icon: KeyRoundIcon },
            { titleKey: 'audit', url: ROUTE.AUDIT, icon: HistoryIcon },
        ],
    },
]

// Breadcrumb khai báo sẵn theo pathname. Pathname không có ở đây thì `useBreadcrumbs` tự dựng từ các đoạn URL.
export const BREADCRUMB_ROUTES: Readonly<Record<string, readonly BreadcrumbEntry[]>> = {
    [ROUTE.HOME]: [{ titleKey: 'home', url: ROUTE.HOME }],
    [ROUTE.DASHBOARD]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
    ],
    [ROUTE.USERS]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'users', url: ROUTE.USERS },
    ],
    [ROUTE.ROLES]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'roles', url: ROUTE.ROLES },
    ],
    [ROUTE.PERMISSIONS]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'permissions', url: ROUTE.PERMISSIONS },
    ],
    [ROUTE.AUDIT]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'audit', url: ROUTE.AUDIT },
    ],
}
