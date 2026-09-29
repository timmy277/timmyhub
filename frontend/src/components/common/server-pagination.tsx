'use client'

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import Link, { useLinkStatus } from 'next/link'
import { useTranslations } from 'next-intl'

import {
    Button,
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui'
import { MAX_VISIBLE_PAGES, PAGE_SIZE_OPTIONS } from '@/constants'
import { useIsMobile } from '@/hooks'
import { cn, getPageItems, type PageItem } from '@/utils'

// Lớp phủ mờ cho ô vừa bấm, hiện trong lúc Next dựng xong trang mới. Không có phản hồi thì người dùng tưởng nút không
// ăn và bấm lại lần hai. `useLinkStatus` chỉ đọc được trạng thái của `<Link>` bao ngoài nên phải nằm trong một
// component con của `<Link>` — không gọi được ngay chỗ dựng `<Link>`.
function LinkPendingVeil() {
    const { pending } = useLinkStatus()

    return (
        <span
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-0 rounded-md bg-background/70 transition-opacity',
                pending ? 'opacity-100' : 'opacity-0',
            )}
        />
    )
}

interface ServerPaginationProps {
    // Trang hiện tại, đếm từ 1 (API trả về 1-based). `getPageItems` của AG Grid đánh số từ 0 nên chỉ quy đổi lúc gọi.
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
    // Dựng URL cho một trạng thái phân trang khác, giữ nguyên từ khoá và bộ lọc đang có. Component này không cần biết
    // tên tham số của trang gọi.
    buildHref: (patch: { page?: number; pageSize?: number }) => string
    // Ô chọn cỡ trang là `Select` của Radix nên không thể là link; nó báo lên trên để trang điều hướng trong
    // `startTransition` — nhờ vậy trạng thái "đang tải" của lưới vẫn bật trong lúc chờ dữ liệu mới.
    onPageSizeChange: (pageSize: number) => void
    pageSizeOptions?: readonly number[]
    disabled?: boolean
    className?: string
}

