import { ContentSkeleton } from '@/components'

// Skeleton vùng nội dung trang Quản lý sản phẩm.
// NavLayout (AppSidebar + Header) ở ProductsLayout giữ nguyên — chỉ vùng nội dung hiển thị skeleton.
export default function ProductsLoading() {
    return <ContentSkeleton />
}
