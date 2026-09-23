import type { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarInset, SidebarProvider } from '@/components/ui'
import { SIDEBAR_STATE_COOKIE_NAME } from '@/constants'
import { AppSidebar } from './app-sidebar'
import { Header } from './header'

interface NavLayoutProps {
    children: ReactNode
}

// Khung có sidebar + header. Opt-in: trang nào cần thì tự bọc nội dung của mình trong <NavLayout>, trang không
// bọc thì không có sidebar.
//
// Server Component: tự đọc cookie `sidebar_state` để render đúng trạng thái đóng/mở ngay lần đầu, không nháy
// khi hydrate. Chỉ phần thân cuộn — inset bị chặn đúng chiều cao viewport, header là một hàng cố định phía trên.
export async function NavLayout({ children }: NavLayoutProps) {
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get(SIDEBAR_STATE_COOKIE_NAME)?.value !== 'false'

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="h-svh overflow-hidden">
                <Header />
                <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
                    <main className="flex w-full flex-1 flex-col">{children}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
