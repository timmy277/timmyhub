import {
    BanknoteIcon,
    FlameIcon,
    FolderTreeIcon,
    HistoryIcon,
    KeyRoundIcon,
    LayoutGridIcon,
    MessageSquareIcon,
    PackageIcon,
    SettingsIcon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    StoreIcon,
    TicketIcon,
    UsersIcon,
    VideoIcon,
    WalletIcon,
} from 'lucide-react'

import type { BreadcrumbEntry, NavGroup } from '@/types'

import { AUDIT_PERMISSION } from './audit'
import {
    ADMIN_CATEGORY_PERMISSION,
    ADMIN_PROMOTION_PERMISSION,
    ADMIN_WITHDRAWAL_PERMISSION,
    CATALOG_PRODUCTS_ADMIN_PERMISSION,
    DASHBOARD_PERMISSION,
    RBAC_PERMISSION,
    SELLER_APPLICATIONS_PERMISSION,
    SELLER_PRODUCT_PERMISSION,
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
                titleKey: 'products',
                url: ROUTE.ADMIN_PRODUCTS,
                icon: PackageIcon,
                requirePermission: CATALOG_PRODUCTS_ADMIN_PERMISSION,
            },
            {
                titleKey: 'categories',
                url: ROUTE.ADMIN_CATEGORIES,
                icon: FolderTreeIcon,
                requirePermission: ADMIN_CATEGORY_PERMISSION.CREATE,
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
                titleKey: 'vouchers',
                url: ROUTE.ADMIN_VOUCHERS,
                icon: TicketIcon,
                requirePermission: ADMIN_PROMOTION_PERMISSION.VOUCHERS_LIST,
            },
            {
                titleKey: 'campaigns',
                url: ROUTE.ADMIN_CAMPAIGNS,
                icon: FlameIcon,
                requirePermission: ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_LIST,
            },
            {
                titleKey: 'withdrawals',
                url: ROUTE.ADMIN_WITHDRAWALS,
                icon: BanknoteIcon,
                requirePermission: ADMIN_WITHDRAWAL_PERMISSION.APPROVE,
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
                titleKey: 'sellerOverview',
                url: ROUTE.SELLER_PORTAL,
                icon: StoreIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerWallet',
                url: ROUTE.SELLER_WALLET,
                icon: WalletIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'products',
                url: ROUTE.PRODUCTS,
                icon: PackageIcon,
                requirePermission: [
                    SELLER_PRODUCT_PERMISSION.LIST,
                    SELLER_PRODUCT_PERMISSION.CREATE,
                    SELLER_SHOP_PERMISSION,
                ],
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerOrders',
                url: ROUTE.SELLER_ORDERS,
                icon: ShoppingBagIcon,
                requirePermission: [SELLER_SHOP_PERMISSION, 'orders:orders:list:shop'],
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerChat',
                url: ROUTE.SELLER_CHAT,
                icon: MessageSquareIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerVouchers',
                url: ROUTE.SELLER_VOUCHERS,
                icon: TicketIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerVideos',
                url: ROUTE.SELLER_VIDEOS,
                icon: VideoIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
            {
                titleKey: 'sellerSettings',
                url: ROUTE.SELLER_SETTINGS,
                icon: SettingsIcon,
                requirePermission: SELLER_SHOP_PERMISSION,
                excludePermission: DASHBOARD_PERMISSION,
            },
        ],
    },
]

// Breadcrumb khai báo sẵn theo pathname. Pathname không có ở đây thì `useBreadcrumbs` tự dựng từ các đoạn URL.
export const BREADCRUMB_ROUTES: Readonly<Record<string, readonly BreadcrumbEntry[]>> = {
    [ROUTE.HOME]: [{ titleKey: 'home', url: ROUTE.HOME }],
    [ROUTE.DASHBOARD]: [{ titleKey: 'dashboard', url: ROUTE.DASHBOARD }],
    [ROUTE.USERS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'users', url: ROUTE.USERS },
    ],
    [ROUTE.ROLES]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'roles', url: ROUTE.ROLES },
    ],
    [ROUTE.PERMISSIONS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'permissions', url: ROUTE.PERMISSIONS },
    ],
    [ROUTE.ADMIN_SELLER_APPLICATIONS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'sellerApplications', url: ROUTE.ADMIN_SELLER_APPLICATIONS },
    ],
    [ROUTE.ADMIN_CATEGORIES]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'categories', url: ROUTE.ADMIN_CATEGORIES },
    ],
    [ROUTE.ADMIN_VOUCHERS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'vouchers', url: ROUTE.ADMIN_VOUCHERS },
    ],
    [ROUTE.ADMIN_CAMPAIGNS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'campaigns', url: ROUTE.ADMIN_CAMPAIGNS },
    ],
    [ROUTE.ADMIN_WITHDRAWALS]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'withdrawals', url: ROUTE.ADMIN_WITHDRAWALS },
    ],
    [ROUTE.PRODUCTS]: [{ titleKey: 'products', url: ROUTE.PRODUCTS }],
    [ROUTE.AUDIT]: [
        { titleKey: 'dashboard', url: ROUTE.DASHBOARD },
        { titleKey: 'audit', url: ROUTE.AUDIT },
    ],
    [ROUTE.SELLER_PORTAL]: [{ titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL }],
    [ROUTE.SELLER_WALLET]: [
        { titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL },
        { titleKey: 'sellerWallet', url: ROUTE.SELLER_WALLET },
    ],
    [ROUTE.SELLER_ORDERS]: [
        { titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL },
        { titleKey: 'sellerOrders', url: ROUTE.SELLER_ORDERS },
    ],
    [ROUTE.SELLER_VOUCHERS]: [
        { titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL },
        { titleKey: 'sellerVouchers', url: ROUTE.SELLER_VOUCHERS },
    ],
    [ROUTE.SELLER_VIDEOS]: [
        { titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL },
        { titleKey: 'sellerVideos', url: ROUTE.SELLER_VIDEOS },
    ],
    [ROUTE.SELLER_SETTINGS]: [
        { titleKey: 'sellerOverview', url: ROUTE.SELLER_PORTAL },
        { titleKey: 'sellerSettings', url: ROUTE.SELLER_SETTINGS },
    ],
    [ROUTE.SELLER_REGISTER]: [{ titleKey: 'becomeSeller', url: ROUTE.SELLER_REGISTER }],
}
