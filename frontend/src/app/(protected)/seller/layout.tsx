import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { NavLayout } from '@/components/layout'
import { ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

interface SellerLayoutProps {
    children: ReactNode
}

// Layout cho các trang Người bán (Đăng ký bán hàng, Kênh Người Bán):
// Sử dụng chung hệ thống thanh bên (AppSidebar) và Header thông qua NavLayout.
// Thanh bên tự động lọc chỉ hiển thị những mục nằm trong quyền hạn của người dùng (SELLER xem Kênh người bán, ADMIN xem thêm Quản trị).
export default async function SellerLayout({ children }: SellerLayoutProps) {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    return <NavLayout>{children}</NavLayout>
}
