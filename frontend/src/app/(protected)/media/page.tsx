import type { Metadata } from 'next'

import { MediaLibrary } from '@/features/media'

export const metadata: Metadata = {
    title: 'Quản lý Media & Tải lên — TimmyHub',
    description: 'Quản lý thư viện hình ảnh, video sản phẩm chuẩn S3 / Supabase Storage',
}

export default function MediaPage() {
    return <MediaLibrary />
}
