import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyApplicationsAction, getMyShopAction, SellerRegistrationForm } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

export const metadata: Metadata = {
    title: 'Đăng ký bán hàng · TimmyHub',
}

export default async function SellerRegisterPage() {
    const [appsRes, shopRes, actor] = await Promise.all([getMyApplicationsAction(), getMyShopAction(), getActor()])

    // Quản trị viên (Admin) không được đăng ký bán hàng
    if (actor?.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const isAlreadySeller =
        (shopRes.ok && Boolean(shopRes.data)) || (actor?.permissions.has(SELLER_SHOP_PERMISSION) ?? false)

    // Nếu đã là người bán, chuyển hướng thẳng vào Kênh Người Bán — không hiển thị trang đăng ký nữa
    if (isAlreadySeller) {
        redirect(ROUTE.SELLER_PORTAL)
    }

    const initialApplications = appsRes.ok ? appsRes.data : []

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <SellerRegistrationForm initialApplications={initialApplications} isAlreadySeller={false} />
        </div>
    )
}
