import type { ColDef } from 'ag-grid-community'

// Cấu hình cột mặc định của mọi AgGridTable. Chỉ import kiểu từ `ag-grid-community` nên không kéo gói lưới vào bundle.
export const DEFAULT_COL_DEF: ColDef = {
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    // Căn giữa nội dung mọi ô theo cả hai chiều. Dùng inline style vì CSS của AG Grid không nằm trong layer nên
    // utility Tailwind (trong `@layer utilities`) không đè được; cột nào cần căn khác thì tự đặt `cellStyle`.
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
}
