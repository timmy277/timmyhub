import type { ColDef } from 'ag-grid-community'

// Cấu hình cột mặc định của mọi AgGridTable. Chỉ import kiểu từ `ag-grid-community` nên không kéo gói lưới vào bundle.
//
// Khai bằng `satisfies` chứ không phải annotation `: ColDef`: annotation cho hằng này kiểu `ColDef<any>`, mà đem
// spread nó vào một `ColDef<TData>` cụ thể thì trường `field` (`ColDefField<any>` = `string | number | symbol`) không
// còn gán được vào `ColDefField<TData>` — bảng dùng chung sẽ vỡ ngay khi ai đó truyền `columnDefs`. `satisfies` vẫn
// bắt lỗi chính tả tên thuộc tính, nhưng giữ nguyên kiểu hẹp của từng giá trị.
export const DEFAULT_COL_DEF = {
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    // Căn giữa nội dung mọi ô theo cả hai chiều. Dùng inline style vì CSS của AG Grid không nằm trong layer nên
    // utility Tailwind (trong `@layer utilities`) không đè được; cột nào cần căn khác thì tự đặt `cellStyle`.
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
} satisfies ColDef
