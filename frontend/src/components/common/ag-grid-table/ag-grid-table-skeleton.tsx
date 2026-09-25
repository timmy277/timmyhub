import { Skeleton } from '../skeleton'

import { AG_GRID_TABLE_DEFAULT_HEIGHT } from './ag-grid-table-constants'

// Khung chờ đúng kích thước AgGridTable trong lúc gói AG Grid đang được nạp động — không nhảy layout khi lưới hiện ra.
export function AgGridTableSkeleton({ height = AG_GRID_TABLE_DEFAULT_HEIGHT }: { height?: number | string }) {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-10 w-full lg:max-w-xs" />
                <div className="flex flex-wrap gap-2">
                    {[88, 76, 72, 96].map((width) => (
                        <Skeleton key={width} className="h-8" style={{ width }} />
                    ))}
                </div>
            </div>
            <Skeleton className="w-full rounded-lg" style={{ height }} />
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <Skeleton className="h-7 w-40" />
                <div className="flex gap-1.5">
                    {Array.from({ length: 11 }, (_, index) => (
                        <Skeleton key={index} className="size-8" />
                    ))}
                </div>
            </div>
        </div>
    )
}
