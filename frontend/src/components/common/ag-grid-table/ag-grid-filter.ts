import type { ColDef, Column, FilterModel } from 'ag-grid-community'

import type { ColumnFilterSpec } from '@/constants'
import { AG_GRID_FILTER_KEY } from '@/constants'

// Bộ lọc ở tiêu đề cột chạy phía server. Menu lọc vẫn là menu của AG Grid, nhưng giá trị của nó được dịch sang tham
// số URL để server lọc **toàn bộ** dữ liệu — không phải chỉ 20 dòng của trang đang hiện.
//
// Vì sao không gửi thẳng `FilterModel` của AG Grid lên server: URL phải gõ tay được, đọc được và validate được bằng
// chính `UserListQuerySchema` của backend (luật #15). Nhét mô hình của thư viện vào query string thì backend phải
// hiểu định dạng riêng của thư viện, và mọi tham số đều thành `unknown`.

// Cột lọc được theo mô hình của AG Grid: đủ để hỏi `colId` và `colDef`, không cần cả đối tượng `Column`.
type FilterColumn = Pick<Column, 'getColId' | 'getColDef'>

// Đọc `context` của AG Grid — trường này khai kiểu `any`, nên kiểm tra hình dạng thật thay vì tin vào một phép ép
// kiểu. Trả `null` nghĩa là "cột này không lọc phía server".
export function columnFilterSpecOf<TData>(colDef: ColDef<TData> | undefined): ColumnFilterSpec | null {
    const context: unknown = colDef?.context
    if (typeof context !== 'object' || context === null) return null

    const spec: unknown = Reflect.get(context, AG_GRID_FILTER_KEY)
    if (typeof spec !== 'object' || spec === null) return null

    const kind: unknown = Reflect.get(spec, 'kind')
    if (kind === 'text') {
        const param: unknown = Reflect.get(spec, 'param')
        return typeof param === 'string' ? { kind: 'text', param } : null
    }

    if (kind === 'date') {
        const fromParam: unknown = Reflect.get(spec, 'fromParam')
        const toParam: unknown = Reflect.get(spec, 'toParam')
        return typeof fromParam === 'string' && typeof toParam === 'string'
            ? { kind: 'date', fromParam, toParam }
            : null
    }

    return null
}

// `YYYY-MM-DD` giờ ĐỊA PHƯƠNG — đúng định dạng `dateFrom`/`dateTo` mà bộ lọc ngày của AG Grid dùng — sang mốc tuyệt
// đối ISO có `Z` mà `UserListQuerySchema` nhận.
//
// `new Date(y, m - 1, d)` là phép đảo đúng chiều của `_serialiseDate` trong AG Grid (hàm đó ghi mốc bằng
// `getFullYear/getMonth/getDate`, tức giờ địa phương), nên không có chỗ nào lệch múi giờ. Trả `null` cho giá trị
// không đọc được để bên gọi bỏ qua, thay vì gửi lên một `Invalid Date`.
export function localDayToIso(value: string | null | undefined, endOfDay = false): string | null {
    if (!value) return null

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (!match) return null

    const [, year, month, day] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    if (Number.isNaN(date.getTime())) return null

    // Đầu mút trên lấy hết ngày: người dùng chọn "đến 30/09" là muốn thấy cả bản ghi tạo lúc 30/09 23:59, mà cột lưu
    // mốc thời gian đầy đủ. Không nới tới cuối ngày thì bộ lọc cắt mất đúng những bản ghi của ngày cuối — lỗi câm,
    // vì màn hình vẫn hiện "đến 30/09" mà kết quả lại thiếu.
    if (endOfDay) date.setHours(23, 59, 59, 999)

    return date.toISOString()
}

