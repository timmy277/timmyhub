// Chỉ export bản nạp động và kiểu — không export thẳng `./ag-grid-table` để barrel `@/components` không kéo AG Grid
// vào gói chung. Hằng của bảng (`AG_GRID_NO_EXPORT`…) nằm ở `@/constants`, cột mặc định ở `@/config`.
export { AgGridTable } from './ag-grid-table-lazy'
export { AgGridTableSkeleton } from './ag-grid-table-skeleton'
export type { AgGridTableProps } from './ag-grid-table'
