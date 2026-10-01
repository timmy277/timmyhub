// Hằng thuần của AgGridTable, tách khỏi file có AG Grid để nơi dùng import được mà không kéo gói lưới vào bundle.

// Chiều cao mặc định của vùng lưới — skeleton dùng cùng giá trị để không nhảy layout khi lưới hiện ra.

export const AG_GRID_TABLE_DEFAULT_HEIGHT = 'clamp(300px, calc(100dvh - 20rem), 520px)'

// Gắn `context: AG_GRID_NO_EXPORT` vào ColDef để bỏ cột đó khỏi file CSV (cột thao tác, ảnh…).
export const AG_GRID_NO_EXPORT = { excludeFromExport: true } as const

// Key mà AgGridTable đọc trong `colDef.context` khi lọc cột xuất CSV.
export const AG_GRID_NO_EXPORT_KEY: keyof typeof AG_GRID_NO_EXPORT = 'excludeFromExport'

// Key mà AgGridTable đọc trong `colDef.context` để biết cột đó sắp xếp phía server bằng giá trị `sort` nào ở mỗi
// chiều: `{ [AG_GRID_SORT_KEY]: { asc: 'email', desc: '-email' } }`. Cột không khai thì không cho bấm sắp xếp —
// thà không có mũi tên còn hơn để người dùng tưởng đã sắp xếp cả bảng trong khi lưới chỉ xáo 20 dòng của một trang.
export const AG_GRID_SORT_KEY = 'sortValues' as const

export type ColumnSortValues = { asc: string; desc: string }

// Key mà AgGridTable đọc trong `colDef.context` để biết cột đó lọc phía server bằng tham số URL nào. Cùng luật với
// `AG_GRID_SORT_KEY`: ở chế độ lọc phía server, `filter` là **opt-in** — cột không khai `filterParams` thì không có
// menu lọc, vì menu lọc tại chỗ chỉ lọc được 20 dòng đang hiện chứ không lọc cả bảng, mà một bộ lọc nói dối còn tệ
// hơn không có bộ lọc.
export const AG_GRID_FILTER_KEY = 'serverFilter' as const

// Cách một cột ánh xạ sang tham số URL. Cố ý là tham số rời chứ không phải cả mô hình lọc của AG Grid: URL phải gõ
// tay được, đọc được và validate được bằng chính schema của backend (luật #15), chứ không bắt backend hiểu định dạng
// riêng của thư viện.
//  - `text`: một tham số chuỗi, khớp chứa và không phân biệt hoa thường.
//  - `date`: hai tham số mốc ISO, mỗi đầu mút độc lập — chỉ gửi một đầu là "từ/đến mốc đó trở đi".
export type ColumnFilterSpec = { kind: 'text'; param: string } | { kind: 'date'; fromParam: string; toParam: string }

// Thứ tự đảo chiều khi bấm tiêu đề ở chế độ sắp xếp phía server. Cố ý **không** có mốc `null` như mặc định của AG
// Grid: bỏ hẳn sắp xếp là trạng thái backend không diễn tả được (`sort` luôn có giá trị mặc định), nên lần bấm thứ
// ba chỉ đảo chiều chứ không xoá.
export const AG_GRID_SERVER_SORT_ORDER: readonly ('asc' | 'desc')[] = ['asc', 'desc']

// Mốc số dòng mỗi trang dùng chung cho MỌI bảng — cả lưới AG Grid lẫn danh sách phân trang phía server. Trần
// `pageSize` của API là 100 (api-conventions §3.2), nên đừng thêm mốc lớn hơn.
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]

// Số ô trang tối đa trước khi rút gọn bằng dấu "…" — giống Mantine Pagination của TimmyHub gốc (siblings 1,
// boundaries 1): 1 … 4 5 6 … 10.
export const MAX_VISIBLE_PAGES = 7

