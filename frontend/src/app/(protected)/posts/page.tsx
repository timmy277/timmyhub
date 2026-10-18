import { Suspense } from 'react'
import type { Metadata } from 'next'

import { FullscreenVideoView } from '@/features/content'

export const metadata: Metadata = {
    title: 'Video & Bài Viết Bán Hàng Trực Tiếp — Khám Phá & Mua Sắm | TimmyHub',
    description:
        'Trải nghiệm video ngắn giới thiệu sản phẩm chân thực, đánh giá chi tiết và mua hàng ngay trên video với chất lượng HLS HD mượt mà tại TimmyHub.',
}

export default function PostsPage() {
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
                    <div className="size-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
            }
        >
            <FullscreenVideoView />
        </Suspense>
    )
}
