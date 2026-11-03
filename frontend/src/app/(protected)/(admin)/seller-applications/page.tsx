import { redirect } from 'next/navigation'
import { ROUTE } from '@/constants'

export default function SellerApplicationsRedirect() {
    redirect(ROUTE.ADMIN_SELLER_MANAGEMENT)
}
