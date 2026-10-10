import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components'
import { ROUTE } from '@/constants'
import { getOrderByIdAction } from '@/features/checkout'
import { OrderDetailView } from '@/features/orders'

interface OrderDetailPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
    const { id } = await params
    return {
        title: `Đơn hàng #${id} · TimmyHub`,
        description: `Chi tiết đơn hàng #${id} trên sàn thương mại điện tử TimmyHub`,
    }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    const { id } = await params
    const result = await getOrderByIdAction(id)

    if (!result.ok) {
        return (
            <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertCircleIcon className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Không tìm thấy đơn hàng</h2>
                <p className="text-sm text-muted-foreground">
                    {result.message || 'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.'}
                </p>
                <div className="pt-2">
                    <Link href={ROUTE.ORDERS}>
                        <Button variant="outline" className="gap-2">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Quay lại danh sách đơn hàng
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return <OrderDetailView initialOrder={result.data} />
}
