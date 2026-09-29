'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
    type ColumnState,
    type FilterChangedEvent,
    type GetRowIdFunc,
    type GridApi,
    type GridReadyEvent,
    type SortChangedEvent,
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
    AG_GRID_SERVER_SORT_ORDER,
    AG_GRID_TABLE_DEFAULT_HEIGHT,
    SEARCH_DEBOUNCE_MS,
} from '@/constants'
import { useDebouncedValue } from '@/hooks'

import { ErrorState } from '../error-state'
import { FloatInput, ON_CARD_LABEL_CLASS } from '../float-input'
import {
    columnFilterSpecOf,
    filterModelFromParams,
    filterParamsFromModel,
    filterParamsSignature,
} from './ag-grid-filter'
import { AgGridPagination } from './ag-grid-pagination'
import { loadGridLocaleText } from './ag-grid-locale'
import { columnSortValuesOf, sortDirectionOf } from './ag-grid-sort'
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

// Trang không truyền `filterParams` (chế độ lọc tại chỗ) thì dùng chung object này — giữ nguyên tham chiếu giữa các
// lần render thay vì tạo `{}` mới, vì `applyFilterFromUrl` phụ thuộc vào chính nó.
const NO_FILTER_PARAMS: Record<string, string | undefined> = {}

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
    // Ô tìm kiếm do TRANG điều khiển (tìm phía server theo URL) khi truyền kèm `onSearchChange`: lưới không lọc nhanh
    // tại chỗ nữa, mỗi lần gõ chỉ báo lên trên. Không truyền thì giữ hành vi cũ — lọc nhanh trong trang hiện tại.
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Bộ lọc phía server của trang (chọn vai trò, chọn trạng thái…) đặt ngay cạnh ô tìm kiếm, cùng hàng với các nút
    // công cụ. Trang tự dựng field và tự ghi URL; bảng chỉ lo chỗ đứng nên không phải biết trang lọc những gì.
    toolbarFilters?: ReactNode
    // Sắp xếp do TRANG quyết định khi truyền kèm `onSortChange`: `sortValue` là giá trị `sort` hiện tại (trang đọc từ
    // URL), mỗi cú bấm tiêu đề chỉ báo lên trên để trang ghi URL rồi server trả về thứ tự của **toàn bộ** dữ liệu.
    //
    // Cột sắp xếp được phải khai **cả hai**: `context: { [AG_GRID_SORT_KEY]: { asc, desc } }` để biết bấm vào thì ghi
    // giá trị `sort` nào, và `sortable: true` để AG Grid vẽ được nút bấm. Ở chế độ này `sortable` là **opt-in**
    // (mặc định tắt) — thiếu một trong hai là cột không bấm được, và đó là chủ ý: cột không khai `sortValues` thì
    // không có cách nào sắp xếp cho đúng, nên thà không cho bấm còn hơn để lưới tự xáo 20 dòng đang hiện.
    //
    // Không truyền `onSortChange` thì giữ hành vi cũ: lưới tự sắp xếp — chỉ đúng khi lưới đang giữ đủ dữ liệu. Với
    // bảng phân trang phía server, lưới chỉ có một trang nên tự sắp xếp là **sai** (chỉ xáo 20 dòng đang hiện).
    sortValue?: string
    onSortChange?: (sort: string) => void
    // Giá trị `sort` quay về khi bấm "Đặt lại" — bảng không tự biết mặc định của trang nên trang phải nói.
    defaultSortValue?: string
    // Bộ lọc theo cột do TRANG quyết định khi truyền kèm `onFilterChange`: `filterParams` là các tham số lọc hiện tại
    // (trang đọc từ URL), mỗi lần người dùng áp menu lọc ở tiêu đề thì bảng chỉ báo lên trên để trang ghi URL rồi
    // server lọc **toàn bộ** dữ liệu.
    //
    // Cột lọc được phải khai `context: { [AG_GRID_FILTER_KEY]: … }` để bảng biết dịch sang tham số URL nào. Ở chế độ
    // này `filter` là **opt-in** (mặc định tắt): cột không khai gì thì không có menu lọc, chứ không phải lọc tại chỗ —
    // lưới chỉ giữ một trang nên lọc tại chỗ chỉ lọc 20 dòng đang hiện, đúng cái bug mà chế độ này sinh ra để chặn.
    //
    // Ngoại lệ có chủ ý: cột KHÔNG khai `AG_GRID_FILTER_KEY` vẫn được tự khai `filter` để có menu lọc tại chỗ (những
    // cột chưa có tham số URL nào nhận — xem `users.columns.tsx`). Bảng giữ nguyên bộ lọc của những cột đó khi đồng bộ
    // mô hình từ URL, vì URL chỉ sở hữu những cột đã khai tham số.
    //
    // Không truyền `onFilterChange` thì giữ hành vi cũ: lưới lọc tại chỗ — chỉ đúng khi lưới đang giữ đủ dữ liệu.
    //
    // Truyền một object ỔN ĐỊNH (bọc `useMemo` ở trang): Effect đồng bộ so tham số theo giá trị nhưng lại phụ thuộc
    // vào chính object này, nên object mới mỗi lần render sẽ đẩy mô hình lọc lên lưới ở mọi lần render.
    filterParams?: Record<string, string | undefined>
    onFilterChange?: (params: Record<string, string>) => void
    // "Đặt lại" ở chế độ phía server phải xoá cả từ khoá, sắp xếp lẫn bộ lọc cột trong **một** lần điều hướng — mà
    // bảng không biết URL của trang. Trang truyền vào hàm làm việc đó và cho biết nó có thật sự điều hướng không:
    // có thì Effect đồng bộ sẽ kéo lưới theo URL mới, không (URL vốn đã ở mặc định) thì bảng tự kéo lưới về đúng
    // trạng thái URL đang nói. Hai lần gọi `apply()` trong cùng một nhịp sẽ ghi đè nhau vì cùng đọc một ảnh chụp
    // `searchParams`, nên không thể tách thành hai callback riêng.
    onReset?: () => boolean
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
// Bộ lọc phía server của trang (nếu có) truyền qua `toolbarFilters` để nằm cùng hàng với ô tìm kiếm, không dựng thêm
// một hàng riêng phía trên lưới.
//
// Sắp xếp cũng có hai chế độ như tìm kiếm. Bảng dữ liệu đầy đủ ở client thì để lưới tự sắp xếp (không truyền
// `onSortChange`). Bảng phân trang phía server thì lưới chỉ giữ **một trang**, nên tự sắp xếp chỉ xáo 20 dòng đang
// hiện — trang phải truyền `sortValue` + `onSortChange` để thứ tự đi qua URL rồi server trả về thứ tự của toàn bộ
// dữ liệu; cột nào muốn bấm được thì khai `context: { [AG_GRID_SORT_KEY]: { asc, desc } }`.
// Bộ lọc theo cột cũng vậy, và cũng là chỗ dễ nói dối nhất: menu lọc ở tiêu đề mặc định lọc **tại chỗ**, nên trên
// bảng phân trang phía server nó chỉ lọc 20 dòng đang hiện trong khi người dùng tưởng đã lọc cả bảng. Trang truyền
// `filterParams` + `onFilterChange` để giá trị lọc đi qua URL; cột nào muốn có menu lọc thì khai
// `context: { [AG_GRID_FILTER_KEY]: … }`. Cột không khai mặc định không có menu lọc; cột nào cố ý vẫn muốn menu lọc
// tại chỗ thì tự khai `filter` — bảng giữ nguyên bộ lọc của chúng khi đồng bộ mô hình từ URL.
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
    searchValue,
    onSearchChange,
    toolbarFilters,
    sortValue,
    onSortChange,
    defaultSortValue,
    filterParams,
    onFilterChange,
    onReset,
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

    // Cờ "đang tự đổi trạng thái sắp xếp". AG Grid phát `sortChanged` cho CẢ những lần ta tự áp trạng thái
    // (`applyColumnState` và `resetColumnState` đều bắn sự kiện), nên không chặn thì mỗi lần mount lưới sẽ báo ngược
    // lên trang một lần nữa — mà `setSort` xoá `page`, tức vừa mở `/users?page=3` đã bị đá về trang 1.
    //
    // `sortChanged` phát ĐỒNG BỘ (`dispatchSortChangedEvents` gọi thẳng `eventSvc.dispatchEvent`, không qua
    // `setTimeout`) nên bật/tắt cờ trong `try/finally` là đủ. Vẫn giữ thêm lớp chặn "chỉ báo khi giá trị ĐỔI" ở
    // `handleSortChanged` để nếu AG Grid đổi sang phát bất đồng bộ thì hỏng chỉ ở mức thừa một lần điều hướng,
    // không thành vòng lặp.
    const isApplyingSortRef = useRef(false)

    // Cờ cùng loại cho bộ lọc: `setFilterModel` cũng phát `filterChanged` cho chính những lần ta tự áp mô hình từ
    // URL, nên không chặn thì mỗi lần mount lưới lại báo ngược lên trang một lần nữa.
    const isApplyingFilterRef = useRef(false)

    // ===== Hooks =====
    const t = useTranslations('agGridTable')
    const locale = useLocale()
    // Suspend tới khi bản dịch lưới tải xong — nằm trong ranh giới `loading` của `next/dynamic`.
    const localeText = use(loadGridLocaleText(locale))
    const debouncedQuickFilter = useDebouncedValue(quickFilterText, SEARCH_DEBOUNCE_MS)

    // ===== Derived =====
    const isServerSearch = onSearchChange !== undefined
    const isServerSort = onSortChange !== undefined
    const isServerFilter = onFilterChange !== undefined
    const searchText = searchValue ?? quickFilterText
    const hasSelection = selectedCount > 0
    const fileName = `${exportFileName ?? t('defaultExportFileName')}.csv`
    // Giữ nguyên tham chiếu khi trang không truyền gì: `applyFilterFromUrl` phụ thuộc vào giá trị này, mà một object
    // mới mỗi lần render sẽ đẩy mô hình lọc lên lưới ở mọi lần render.
    const serverFilterParams = useMemo(() => filterParams ?? NO_FILTER_PARAMS, [filterParams])

    // `defaultColDef` phải tính theo chế độ chứ không dùng thẳng hằng số: ở chế độ phía server, `sortable` và `filter`
    // chuyển thành **opt-in** để cột quên khai (`sortValues` / `AG_GRID_FILTER_KEY`) không tự sắp xếp hay tự lọc 20
    // dòng đang hiện — lưới chỉ giữ một trang nên cả hai đều là lời nói dối.
    //
    // Hai chế độ bật/tắt độc lập: bảng chỉ dùng sắp xếp phía server vẫn lọc tại chỗ được nếu nó đang giữ đủ dữ liệu.
    //
    // `sortingOrder` đặt ở ĐÂY, không phải prop cấp lưới: từ v33 AG Grid deprecate `sortingOrder` cấp lưới (cảnh báo
    // #306), và `getSortingOrderInputs` đọc `column.colDef.sortingOrder` TRƯỚC grid option — nên `defaultColDef` vừa
    // là chỗ được hỗ trợ, vừa là chỗ có độ ưu tiên cao hơn. Bỏ mốc `null` khỏi vòng xoay: backend không diễn tả được
    // "bỏ sắp xếp" (`sort` luôn có mặc định), nên lần bấm thứ ba chỉ đảo chiều thay vì xoá.
    const resolvedDefaultColDef = useMemo<ColDef<TData>>(
        () => ({
            ...DEFAULT_COL_DEF,
            ...(isServerSort ? { sortable: false, sortingOrder: [...AG_GRID_SERVER_SORT_ORDER] } : {}),
            ...(isServerFilter ? { filter: false } : {}),
        }),
        [isServerFilter, isServerSort],
    )

    // Đẩy thứ tự sắp xếp của URL lên mũi tên tiêu đề. Dùng chung cho Effect đồng bộ và nút "Đặt lại": sau khi
    // `resetColumnState()` lưới về trạng thái không sắp xếp, phải kéo mũi tên về đúng cột mà URL đang nói.
    const applySortFromUrl = useCallback(() => {
        if (!gridApi || gridApi.isDestroyed()) return

        const state: ColumnState[] = []
        for (const column of gridApi.getColumns() ?? []) {
            const values = columnSortValuesOf(column.getColDef())
            if (!values) continue
            if (values.asc === sortValue) state.push({ colId: column.getColId(), sort: 'asc' })
            else if (values.desc === sortValue) state.push({ colId: column.getColId(), sort: 'desc' })
        }

        isApplyingSortRef.current = true
        try {
            // `defaultState` xoá sắp xếp của mọi cột khác — chỉ một cột được sắp xếp tại một thời điểm.
            gridApi.applyColumnState({ state, defaultState: { sort: null } })
        } finally {
            isApplyingSortRef.current = false
        }
    }, [gridApi, sortValue])

    // Đẩy bộ lọc của URL lên menu lọc ở tiêu đề. Cùng vai trò với `applySortFromUrl`: dùng cho Effect đồng bộ và cho
    // nút "Đặt lại" khi URL vốn đã không lọc gì.
    const applyFilterFromUrl = useCallback(() => {
        if (!gridApi || gridApi.isDestroyed()) return

        const columns = gridApi.getColumns() ?? []
        const model = filterModelFromParams(serverFilterParams, columns)

        // `setFilterModel` THAY CẢ mô hình chứ không sửa từng cột, nên bộ lọc của những cột do AG Grid tự quản (cột
        // không khai `AG_GRID_FILTER_KEY`) sẽ bị xoá sạch mỗi khi tham số lọc trên URL đổi — người dùng đặt bộ lọc
        // vai trò rồi gõ tiếp vào ô lọc tên sẽ thấy bộ lọc vai trò tự biến mất. Giữ lại phần của chúng: URL chỉ sở
        // hữu những cột đã khai tham số, phần còn lại là của lưới.
        const existing = gridApi.getFilterModel()
        for (const column of columns) {
            const colId = column.getColId()
            if (columnFilterSpecOf(column.getColDef())) continue

            const kept: unknown = existing[colId]
            if (kept !== undefined) model[colId] = kept
        }

        isApplyingFilterRef.current = true
        try {
            gridApi.setFilterModel(model)
        } finally {
            isApplyingFilterRef.current = false
        }
    }, [gridApi, serverFilterParams])

    // ===== Handlers =====
    const handleSearchChange = (value: string) => {
        // Chế độ trang điều khiển: đẩy thẳng lên trên (trang tự debounce trước khi ghi URL).
        if (isServerSearch) onSearchChange(value)
        else setQuickFilterText(value)
    }

    // Tiêu đề cột chỉ là **công tắc**: thứ tự thật do server trả về, nên ở đây chỉ dịch cột vừa bấm thành giá trị
    // `sort` của trang. Lưới vẫn sắp xếp 20 dòng đang có, nhưng `comparator` của mỗi cột được viết khớp với
    // `ORDER BY` phía server nên kết quả trùng nhau — bấm xong thấy đúng thứ tự, không nháy sang thứ tự sai.
    const handleSortChanged = (event: SortChangedEvent<TData>) => {
        // Trạng thái do chính mình vừa áp từ URL thì không phải là ý người dùng — bỏ qua, nếu không sẽ ghi URL lại
        // một lần nữa cho mỗi lần mount (và `setSort` xoá `page`, làm mất trang đang xem).
        if (!onSortChange || isApplyingSortRef.current) return

        const sorted = event.api.getColumnState().find((state) => sortDirectionOf(state) !== null)
        const direction = sorted ? sortDirectionOf(sorted) : null
        // `getColumnState` chỉ trả trạng thái, không trả `colDef` — phải hỏi lại cột theo `colId` mới đọc được
        // `context` (nơi cột khai giá trị `sort` của hai chiều).
        const column = sorted ? event.api.getColumn(sorted.colId) : null
        const values = column ? columnSortValuesOf(column.getColDef()) : null
        const next = direction && values ? values[direction] : undefined

        // Không xác định được đích (cột không khai `sortValues`) thì về mặc định của trang, để URL và mũi tên trên
        // tiêu đề không lệch nhau.
        const target = next ?? defaultSortValue ?? sortValue ?? ''

        // Chỉ báo lên trên khi thứ tự THẬT SỰ đổi: ghi URL là điều hướng thật (thêm một mục vào lịch sử, xoá `page`),
        // không phải việc làm miễn phí.
        if (target !== sortValue) onSortChange(target)
    }

    // Menu lọc ở tiêu đề cũng chỉ là **công tắc**: giá trị người dùng vừa chọn được dịch sang tham số URL để server
    // lọc toàn bộ dữ liệu, rồi trang trả về trang đầu tiên của kết quả mới.
    const handleFilterChanged = (event: FilterChangedEvent<TData>) => {
        // Mô hình do chính mình vừa áp từ URL thì không phải là ý người dùng — bỏ qua, nếu không mỗi lần mount lưới
        // sẽ ghi URL thêm một lần (và `setFilters` xoá `page`, làm mất trang đang xem).
        if (!onFilterChange || isApplyingFilterRef.current) return

        const next = filterParamsFromModel(event.api.getFilterModel(), event.api.getColumns() ?? [])

        // Chỉ báo lên trên khi bộ lọc THẬT SỰ đổi — ghi URL là một lần điều hướng thật.
        if (filterParamsSignature(next) === filterParamsSignature(serverFilterParams)) return
        onFilterChange(next)
    }

    const handleReset = () => {
        if (!gridApi) return
        handleSearchChange('')
        isApplyingSortRef.current = true
        isApplyingFilterRef.current = true
        try {
            // `resetColumnState()` chỉ dựng lại trạng thái CỘT (bề rộng, thứ tự, sắp xếp…) — mô hình lọc không nằm
            // trong đó nên phải xoá riêng.
            gridApi.setFilterModel(null)
            gridApi.resetColumnState()
        } finally {
            isApplyingSortRef.current = false
            isApplyingFilterRef.current = false
        }

        // Từ khoá, sắp xếp và bộ lọc cột đều là trạng thái của TRANG (nằm trong URL), nên "đặt lại" phải trả cả ba về
        // mặc định trong MỘT lần điều hướng — hai lần gọi `apply()` trong cùng một nhịp sẽ ghi đè nhau vì cùng đọc
        // một ảnh chụp `searchParams`. Việc đó cần biết URL, mà bảng thì không, nên trang làm qua `onReset`.
        //  - Trang có điều hướng → Effect đồng bộ kéo lưới theo URL mới.
        //  - URL vốn đã ở mặc định → không có gì để điều hướng, kéo lưới về đúng trạng thái URL đang nói tại chỗ;
        //    không làm thì lưới vừa bị `resetColumnState()` xoá sạch sẽ mất cả mũi tên sắp xếp lẫn bộ lọc mà URL
        //    vẫn khai là đang có.
        if (onReset) {
            if (!onReset()) {
                applySortFromUrl()
                applyFilterFromUrl()
            }
        } else {
            const target = defaultSortValue ?? sortValue ?? ''
            if (target !== sortValue) onSortChange?.(target)
            else applySortFromUrl()
        }

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

    // ===== Effects =====
    // Mũi tên trên tiêu đề bám theo `sortValue` (trang đọc từ URL) chứ không theo trạng thái nội bộ của lưới: bấm
    // Back hay dán link đều phải ra đúng cột đang sắp xếp, mà đó là những đường đi lưới không hề hay biết.
    useEffect(() => {
        if (!isServerSort) return
        applySortFromUrl()
    }, [applySortFromUrl, isServerSort])

    // Menu lọc cũng bám theo URL chứ không theo trạng thái nội bộ của lưới, cùng lý do: bấm Back hay dán link đều
    // phải ra đúng bộ lọc đang áp.
    useEffect(() => {
        if (!isServerFilter) return
        applyFilterFromUrl()
    }, [applyFilterFromUrl, isServerFilter])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                        <FloatInput
                            label={searchLabel ?? t('search')}
                            icon={<SearchIcon className="size-4" />}
                            size="sm"
                            type="search"
                            value={searchText}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                    </div>
                    {toolbarFilters && (
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
                            {toolbarFilters}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hasSelection && (
                        <span className="me-1 text-sm text-muted-foreground" aria-live="polite">
                            {t('selectedCount', { count: selectedCount })}
                        </span>
                    )}
                    {onRefresh && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={onRefresh}
                            disabled={loading}
                        >
                            <RefreshCwIcon
                                data-icon="inline-start"
                                className={`text-primary${loading ? ' animate-spin motion-reduce:animate-none' : ''}`}
                            />
                            {t('refresh')}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500/40 text-orange-700 hover:bg-orange-500/10 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                        onClick={handleReset}
                        disabled={!gridApi}
                    >
                        <RotateCcwIcon data-icon="inline-start" className="text-orange-600 dark:text-orange-400" />
                        {t('reset')}
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" disabled={!gridApi}>
                                <Columns3Icon data-icon="inline-start" className="text-blue-600 dark:text-blue-400" />
                                {t('columns')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                            {gridApi && <ColumnManagement api={gridApi} />}
                        </PopoverContent>
                    </Popover>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-green-600/40 text-green-700 hover:bg-green-600/10 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        onClick={handleExport}
                        disabled={!gridApi || Boolean(error)}
                    >
                        <FileDownIcon data-icon="inline-start" className="text-green-600 dark:text-green-400" />
                        {hasSelection ? t('exportSelected') : t('exportCsv')}
                    </Button>
                    {onAdd && (
                        <Button size="sm" className="text-white" onClick={onAdd}>
                            <PlusIcon data-icon="inline-start" className="text-primary-foreground/85" />
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
                        defaultColDef={resolvedDefaultColDef}
                        getRowId={getRowId}
                        loading={loading}
                        quickFilterText={isServerSearch ? undefined : debouncedQuickFilter}
                        pagination={pagination}
                        paginationPageSize={pageSize}
                        // Ẩn panel mặc định, dùng thanh ô số `AgGridPagination` bên dưới.
                        suppressPaginationPanel
                        rowSelection={{ mode: 'multiRow', selectAll: 'filtered' }}
                        selectionColumnDef={{ pinned: 'left' }}
                        animateRows
                        {...gridProps}
                        // Đặt sau `gridProps` để trang không vô tình ghi đè cơ chế sắp xếp/lọc phía server. Không còn
                        // `sortingOrder` ở đây — nó nằm trong `resolvedDefaultColDef` (deprecate từ v33, cảnh báo
                        // #306).
                        onSortChanged={isServerSort ? handleSortChanged : undefined}
                        onFilterChanged={isServerFilter ? handleFilterChanged : undefined}
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
