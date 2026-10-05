import type { ReactNode } from 'react'

import { HomeFooter, HomeHeader } from '@/components/layout'

interface SellerLayoutProps {
    children: ReactNode
}

// Layout cho các trang Người bán (Đăng ký bán hàng, Kênh Người Bán):
// Bọc thanh Header/Navbar ở trên cùng và Footer ở dưới cùng.
export default function SellerLayout({ children }: SellerLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col">
            <HomeHeader />
            <main className="flex-1">{children}</main>
            <HomeFooter />
        </div>
    )
}
