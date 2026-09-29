'use client'

import { useSyncExternalStore } from 'react'
import type { GridApi } from 'ag-grid-community'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
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
import { AG_GRID_MAX_VISIBLE_PAGES } from '@/constants'
import { useIsMobile } from '@/hooks'
import { getPageItems } from '@/utils'

// `useSyncExternalStore` so sánh snapshot bằng `Object.is` — trả chuỗi nguyên thuỷ để không render lặp vô hạn.
function readSnapshot(api: GridApi): string {
    return [
        api.paginationGetCurrentPage(),
        api.paginationGetTotalPages(),
        api.paginationGetPageSize(),
        api.paginationGetRowCount(),
    ].join('|')
}

interface AgGridPaginationProps<TData> {
    api: GridApi<TData>
    pageSizeOptions: readonly number[]
    disabled?: boolean
}

// Thanh phân trang thay cho panel mặc định của AG Grid (`suppressPaginationPanel`): bên trái là chọn số dòng mỗi
// trang + khoảng dòng đang xem, bên phải là dãy ô số với bốn nút mũi tên **chỉ có icon** (`«` `‹` `›` `»`). Dùng
// chung namespace `pagination` với `ServerPagination` — hai thanh phải luôn khớp hình dáng lẫn câu chữ, tách
// namespace ra là mở đường cho chúng lệch nhau. Hiện **kể cả khi chỉ có một trang**: vẫn thấy ô "1" và bốn nút mũi tên
// mờ, đúng như panel mặc định của AG Grid. Màn hẹp (< md, tính cả 360 px) rút gọn còn trước · "Trang x/y" · sau để
// không tràn ngang.
export function AgGridPagination<TData>({ api, pageSizeOptions, disabled = false }: AgGridPaginationProps<TData>) {
    // ===== Hooks =====
    const t = useTranslations('pagination')
    const isMobile = useIsMobile()
    const snapshot = useSyncExternalStore(
        (onChange) => {
            api.addEventListener('paginationChanged', onChange)
            return () => {
                if (!api.isDestroyed()) api.removeEventListener('paginationChanged', onChange)
            }
        },
        () => readSnapshot(api),
        () => readSnapshot(api),
    )

    // ===== Derived =====
    const [currentPage, totalPages, pageSize, rowCount] = snapshot.split('|').map(Number)
    const from = rowCount === 0 ? 0 : currentPage * pageSize + 1
    const to = Math.min((currentPage + 1) * pageSize, rowCount)
    const isFirstPage = currentPage <= 0
    const isLastPage = currentPage >= totalPages - 1

    // ===== Handlers =====
    const handlePageSizeChange = (value: string) => api.setGridOption('paginationPageSize', Number(value))

    return (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange} disabled={disabled}>
                    <SelectTrigger size="sm" aria-label={t('pageSize')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                        {pageSizeOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span aria-live="polite">{t('pageInfo', { from, to, total: rowCount })}</span>
            </div>
            <Pagination aria-label={t('ariaLabel')} className="mx-0 w-auto">
                <PaginationContent className="gap-1.5">
                    {!isMobile && (
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('firstPage')}
                                disabled={disabled || isFirstPage}
                                onClick={() => api.paginationGoToFirstPage()}
                            >
                                <ChevronsLeftIcon />
                            </Button>
                        </PaginationItem>
                    )}
                    <PaginationItem>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t('previousPage')}
                            disabled={disabled || isFirstPage}
                            onClick={() => api.paginationGoToPreviousPage()}
                        >
                            <ChevronLeftIcon />
                        </Button>
                    </PaginationItem>
                    {isMobile ? (
                        <PaginationItem>
                            <span aria-current="page" className="px-2 text-sm font-medium text-foreground">
                                {t('pageOf', { page: currentPage + 1, total: totalPages })}
                            </span>
                        </PaginationItem>
                    ) : (
                        getPageItems(currentPage, totalPages, AG_GRID_MAX_VISIBLE_PAGES).map((item) =>
                            typeof item === 'number' ? (
                                <PaginationItem key={item}>
                                    <Button
                                        type="button"
                                        variant={item === currentPage ? 'default' : 'outline'}
                                        size="icon"
                                        aria-label={t('goToPage', { page: item + 1 })}
                                        aria-current={item === currentPage ? 'page' : undefined}
                                        disabled={disabled}
                                        onClick={() => api.paginationGoToPage(item)}
                                    >
                                        {item + 1}
                                    </Button>
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={item}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ),
                        )
                    )}
                    <PaginationItem>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t('nextPage')}
                            disabled={disabled || isLastPage}
                            onClick={() => api.paginationGoToNextPage()}
                        >
                            <ChevronRightIcon />
                        </Button>
                    </PaginationItem>
                    {!isMobile && (
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('lastPage')}
                                disabled={disabled || isLastPage}
                                onClick={() => api.paginationGoToLastPage()}
                            >
                                <ChevronsRightIcon />
                            </Button>
                        </PaginationItem>
                    )}
                </PaginationContent>
            </Pagination>
        </div>
    )
}
