import type { Metadata } from 'next'
import { PageContainer } from '@/components'
import { SellerWalletPanel } from '@/features/seller'

export const metadata: Metadata = {
    title: 'Ví & Dòng tiền | Kênh Người Bán TimmyHub',
}

export default function SellerWalletPage() {
    return (
        <PageContainer>
            <div className="space-y-6 max-w-6xl mx-auto py-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Ví người bán & Doanh thu</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Theo dõi dòng tiền bán hàng, số dư chờ đối soát và tạo yêu cầu rút tiền về tài khoản ngân hàng.
                    </p>
                </div>
                <SellerWalletPanel />
            </div>
        </PageContainer>
    )
}
