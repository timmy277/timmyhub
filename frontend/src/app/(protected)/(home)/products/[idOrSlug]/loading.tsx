import { Skeleton } from '@/components/ui'

// Skeleton tải trang chi tiết sản phẩm — giữ nguyên Shell Header/Footer, không unmount hay giật layout.
export default function ProductDetailLoading() {
    return (
        <div className="min-h-screen bg-background pb-16">
            {/* Breadcrumb Skeleton */}
            <div className="border-b border-border/60 bg-card/60">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* Left: Gallery */}
                    <div className="lg:col-span-6 space-y-4">
                        <Skeleton className="aspect-square w-full rounded-3xl" />
                        <div className="flex gap-3">
                            <Skeleton className="size-20 rounded-2xl" />
                            <Skeleton className="size-20 rounded-2xl" />
                            <Skeleton className="size-20 rounded-2xl" />
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32 rounded-full" />
                            <Skeleton className="h-8 w-3/4 rounded-xl" />
                            <Skeleton className="h-4 w-48 rounded-md" />
                        </div>
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 rounded-md" />
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-20 rounded-xl" />
                                <Skeleton className="h-9 w-20 rounded-xl" />
                                <Skeleton className="h-9 w-20 rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <Skeleton className="h-12 rounded-2xl" />
                            <Skeleton className="h-12 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
