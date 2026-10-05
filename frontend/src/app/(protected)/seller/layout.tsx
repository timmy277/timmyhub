import type { ReactNode } from 'react'

import { HomeHeader } from '@/components/layout'

interface SellerLayoutProps {
    children: ReactNode
}

// Layout cho các trang Người bán (Đăng ký bán hàng, Kênh Người Bán):
// Bọc thanh Header/Navbar ở trên cùng để người dùng luôn có thanh điều hướng và menu tài khoản.
export default function SellerLayout({ children }: SellerLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col">
            <HomeHeader />
            <main className="flex-1">{children}</main>
        </div>
    )
}