// Chiều ngược lại: mốc ISO trên URL → `YYYY-MM-DD` giờ địa phương, đúng thứ ô nhập của bộ lọc ngày cần.
export function isoToLocalDay(iso: string | undefined): string | null {
    if (!iso) return null

    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null

    const pad = (part: number) => String(part).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Chữ ký của một tập tham số lọc, để so hai tập với nhau. Sắp xếp khoá trước khi ghép nên thứ tự khai báo không làm
// hai tập giống nhau bị coi là khác; bỏ qua khoá rỗng để "không có khoá" và "khoá rỗng" quy về một — nếu không thì
// mỗi lần đồng bộ lại thấy khác và ghi URL thêm một lần vô ích.
export function filterParamsSignature(params: Record<string, string | undefined>): string {
    return Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
}

// Mô hình lọc của AG Grid → tham số URL. Chỉ đọc những cột có khai `AG_GRID_FILTER_KEY`; cột khác không có menu lọc
// nên cũng không bao giờ xuất hiện trong mô hình.
export function filterParamsFromModel(model: FilterModel | null, columns: FilterColumn[]): Record<string, string> {
    const params: Record<string, string> = {}
    if (!model) return params

    for (const column of columns) {
        const spec = columnFilterSpecOf(column.getColDef())
        if (!spec) continue

        const condition: unknown = model[column.getColId()]
        if (typeof condition !== 'object' || condition === null) continue

        if (spec.kind === 'text') {
            // Ô nhập rỗng nghĩa là bỏ lọc, không phải "khớp chuỗi rỗng".
            const value = readConditionText(condition)
            if (value) params[spec.param] = value
            continue
        }

        const from = localDayToIso(readStringProperty(condition, 'dateFrom'))
        const to = localDayToIso(readStringProperty(condition, 'dateTo'), true)
        if (from) params[spec.fromParam] = from
        if (to) params[spec.toParam] = to
    }

    return params
}

// Tham số URL → mô hình lọc của AG Grid, để menu lọc ở tiêu đề hiện đúng trạng thái đang lọc (biểu tượng phễu sáng)
// sau khi tải lại trang, dán link hoặc bấm Back — những đường đi mà lưới không hề hay biết.
export function filterModelFromParams(
    params: Record<string, string | undefined>,
    columns: FilterColumn[],
): FilterModel {
    const model: FilterModel = {}

    for (const column of columns) {
        const spec = columnFilterSpecOf(column.getColDef())
        if (!spec) continue

        const colId = column.getColId()

        if (spec.kind === 'text') {
            const value = params[spec.param]
            if (value) model[colId] = { filterType: 'text', type: 'contains', filter: value }
            continue
        }

        const from = isoToLocalDay(params[spec.fromParam])
        const to = isoToLocalDay(params[spec.toParam])
        // Đầu mút vắng mặt để nguyên `null`: bộ lọc gọi `inRange` và comparator của cột coi `null` là "không chặn
        // phía đó" (xem `compareByLocalDay`), nên "chỉ từ ngày" vẫn lọc đúng thay vì khớp rỗng.
        if (from || to) model[colId] = { filterType: 'date', type: 'inRange', dateFrom: from, dateTo: to }
    }

    return model
}

// Cột chỉ cho một điều kiện (`maxNumConditions: 1`) nên mô hình luôn ở dạng đơn; vẫn đọc được dạng gộp
// (`conditions: [...]`) để một cột lỡ nới `maxNumConditions` không âm thầm mất bộ lọc.
function readConditionText(condition: object): string {
    const direct = readStringProperty(condition, 'filter')
    if (direct) return direct.trim()

    const conditions: unknown = Reflect.get(condition, 'conditions')
    if (!Array.isArray(conditions)) return ''

    const first: unknown = conditions[0]
    if (typeof first !== 'object' || first === null) return ''

    return (readStringProperty(first, 'filter') ?? '').trim()
}

function readStringProperty(source: object, key: string): string | null {
    const value: unknown = Reflect.get(source, key)
    return typeof value === 'string' ? value : null
}
