import type { ReactNode } from 'react'

import { HomeHeader } from './home-header'
import { HomeFooter } from './home-footer'

interface HomeLayoutProps {
    children: ReactNode
}

// Layout trang chủ cho người dùng thông thường:
// Chỉ có AppBar ở trên cùng, không có sidebar.
export function HomeLayout({ children }: HomeLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col">
            <HomeHeader />
            <main className="flex-1">{children}</main>
            <HomeFooter />
        </div>
    )
}
