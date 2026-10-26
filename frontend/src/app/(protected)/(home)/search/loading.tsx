import { Skeleton } from '@/components/ui'

export default function SearchLoading() {
    return (
        <div role="status" aria-busy="true" className="container mx-auto px-4 py-6 sm:py-8 space-y-6">
            {/* SearchBar Skeleton */}
            <div className="mx-auto max-w-2xl">
                <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            {/* Content Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                <div className="lg:col-span-1">
                    <Skeleton className="h-96 w-full rounded-3xl" />
                </div>
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-8 w-64 rounded-xl" />
                        <Skeleton className="h-8 w-32 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2 rounded-3xl border border-border/50 p-3">
                                <Skeleton className="aspect-square w-full rounded-2xl" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
