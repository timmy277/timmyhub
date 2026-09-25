import { Skeleton } from '@/components/ui'
import {
    AG_GRID_SKELETON_PAGE_ITEMS,
    AG_GRID_SKELETON_TOOLBAR_WIDTHS_PX,
    AG_GRID_TABLE_DEFAULT_HEIGHT,
} from '@/constants'
import { cn } from '@/utils'

// Khung chờ đúng kích thước AgGridTable trong lúc gói AG Grid đang được nạp động — không nhảy layout khi lưới hiện ra.
// Màn hẹp chỉ hiện số ô trang của chế độ rút gọn (ẩn bằng CSS, không cần JS) để khớp AgGridPagination.
export function AgGridTableSkeleton({ height = AG_GRID_TABLE_DEFAULT_HEIGHT }: { height?: number | string }) {
    return (
        <div className="flex flex-col gap-4" aria-busy="true">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-10 w-full lg:max-w-xs" />
                <div className="flex flex-wrap gap-2">
                    {AG_GRID_SKELETON_TOOLBAR_WIDTHS_PX.map((width) => (
                        <Skeleton key={width} className="h-8" style={{ width }} />
                    ))}
                </div>
            </div>
            <Skeleton className="w-full rounded-lg" style={{ height }} />
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <Skeleton className="h-7 w-40" />
                <div className="flex gap-1.5">
                    {Array.from({ length: AG_GRID_SKELETON_PAGE_ITEMS.FULL }, (_, index) => (
                        <Skeleton
                            key={index}
                            className={cn('size-8', index >= AG_GRID_SKELETON_PAGE_ITEMS.COMPACT && 'hidden md:block')}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
