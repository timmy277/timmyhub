// Chỉ export bản nạp động, hằng thuần và kiểu — không export thẳng `./ag-grid-table` để barrel `@/components` không
// kéo AG Grid vào gói chung.
export { AgGridTable } from './ag-grid-table-lazy'
export * from './ag-grid-table-constants'
export { AgGridTableSkeleton } from './ag-grid-table-skeleton'
export type { AgGridTableProps } from './ag-grid-table'
