import { ContentSkeleton } from '@/components'

// Skeleton vùng nội dung <main> khi chuyển trang trong khu vực quản trị (admin).
// NavLayout (AppSidebar + Header) trong AdminLayout được giữ nguyên — chỉ vùng <main> hiện skeleton,
// giúp sidebar và appbar không bị nhấp nháy hay biến thành skeleton khi chuyển giữa các trang dashboard/quản trị.
export default function AdminLoading() {
    return <ContentSkeleton />
}
