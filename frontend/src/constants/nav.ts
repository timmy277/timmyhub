import { HistoryIcon, KeyRoundIcon, LayoutGridIcon, ShieldCheckIcon, StoreIcon, UsersIcon } from 'lucide-react'

import type { BreadcrumbEntry, NavGroup } from '@/types'

import { AUDIT_PERMISSION } from './audit'
import {
    DASHBOARD_PERMISSION,
    RBAC_PERMISSION,
    SELLER_APPLICATIONS_PERMISSION,
    SELLER_SHOP_ANY_PERMISSION,
    SELLER_SHOP_PERMISSION,
    USER_PERMISSION,
} from './permission'
import { ROUTE } from './route'

// Tên cookie mà `components/ui/sidebar.tsx` ghi khi đóng/mở — NavLayout đọc lại ở server để render đúng trạng thái.
export const SIDEBAR_STATE_COOKIE_NAME = 'sidebar_state'

// Menu bên thanh điều hướng (Admin/Dashboard & Kênh Người Bán) — lọc động theo quyền của người dùng.
export const NAV_GROUPS: readonly NavGroup[] = [
    {
        labelKey: 'adminSection',
        items: [
            {
                titleKey: 'dashboard',
                url: ROUTE.DASHBOARD,
                icon: LayoutGridIcon,
                requirePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'users',
                url: ROUTE.USERS,
                icon: UsersIcon,
                requirePermission: USER_PERMISSION.LIST,
            },
            {
                titleKey: 'roles',
                url: ROUTE.ROLES,
                icon: ShieldCheckIcon,
                requirePermission: RBAC_PERMISSION.ROLES_LIST,
            },
            {
                titleKey: 'permissions',
                url: ROUTE.PERMISSIONS,
                icon: KeyRoundIcon,
                requirePermission: RBAC_PERMISSION.PERMISSIONS_LIST,
            },
            {
                titleKey: 'sellerApplications',
                url: ROUTE.ADMIN_SELLER_APPLICATIONS,
                icon: StoreIcon,
                requirePermission: SELLER_APPLICATIONS_PERMISSION,
            },
            {
                titleKey: 'audit',
                url: ROUTE.AUDIT,
                icon: HistoryIcon,
                requirePermission: AUDIT_PERMISSION.LIST,
            },
        ],
    },
    {
        labelKey: 'sellerSection',
        items: [
            {
                titleKey: 'sellerPortal',
                url: ROUTE.SELLER_PORTAL,
                icon: StoreIcon,
                requirePermission: [SELLER_SHOP_PERMISSION, SELLER_SHOP_ANY_PERMISSION],
            },
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
    [ROUTE.ADMIN_SELLER_APPLICATIONS]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'sellerApplications', url: ROUTE.ADMIN_SELLER_APPLICATIONS },
    ],
    [ROUTE.AUDIT]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'audit', url: ROUTE.AUDIT },
    ],
    [ROUTE.SELLER_PORTAL]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'sellerPortal', url: ROUTE.SELLER_PORTAL },
    ],
    [ROUTE.SELLER_REGISTER]: [
        { titleKey: 'home', url: ROUTE.HOME },
        { titleKey: 'becomeSeller', url: ROUTE.SELLER_REGISTER },
    ],
}
