import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarInset, SidebarProvider } from '@/components/ui'
import { SELLER_SHOP_PERMISSION, SIDEBAR_STATE_COOKIE_NAME } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

import { AppSidebar } from './app-sidebar'
import { Header } from './header'

interface NavLayoutProps {
    children: ReactNode
}

// Khung có sidebar + header, gắn một lần ở `app/(protected)/layout.tsx` (PERF-001): layout giữ nguyên khi chuyển
// trang trong nhóm nên sidebar/header không render lại. Trang ngoài nhóm `(protected)` thì không có sidebar.
//
// Server Component: tự đọc cookie `sidebar_state` để render đúng trạng thái đóng/mở ngay lần đầu, không nháy
// khi hydrate. Chỉ phần thân cuộn — inset bị chặn đúng chiều cao viewport, header là một hàng cố định phía trên.
//
// `getActor()` được `cache()` — nếu trang con cũng gọi `getActor()` thì vẫn chỉ là 1 lượt fetch; không lãng phí.
export async function NavLayout({ children }: NavLayoutProps) {
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get(SIDEBAR_STATE_COOKIE_NAME)?.value !== 'false'

    // Lấy tập quyền để lọc nav item — chỉ truyền set (serializable thông qua SSR props client component).
    const actor = await getActor()
    const permissions = new Set(actor?.permissions ?? [])
    if (!permissions.has(SELLER_SHOP_PERMISSION) && actor) {
        const shopRes = await getMyShopAction()
        if (shopRes.ok && Boolean(shopRes.data)) {
            permissions.add(SELLER_SHOP_PERMISSION)
        }
    }

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar permissions={permissions} />
            <SidebarInset className="h-svh overflow-hidden">
                <Header />
                <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
                    <main className="flex w-full flex-1 flex-col">{children}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
