import { Skeleton } from '@/components/ui'

// Skeleton vùng nội dung trang mua sắm / trang chủ / giỏ hàng.
// HomeLayout (HomeHeader) được giữ nguyên ở trên, chỉ vùng nội dung hiển thị khung tải.
export default function HomeLoading() {
    return (
        <div role="status" aria-busy="true" className="container mx-auto px-4 py-6 space-y-6">
            {/* Hero / Banner skeleton */}
            <Skeleton className="h-64 sm:h-80 w-full rounded-2xl" />
            {/* Categories skeleton */}
            <div className="flex gap-2 overflow-x-auto py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
                ))}
            </div>
            {/* Grid sản phẩm skeleton */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-xl border border-border/50 p-3">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    )
}
