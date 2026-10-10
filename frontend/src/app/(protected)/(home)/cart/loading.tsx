import { Skeleton } from '@/components/ui'

export default function CartLoading() {
    return (
        <div className="relative min-h-screen w-full pb-20">
            {/* Breadcrumb Skeleton */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6">
                    <Skeleton className="h-4 w-48 rounded-md" />
                </div>
            </div>

            {/* Main Cart Content */}
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-44 rounded-xl" />
                    <Skeleton className="h-8 w-28 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Cart Items */}
                    <div className="lg:col-span-8 space-y-4">
                        <Skeleton className="h-12 w-full rounded-2xl" />
                        <div className="rounded-2xl border border-border/80 bg-card/85 p-5 space-y-4">
                            <Skeleton className="h-6 w-36 rounded-md" />
                            <div className="space-y-4 pt-2">
                                <div className="flex gap-4 items-center">
                                    <Skeleton className="size-20 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4 rounded-md" />
                                        <Skeleton className="h-3 w-1/3 rounded-md" />
                                        <Skeleton className="h-4 w-24 rounded-md" />
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <Skeleton className="size-20 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3 rounded-md" />
                                        <Skeleton className="h-3 w-1/4 rounded-md" />
                                        <Skeleton className="h-4 w-24 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="rounded-3xl border border-border/80 bg-card/85 p-6 space-y-4">
                            <Skeleton className="h-6 w-32 rounded-lg" />
                            <div className="space-y-3 pt-2">
                                <Skeleton className="h-4 w-full rounded-md" />
                                <Skeleton className="h-4 w-full rounded-md" />
                                <Skeleton className="h-4 w-full rounded-md" />
                                <Skeleton className="h-10 w-full rounded-2xl pt-2" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