// Tên cũ giữ cho AgGridTable/AgGridPagination. Hằng số nền nằm ở trên — đừng khai báo lại giá trị ở đây.
export const AG_GRID_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS
export const AG_GRID_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE
export const AG_GRID_MAX_VISIBLE_PAGES = MAX_VISIBLE_PAGES

// Chiều cao hàng bảng user — đủ cho avatar 32px và badge role xuống dòng.
export const USER_TABLE_ROW_HEIGHT_PX = 52

// Cột thao tác ghim phải: mỗi nút `icon-sm` 28px, cách nhau 4px, cộng khoảng chừa hai bên. Khoảng chừa mỗi bên 20px
// = 15px padding thật của ô dữ liệu + 5px cho nút khỏi dính mép ô.
//
// Padding thật đo từ theme chứ không đoán: AG Grid Quartz đặt `--ag-spacing: 8px` nên `--ag-cell-horizontal-padding`
// = 16px, và ô dữ liệu lấy `calc(16px - 1px)` mỗi bên (`.ag-cell`), còn ô tiêu đề lấy trọn 16px (`.ag-header-cell`).
// Giữ 20px để trường hợp đủ 4 quyền ra đúng 164px như hằng số cũ — refactor không được đổi bề rộng đang thấy.
//
// Bề rộng thật do `rowActionsColumnWidth` tính theo **số nút đang render** cho người đang xem (xem `users.columns.tsx`).
export const ROW_ACTIONS_BUTTON_WIDTH_PX = 28
export const ROW_ACTIONS_GAP_PX = 4
export const ROW_ACTIONS_CELL_INSET_PX = 20
// Bề rộng tối thiểu để tiêu đề không bị cắt: 2 × 16px padding tiêu đề = 32px, cộng chỗ cho nhãn dài nhất ("Thao tác"
// khoảng 59px ở 14px/600, "Actions" khoảng 51px). Hẹp hơn thì `.ag-header-cell-text` cắt thành "Thao tá…" — mà cắt
// tiêu đề thì không còn cách nào biết cột đó là gì.
export const ROW_ACTIONS_HEADER_MIN_WIDTH_PX = 96

export const AVATAR_COLUMN_WIDTH_PX = 80

// Bề rộng cột bảng user (px): `MIN_*` cho cột co giãn (`flex`), còn lại là cột cố định.
//
// `LAST_LOGIN` rộng hơn `MEMBER_SINCE` dù cùng hiển thị một mốc ngày: tiêu đề mới là thứ quyết định bề rộng chứ không
// phải ô dữ liệu ("30/09/2026" chỉ ~66px). Tiêu đề "Đăng nhập gần nhất" dài 18 ký tự, ở 14px/600 (theme đặt
// `headerFontWeight: 600`, `fontSize: 14`) chiếm ~129px, cộng padding tiêu đề 2×16px và chỗ cho mũi tên sắp xếp lẫn
// nút menu là ~196px — hẹp hơn thì `.ag-header-cell-text` cắt thành "Đăng nhập gần nhấ…", mà cắt tiêu đề thì không
// còn cách nào biết cột đó là gì. Hai cột mốc thời gian nay hiện cả giờ:phút:giây (`dd/MM/yyyy HH:mm:ss`, 19 ký tự ≈
// 135px) nên phải nới thêm để giá trị không bị cắt — tiêu đề vẫn là mức sàn như trước.
export const USER_COLUMN_WIDTH_PX = {
    MIN_NAME: 170,
    MIN_EMAIL: 240,
    MIN_ROLES: 190,
    STATUS: 150,
    MEMBER_SINCE: 195,
    LAST_LOGIN: 220,
} as const

// Bề rộng (px) các nút thanh công cụ trong skeleton — xấp xỉ nút thật để không nhảy layout.
export const AG_GRID_SKELETON_TOOLBAR_WIDTHS_PX = [88, 76, 72, 96] as const

// Số ô trang trong skeleton: đầy đủ (desktop) và rút gọn (màn hẹp: trước · trang · sau).
export const AG_GRID_SKELETON_PAGE_ITEMS = { FULL: 11, COMPACT: 3 } as const
