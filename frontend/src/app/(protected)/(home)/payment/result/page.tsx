import type { Metadata } from 'next'

import { PaymentResultView } from '@/features/checkout'

export const metadata: Metadata = {
    title: 'Kết quả thanh toán · TimmyHub',
    description: 'Kết quả giao dịch thanh toán đơn hàng trên sàn thương mại điện tử TimmyHub',
}

interface PaymentResultPageProps {
    searchParams: Promise<{
        success?: string
        orderId?: string
        message?: string
        code?: string
    }>
}

export default async function PaymentResultPage({ searchParams }: PaymentResultPageProps) {
    const params = await searchParams
    const isSuccess = params.success === 'true'
    const orderId = params.orderId || ''
    const message = params.message || ''
    const code = params.code || ''

    return <PaymentResultView success={isSuccess} orderId={orderId} message={message} code={code} />
}
