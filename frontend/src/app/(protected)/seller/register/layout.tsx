import type { ReactNode } from 'react'

import { HomeHeader } from '@/components/layout'

interface SellerRegisterLayoutProps {
    children: ReactNode
}

// Layout cho trang đăng ký Người bán:
// Chỉ có thanh AppBar ở trên cùng (HomeHeader), KHÔNG có thanh bên (sidebar).
export default function SellerRegisterLayout({ children }: SellerRegisterLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col bg-background">
            <HomeHeader />
            <main className="flex-1">{children}</main>
        </div>
    )
}
