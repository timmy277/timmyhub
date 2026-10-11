import { redirect } from 'next/navigation'

import { ROUTE } from '@/constants'

export default function MyVouchersPage() {
    redirect(ROUTE.ACCOUNT_VOUCHERS)
}
