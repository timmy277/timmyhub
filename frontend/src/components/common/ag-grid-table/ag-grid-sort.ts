import type { ColDef, ColumnState } from 'ag-grid-community'

import type { ColumnSortValues } from '@/constants'
import { AG_GRID_SORT_KEY } from '@/constants'

// Đọc `context` của AG Grid — trường này khai kiểu `any`, nên kiểm tra hình dạng thật thay vì tin vào một phép ép
// kiểu. Trả `null` nghĩa là "cột này không sắp xếp phía server".
export function columnSortValuesOf<TData>(colDef: ColDef<TData> | undefined): ColumnSortValues | null {
    const context: unknown = colDef?.context
    if (typeof context !== 'object' || context === null) return null

    const values: unknown = Reflect.get(context, AG_GRID_SORT_KEY)
    if (typeof values !== 'object' || values === null) return null

    const asc: unknown = Reflect.get(values, 'asc')
    const desc: unknown = Reflect.get(values, 'desc')
    if (typeof asc !== 'string' || typeof desc !== 'string') return null

    return { asc, desc }
}

// AG Grid để `sort` là `SortDirection | null | undefined`; thu về đúng hai chiều mà backend hiểu.
export function sortDirectionOf(state: ColumnState): 'asc' | 'desc' | null {
    if (state.sort === 'asc' || state.sort === 'desc') return state.sort
    return null
}
