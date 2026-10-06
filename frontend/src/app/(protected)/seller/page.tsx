import { redirect } from 'next/navigation'
import { getMyShopAction } from '@/features/seller'
import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

export default async function SellerIndexPage() {
    const actor = await getActor()
    if (!actor) {
        redirect(ROUTE.LOGIN)
    }

    if (actor.permissions.has(DASHBOARD_PERMISSION)) {
        redirect(ROUTE.DASHBOARD)
    }

    const hasSellerPerm = actor.permissions.has(SELLER_SHOP_PERMISSION)
    if (hasSellerPerm) {
        redirect(ROUTE.SELLER_PORTAL)
    }

    const res = await getMyShopAction()
    const isSeller = res.ok && Boolean(res.data)

    if (isSeller) {
        redirect(ROUTE.SELLER_PORTAL)
    } else {
        redirect(ROUTE.SELLER_REGISTER)
    }
}
