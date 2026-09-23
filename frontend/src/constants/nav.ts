import { HouseIcon, LayoutGridIcon } from 'lucide-react'

import type { BreadcrumbEntry, NavGroup, NavUserInfo } from '@/types'
import { ROUTE } from './route'

// Tên cookie mà `components/ui/sidebar.tsx` ghi khi đóng/mở — NavLayout đọc lại ở server để render đúng trạng thái.
export const SIDEBAR_STATE_COOKIE_NAME = 'sidebar_state'

// Chỉ liệt kê route đã tồn tại: link tới route chưa dựng là một trang 404 người dùng thấy trước mình.
export const NAV_GROUPS: readonly NavGroup[] = [
    {
        labelKey: 'overview',
        items: [
            { titleKey: 'home', url: ROUTE.HOME, icon: HouseIcon },
            { titleKey: 'dashboard', url: ROUTE.DASHBOARD, icon: LayoutGridIcon },
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
}

// Dữ liệu giả cho menu user ở header, thay bằng user thật khi có auth ở FE.
export const MOCK_NAV_USER: NavUserInfo = {
    name: 'Timmy Hub',
    email: 'demo@timmyhub.dev',
}
