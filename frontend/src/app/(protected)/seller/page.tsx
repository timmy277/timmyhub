import { redirect } from 'next/navigation'
import { getMyShopAction } from '@/features/seller'
import { ROUTE } from '@/constants'

export default async function SellerIndexPage() {
    const res = await getMyShopAction()
    const isSeller = res.ok && Boolean(res.data)

    if (isSeller) {
        redirect(ROUTE.SELLER_PORTAL)
    } else {
        redirect(ROUTE.SELLER_REGISTER)
    }
}
