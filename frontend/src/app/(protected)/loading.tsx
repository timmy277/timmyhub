import { ContentSkeleton } from '@/components'

// Skeleton vùng nội dung khi chuyển trang trong nhóm (protected).
// NavLayout (sidebar + header) ở layout cha giữ nguyên — chỉ vùng <main> hiện skeleton.
export default function ProtectedLoading() {
    return <ContentSkeleton />
}