// Phân trang cho danh sách **tải từng trang từ server** (khác `AgGridPagination` — phân trang trong dữ liệu đã có ở
// client). Hình dáng bám đúng thanh `AgGridPagination` mà màn người dùng đang dùng trước khi chuyển sang phân trang
// phía server: **bên trái** là ô chọn số dòng mỗi trang kèm khoảng dòng đang xem ("1–20 / 200"), **bên phải** là dãy ô
// số với bốn nút mũi tên **chỉ có icon** — `«` về trang đầu, `‹` lùi một trang, `›` tiến một trang, `»` tới trang
// cuối. Không có chữ "Trước"/"Sau" cạnh mũi tên.
//
// Khác `AgGridPagination` ở chỗ các ô là `<Link>` thật trỏ tới URL của trang đó, nên mở tab mới, sao chép link và xem
// trước địa chỉ đều chạy; Next cũng tự dựng sẵn trang khi rê chuột. Thanh này hiện **kể cả khi chỉ có một trang** —
// vẫn thấy ô "1" và đủ bốn nút mũi tên ở trạng thái mờ, giống panel phân trang mặc định của AG Grid. Giấu cả thanh đi
// khi mới có một trang thì người dùng tưởng danh sách không phân trang, và không biết mình đang ở trang nào.
// Màn hẹp (< `md`, tính cả 360 px) bỏ hai nút nhảy đầu/cuối và thay dãy ô số bằng "1/10" để không tràn ngang.
//
// 7 trạng thái: mặc định · đang tải (`disabled` → khoá cả thanh) · rỗng (không có bản ghi nào → không render) ·
// lỗi (trang gọi đã thay bằng khối báo lỗi) · không có quyền (nơi gọi không render) · vô hiệu hoá (nút mờ khi đang
// tải hoặc khi đã ở trang đầu/cuối) · thành công (đổi URL, dữ liệu mới về).
export function ServerPagination({
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPrev,
    hasNext,
    buildHref,
    onPageSizeChange,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    disabled = false,
    className,
}: ServerPaginationProps) {
    // ===== Hooks =====
    const t = useTranslations('pagination')
    const isMobile = useIsMobile()

    // ===== Derived =====
    const pageItems = getPageItems(page - 1, totalPages, MAX_VISIBLE_PAGES)
    const from = (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, totalItems)
    const canGoPrevious = hasPrev && !disabled
    const canGoNext = hasNext && !disabled

    // ===== Handlers =====
    // Ô không bấm được thì mờ và không nhận chuột; `tabIndex` đặt ở từng link để bàn phím cũng bỏ qua. `relative` giữ
    // lại lúc nào cũng có để lớp phủ của `LinkPendingVeil` neo đúng vào ô.
    const linkClass = (enabled: boolean) => cn('relative', !enabled && 'pointer-events-none opacity-50')

    const renderPageItem = (item: PageItem, index: number) => {
        if (typeof item !== 'number') {
            return (
                <PaginationItem key={`${item}-${index}`}>
                    <PaginationEllipsis />
                </PaginationItem>
            )
        }

        const pageNumber = item + 1
        const isCurrent = pageNumber === page

        return (
            <PaginationItem key={pageNumber}>
                <Button
                    asChild
                    variant={isCurrent ? 'default' : 'outline'}
                    size="icon"
                    className={linkClass(!disabled)}
                >
                    <Link
                        href={buildHref({ page: pageNumber })}
                        aria-label={t('goToPage', { page: pageNumber })}
                        aria-current={isCurrent ? 'page' : undefined}
                        aria-disabled={disabled || undefined}
                        tabIndex={disabled ? -1 : undefined}
                    >
                        {pageNumber}
                        <LinkPendingVeil />
                    </Link>
                </Button>
            </PaginationItem>
        )
    }

    if (totalItems === 0) return null

    return (
        <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => onPageSizeChange(Number(value))}
                    disabled={disabled}
                >
                    <SelectTrigger size="sm" aria-label={t('pageSize')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span aria-live="polite">{t('pageInfo', { from, to, total: totalItems })}</span>
            </div>

            <Pagination aria-label={t('ariaLabel')} className="mx-0 w-auto">
                <PaginationContent className="gap-1.5">
                    {!isMobile && (
                        <PaginationItem>
                            <Button asChild variant="outline" size="icon" className={linkClass(canGoPrevious)}>
                                <Link
                                    href={buildHref({ page: 1 })}
                                    aria-label={t('firstPage')}
                                    aria-disabled={!canGoPrevious || undefined}
                                    tabIndex={canGoPrevious ? undefined : -1}
                                >
                                    <ChevronsLeftIcon />
                                    <LinkPendingVeil />
                                </Link>
                            </Button>
                        </PaginationItem>
                    )}

                    <PaginationItem>
                        <Button asChild variant="outline" size="icon" className={linkClass(canGoPrevious)}>
                            <Link
                                href={buildHref({ page: page - 1 })}
                                aria-label={t('previousPage')}
                                aria-disabled={!canGoPrevious || undefined}
                                tabIndex={canGoPrevious ? undefined : -1}
                            >
                                <ChevronLeftIcon />
                                <LinkPendingVeil />
                            </Link>
                        </Button>
                    </PaginationItem>

                    {isMobile ? (
                        <PaginationItem>
                            <span aria-current="page" className="px-2 text-sm font-medium text-foreground">
                                {t('pageOf', { page, total: totalPages })}
                            </span>
                        </PaginationItem>
                    ) : (
                        pageItems.map(renderPageItem)
                    )}

                    <PaginationItem>
                        <Button asChild variant="outline" size="icon" className={linkClass(canGoNext)}>
                            <Link
                                href={buildHref({ page: page + 1 })}
                                aria-label={t('nextPage')}
                                aria-disabled={!canGoNext || undefined}
                                tabIndex={canGoNext ? undefined : -1}
                            >
                                <ChevronRightIcon />
                                <LinkPendingVeil />
                            </Link>
                        </Button>
                    </PaginationItem>

                    {!isMobile && (
                        <PaginationItem>
                            <Button asChild variant="outline" size="icon" className={linkClass(canGoNext)}>
                                <Link
                                    href={buildHref({ page: totalPages })}
                                    aria-label={t('lastPage')}
                                    aria-disabled={!canGoNext || undefined}
                                    tabIndex={canGoNext ? undefined : -1}
                                >
                                    <ChevronsRightIcon />
                                    <LinkPendingVeil />
                                </Link>
                            </Button>
                        </PaginationItem>
                    )}
                </PaginationContent>
            </Pagination>
        </div>
    )
}
