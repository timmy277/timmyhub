'use client'

import { useSyncExternalStore } from 'react'
import type { GridApi } from 'ag-grid-community'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '../button'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '../pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

// Số ô trang tối đa trước khi rút gọn bằng dấu "…" — giống Mantine Pagination của TimmyHub gốc (siblings 1,
// boundaries 1): 1 … 4 5 6 … 10.
const MAX_VISIBLE_PAGES = 7

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// Trang đánh số từ 0 như API AG Grid. Luôn giữ trang đầu, trang cuối và hai trang kề trang hiện tại.
function getPageItems(current: number, total: number): PageItem[] {
    if (total <= MAX_VISIBLE_PAGES) return Array.from({ length: total }, (_, index) => index)

    const start = Math.max(1, Math.min(current - 1, total - 5))
    const end = Math.min(total - 2, Math.max(current + 1, 4))
    const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index)

    return [
        0,
        ...(start > 1 ? (['ellipsis-start'] as const) : []),
        ...middle,
        ...(end < total - 2 ? (['ellipsis-end'] as const) : []),
        total - 1,
    ]
}

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

// Thanh phân trang thay cho panel mặc định của AG Grid (`suppressPaginationPanel`): bên trái là khoảng dòng đang xem
// + chọn số dòng mỗi trang, bên phải là các ô số theo mẫu Mantine Pagination của TimmyHub gốc (ô có viền, trang hiện
// tại tô màu primary, chỉ hiện khi có từ 2 trang).
export function AgGridPagination<TData>({ api, pageSizeOptions, disabled = false }: AgGridPaginationProps<TData>) {
    const t = useTranslations('agGridTable')
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
    const [currentPage, totalPages, pageSize, rowCount] = snapshot.split('|').map(Number)
    const from = rowCount === 0 ? 0 : currentPage * pageSize + 1
    const to = Math.min((currentPage + 1) * pageSize, rowCount)

    return (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => api.setGridOption('paginationPageSize', Number(value))}
                    disabled={disabled}
                >
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
            {totalPages > 1 && (
                <Pagination aria-label={t('pagination')} className="mx-0 w-auto">
                    <PaginationContent className="gap-1.5">
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('firstPage')}
                                disabled={disabled || currentPage <= 0}
                                onClick={() => api.paginationGoToFirstPage()}
                            >
                                <ChevronsLeftIcon />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('previousPage')}
                                disabled={disabled || currentPage <= 0}
                                onClick={() => api.paginationGoToPreviousPage()}
                            >
                                <ChevronLeftIcon />
                            </Button>
                        </PaginationItem>
                        {getPageItems(currentPage, totalPages).map((item) =>
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
                        )}
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('nextPage')}
                                disabled={disabled || currentPage >= totalPages - 1}
                                onClick={() => api.paginationGoToNextPage()}
                            >
                                <ChevronRightIcon />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t('lastPage')}
                                disabled={disabled || currentPage >= totalPages - 1}
                                onClick={() => api.paginationGoToLastPage()}
                            >
                                <ChevronsRightIcon />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}
