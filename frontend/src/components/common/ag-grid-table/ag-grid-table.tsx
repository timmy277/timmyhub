'use client'

import { use, useState } from 'react'
import {
    CellStyleModule,
    ClientSideRowModelModule,
    ColumnApiModule,
    CsvExportModule,
    DateFilterModule,
    EventApiModule,
    LocaleModule,
    ModuleRegistry,
    NumberFilterModule,
    PaginationModule,
    QuickFilterModule,
    RowSelectionModule,
    TextFilterModule,
    ValidationModule,
    type ColDef,
    type ColGroupDef,
    type GetRowIdFunc,
    type GridApi,
    type GridReadyEvent,
} from 'ag-grid-community'
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react'
import { Columns3Icon, FileDownIcon, PlusIcon, RefreshCwIcon, RotateCcwIcon, SearchIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { DEFAULT_COL_DEF } from '@/config'
import {
    AG_GRID_DEFAULT_PAGE_SIZE,
    AG_GRID_NO_EXPORT_KEY,
    AG_GRID_PAGE_SIZE_OPTIONS,
    AG_GRID_TABLE_DEFAULT_HEIGHT,
    SEARCH_DEBOUNCE_MS,
} from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { ErrorState } from '../error-state'
import { FloatInput } from '../float-input'
import { AgGridPagination } from './ag-grid-pagination'
import { loadGridLocaleText } from './ag-grid-locale'
import { agGridTheme } from './ag-grid-theme'
import { ColumnManagement } from './column-management'

// File này chỉ được nạp qua `next/dynamic` (ag-grid-table-lazy.tsx) nên gói AG Grid không lọt vào bundle chung — luật
// cứng #12. Chỉ đăng ký module bảng thật sự dùng (PERF-008) thay vì `AllCommunityModule`; trang cần tính năng khác
// (sửa ô, kéo thả hàng…) thì thêm module tương ứng vào đây. `ValidationModule` chỉ nạp ở dev để báo cấu hình sai.
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    PaginationModule,
    QuickFilterModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CsvExportModule,
    RowSelectionModule,
    CellStyleModule,
    ColumnApiModule,
    EventApiModule,
    LocaleModule,
    ...(process.env.NODE_ENV === 'production' ? [] : [ValidationModule]),
])

export interface AgGridTableProps<TData> {
    rowData: TData[] | null | undefined
    columnDefs: (ColDef<TData> | ColGroupDef<TData>)[]
    getRowId?: GetRowIdFunc<TData>
    loading?: boolean
    // Có `error` thì thay lưới bằng khối báo lỗi kèm nút thử lại (`onRefresh`).
    error?: string
    // Trang tự báo toast kết quả làm mới (thường qua `toast.promise`) — bảng không giả định thành công.
    onRefresh?: () => void
    onAdd?: () => void
    addLabel?: string
    searchLabel?: string
    // Tên file CSV không kèm đuôi. Mặc định `agGridTable.defaultExportFileName`.
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
// 7 trạng thái: mặc định · đang tải (skeleton của `next/dynamic` rồi overlay `loading` của lưới) · rỗng (overlay "không
// có dữ liệu" của AG Grid) · lỗi (`error` → ErrorState) · không có quyền (trang không render bảng / không truyền
// `onAdd`) · vô hiệu hoá (nút khoá khi chưa có `gridApi` hoặc đang tải) · thành công (toast sau reset/xuất CSV).
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
    exportFileName,
    pagination = true,
    pageSize = AG_GRID_DEFAULT_PAGE_SIZE,
    height = AG_GRID_TABLE_DEFAULT_HEIGHT,
    onGridReady,
    gridProps,
}: AgGridTableProps<TData>) {
    // ===== State =====
    const [gridApi, setGridApi] = useState<GridApi<TData> | null>(null)
    const [quickFilterText, setQuickFilterText] = useState('')
    const [selectedCount, setSelectedCount] = useState(0)

    // ===== Hooks =====
    const t = useTranslations('agGridTable')
    const locale = useLocale()
    // Suspend tới khi bản dịch lưới tải xong — nằm trong ranh giới `loading` của `next/dynamic`.
    const localeText = use(loadGridLocaleText(locale))
    const debouncedQuickFilter = useDebouncedValue(quickFilterText, SEARCH_DEBOUNCE_MS)

    // ===== Derived =====
    const hasSelection = selectedCount > 0
    const fileName = `${exportFileName ?? t('defaultExportFileName')}.csv`

    // ===== Handlers =====
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
            .filter((column) => !column.getColDef().context?.[AG_GRID_NO_EXPORT_KEY])
        // Đang chọn hàng thì chỉ xuất các hàng đã chọn, không thì xuất toàn bộ hàng sau khi lọc.
        gridApi.exportDataAsCsv({ fileName, columnKeys, onlySelected: hasSelection })
        toast.success(t('exported', { fileName }))
    }

    const handleGridReady = (event: GridReadyEvent<TData>) => {
        setGridApi(event.api)
        onGridReady?.(event)
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
                    {hasSelection && (
                        <span className="me-1 text-sm text-muted-foreground" aria-live="polite">
                            {t('selectedCount', { count: selectedCount })}
                        </span>
                    )}
                    {onRefresh && (
                        <Button variant="outline" onClick={onRefresh} disabled={loading}>
                            <RefreshCwIcon
                                data-icon="inline-start"
                                className={loading ? 'animate-spin motion-reduce:animate-none' : undefined}
                            />
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
                        <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                            {gridApi && <ColumnManagement api={gridApi} />}
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={handleExport} disabled={!gridApi || Boolean(error)}>
                        <FileDownIcon data-icon="inline-start" />
                        {hasSelection ? t('exportSelected') : t('exportCsv')}
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
                <div style={{ height }} className="flex">
                    <ErrorState description={error} onRetry={onRefresh} className="flex-1" />
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
                        localeText={localeText}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        defaultColDef={DEFAULT_COL_DEF}
                        getRowId={getRowId}
                        loading={loading}
                        quickFilterText={debouncedQuickFilter}
                        pagination={pagination}
                        paginationPageSize={pageSize}
                        // Ẩn panel mặc định, dùng thanh ô số `AgGridPagination` bên dưới.
                        suppressPaginationPanel
                        rowSelection={{ mode: 'multiRow', selectAll: 'filtered' }}
                        selectionColumnDef={{ pinned: 'left' }}
                        animateRows
                        {...gridProps}
                        onGridReady={handleGridReady}
                        onSelectionChanged={(event) => setSelectedCount(event.api.getSelectedRows().length)}
                    />
                </div>
            )}

            {pagination && !error && gridApi && !gridApi.isDestroyed() && (
                <AgGridPagination api={gridApi} pageSizeOptions={AG_GRID_PAGE_SIZE_OPTIONS} disabled={loading} />
            )}
        </div>
    )
}
