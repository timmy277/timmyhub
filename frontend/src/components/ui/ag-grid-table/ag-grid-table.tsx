'use client'

import { useState } from 'react'
import { AG_GRID_LOCALE_EN, AG_GRID_LOCALE_VN } from '@ag-grid-community/locale'
import {
    AllCommunityModule,
    ModuleRegistry,
    type ColDef,
    type ColGroupDef,
    type GetRowIdFunc,
    type GridApi,
    type GridReadyEvent,
} from 'ag-grid-community'
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react'
import {
    Columns3Icon,
    FileDownIcon,
    PlusIcon,
    RefreshCwIcon,
    RotateCcwIcon,
    SearchIcon,
    TriangleAlertIcon,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '../button'
import { FloatInput } from '../float-input'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import type { Locale } from '@/types'

import { ColumnManagement } from './column-management'
import { agGridTheme } from './ag-grid-theme'
import { AG_GRID_TABLE_DEFAULT_HEIGHT, AG_GRID_NO_EXPORT } from './ag-grid-table-constants'

// File này chỉ được nạp qua `next/dynamic` (ag-grid-table-lazy.tsx) nên gói AG Grid không lọt vào bundle chung — luật
// cứng #12. Đăng ký cả gói Community để trang dùng AgGridTable bật thêm tính năng qua `gridProps` mà không thiếu module.
ModuleRegistry.registerModules([AllCommunityModule])

const GRID_LOCALE_TEXT: Record<Locale, Record<string, string>> = { vi: AG_GRID_LOCALE_VN, en: AG_GRID_LOCALE_EN }
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const EXCLUDE_KEY: keyof typeof AG_GRID_NO_EXPORT = 'excludeFromExport'

const DEFAULT_COL_DEF: ColDef = {
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    // Căn giữa nội dung mọi ô theo cả hai chiều. Dùng inline style vì CSS của AG Grid không nằm trong layer nên
    // utility Tailwind (trong `@layer utilities`) không đè được; cột nào cần căn khác thì tự đặt `cellStyle`.
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
}

export interface AgGridTableProps<TData> {
    rowData: TData[] | null | undefined
    columnDefs: (ColDef<TData> | ColGroupDef<TData>)[]
    getRowId?: GetRowIdFunc<TData>
    loading?: boolean
    // Có `error` thì thay lưới bằng khối báo lỗi kèm nút thử lại (`onRefresh`).
    error?: string
    onRefresh?: () => void
    onAdd?: () => void
    addLabel?: string
    searchLabel?: string
    exportFileName?: string
    pagination?: boolean
    pageSize?: number
    height?: number | string
    onGridReady?: (event: GridReadyEvent<TData>) => void
    // Cửa thoát cho tuỳ chọn AG Grid ít dùng (rowHeight, sửa ô, kéo thả hàng, hàng ghim…).
    gridProps?: Omit<AgGridReactProps<TData>, 'rowData' | 'columnDefs' | 'onGridReady' | 'onSelectionChanged'>
}

// Bảng quản trị dùng chung theo mẫu ManagementPage + BaseDataTable của TimmyHub gốc: thanh công cụ (tìm nhanh, làm
// mới, reset, quản lý cột, xuất CSV, thêm mới) phía trên lưới AG Grid Community đã map theo token của design system.
// Trang chỉ cần truyền dữ liệu và cột; nút nào có callback (`onRefresh`, `onAdd`) mới hiện:
//     <AgGridTable<User> rowData={users} columnDefs={columns} getRowId={(p) => p.data.id} onRefresh={refetch} />
// Cột không muốn xuất CSV (avatar, thao tác) gắn `context: AG_GRID_NO_EXPORT`.
export function AgGridTable<TData>({
    rowData,
    columnDefs,
    getRowId,
    loading = false,
    error,
    onRefresh,
    onAdd,
    addLabel,
    searchLabel,
    exportFileName = 'export',
    pagination = true,
    pageSize = 10,
    height = AG_GRID_TABLE_DEFAULT_HEIGHT,
    onGridReady,
    gridProps,
}: AgGridTableProps<TData>) {
    const t = useTranslations('agGridTable')
    const locale = useLocale() as Locale
    const [gridApi, setGridApi] = useState<GridApi<TData> | null>(null)
    const [quickFilterText, setQuickFilterText] = useState('')
    const [selectedCount, setSelectedCount] = useState(0)

    const handleRefresh = () => {
        onRefresh?.()
        toast.success(t('refreshed'))
    }

    const handleReset = () => {
        if (!gridApi) return
        setQuickFilterText('')
        gridApi.setFilterModel(null)
        gridApi.resetColumnState()
        toast.success(t('resetDone'))
    }

    const handleExport = () => {
        if (!gridApi) return
        const columnKeys = gridApi
            .getAllDisplayedColumns()
            .filter((column) => !column.getColDef().context?.[EXCLUDE_KEY])
        // Đang chọn hàng thì chỉ xuất các hàng đã chọn, không thì xuất toàn bộ hàng sau khi lọc.
        gridApi.exportDataAsCsv({ fileName: `${exportFileName}.csv`, columnKeys, onlySelected: selectedCount > 0 })
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="w-full lg:max-w-xs">
                    <FloatInput
                        label={searchLabel ?? t('search')}
                        icon={<SearchIcon className="size-4" />}
                        size="sm"
                        type="search"
                        value={quickFilterText}
                        onChange={(event) => setQuickFilterText(event.target.value)}
                        labelClassName="bg-card peer-focus:bg-card peer-autofill:bg-card"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {selectedCount > 0 && (
                        <span className="me-1 text-sm text-muted-foreground" aria-live="polite">
                            {t('selectedCount', { count: selectedCount })}
                        </span>
                    )}
                    {onRefresh && (
                        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                            <RefreshCwIcon data-icon="inline-start" className={loading ? 'animate-spin' : undefined} />
                            {t('refresh')}
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleReset} disabled={!gridApi}>
                        <RotateCcwIcon data-icon="inline-start" />
                        {t('reset')}
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" disabled={!gridApi}>
                                <Columns3Icon data-icon="inline-start" />
                                {t('columns')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            {gridApi && <ColumnManagement api={gridApi} />}
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={handleExport} disabled={!gridApi || Boolean(error)}>
                        <FileDownIcon data-icon="inline-start" />
                        {selectedCount > 0 ? t('exportSelected') : t('exportCsv')}
                    </Button>
                    {onAdd && (
                        <Button onClick={onAdd}>
                            <PlusIcon data-icon="inline-start" />
                            {addLabel ?? t('add')}
                        </Button>
                    )}
                </div>
            </div>

            {error ? (
                <div
                    role="alert"
                    style={{ height }}
                    className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center"
                >
                    <TriangleAlertIcon className="size-8 text-destructive" aria-hidden />
                    <div>
                        <p className="font-medium">{t('errorTitle')}</p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    {onRefresh && (
                        <Button variant="outline" onClick={onRefresh}>
                            <RefreshCwIcon data-icon="inline-start" />
                            {t('retry')}
                        </Button>
                    )}
                </div>
            ) : (
                <div
                    style={{ height }}
                    // Tiêu đề cột căn giữa cho khớp với ô; `!` để thắng CSS không-layer của AG Grid.
                    className="w-full [&_.ag-header-cell-label]:justify-center! [&_.ag-header-group-cell-label]:justify-center!"
                >
                    <AgGridReact<TData>
                        // AG Grid chỉ đọc `localeText` lúc khởi tạo — đổi ngôn ngữ thì dựng lại lưới.
                        key={locale}
                        theme={agGridTheme}
                        localeText={GRID_LOCALE_TEXT[locale]}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={DEFAULT_COL_DEF}
                        getRowId={getRowId}
                        loading={loading}
                        quickFilterText={quickFilterText}
                        pagination={pagination}
                        paginationPageSize={pageSize}
                        paginationPageSizeSelector={PAGE_SIZE_OPTIONS}
                        rowSelection={{ mode: 'multiRow', selectAll: 'filtered' }}
                        selectionColumnDef={{ pinned: 'left' }}
                        animateRows
                        {...gridProps}
                        onGridReady={(event) => {
                            setGridApi(event.api)
                            onGridReady?.(event)
                        }}
                        onSelectionChanged={(event) => setSelectedCount(event.api.getSelectedRows().length)}
                    />
                </div>
            )}
        </div>
    )
}
