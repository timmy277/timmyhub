// Hằng thuần của AgGridTable, tách khỏi file có AG Grid để nơi dùng import được mà không kéo gói lưới vào bundle.

// Chiều cao mặc định (px) của vùng lưới — skeleton dùng cùng giá trị để không nhảy layout khi lưới hiện ra.
export const AG_GRID_TABLE_DEFAULT_HEIGHT = 520

// Gắn `context: AG_GRID_NO_EXPORT` vào ColDef để bỏ cột đó khỏi file CSV (cột thao tác, ảnh…).
export const AG_GRID_NO_EXPORT = { excludeFromExport: true } as const

// Key mà AgGridTable đọc trong `colDef.context` khi lọc cột xuất CSV.
export const AG_GRID_NO_EXPORT_KEY: keyof typeof AG_GRID_NO_EXPORT = 'excludeFromExport'

export const AG_GRID_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export const AG_GRID_DEFAULT_PAGE_SIZE = AG_GRID_PAGE_SIZE_OPTIONS[0]

// Số ô trang tối đa trước khi rút gọn bằng dấu "…" — giống Mantine Pagination của TimmyHub gốc (siblings 1,
// boundaries 1): 1 … 4 5 6 … 10.
export const AG_GRID_MAX_VISIBLE_PAGES = 7

// Chiều cao hàng bảng user — đủ cho avatar 32px và badge role xuống dòng.
export const USER_TABLE_ROW_HEIGHT_PX = 52

// Cột thao tác ghim phải: ba nút `icon-sm` (3 × 28px) + 2 khoảng cách 4px + padding ô hai bên. Giữ dưới 150px để
// màn 360px vẫn còn chỗ cho cột dữ liệu.
export const ROW_ACTIONS_COLUMN_WIDTH_PX = 128

export const AVATAR_COLUMN_WIDTH_PX = 80

// Bề rộng cột bảng user (px): `MIN_*` cho cột co giãn (`flex`), còn lại là cột cố định.
export const USER_COLUMN_WIDTH_PX = {
    MIN_NAME: 170,
    MIN_EMAIL: 240,
    MIN_ROLES: 190,
    STATUS: 150,
    MEMBER_SINCE: 160,
} as const

// Bề rộng (px) các nút thanh công cụ trong skeleton — xấp xỉ nút thật để không nhảy layout.
export const AG_GRID_SKELETON_TOOLBAR_WIDTHS_PX = [88, 76, 72, 96] as const

// Số ô trang trong skeleton: đầy đủ (desktop) và rút gọn (màn hẹp: trước · trang · sau).
export const AG_GRID_SKELETON_PAGE_ITEMS = { FULL: 11, COMPACT: 3 } as const
