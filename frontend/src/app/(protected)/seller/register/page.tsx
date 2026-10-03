import type { Metadata } from 'next'

import { getMyApplicationsAction, getMyShopAction, SellerRegistrationForm } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Đăng ký bán hàng · TimmyHub',
}

export default async function SellerRegisterPage() {
    const [appsRes, shopRes] = await Promise.all([getMyApplicationsAction(), getMyShopAction()])

    const initialApplications = appsRes.ok ? appsRes.data : []
    const isAlreadySeller = shopRes.ok && Boolean(shopRes.data)

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <SellerRegistrationForm initialApplications={initialApplications} isAlreadySeller={isAlreadySeller} />
        </div>
    )
}
