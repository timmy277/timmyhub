import { Suspense } from 'react'
import type { Metadata } from 'next'

import { ContentSkeleton } from '@/components/common'
import { SellerVideosView } from '@/features/content'

export const metadata: Metadata = {
    title: 'Quản lý Video Bán Hàng & Shoppable Media | Kênh Người Bán TimmyHub',
    description:
        'Trung tâm đăng tải, quản lý video ngắn bán hàng shoppable, gắn link giỏ hàng trực tiếp và theo dõi hiệu suất video cho nhà bán hàng TimmyHub.',
}

export default function SellerVideosPage() {
    return (
        <Suspense fallback={<ContentSkeleton />}>
            <SellerVideosView />
        </Suspense>
    )
}
