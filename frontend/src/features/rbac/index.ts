// Public API của feature rbac — nơi khác chỉ import qua `@/features/rbac`. Component client (bảng, form, thanh tab) là
// chi tiết nội bộ, import bằng đường dẫn tương đối trong feature, không lọt ra barrel (giống feature users).
export * from './actions'
export * from './components/rbac-management-page'
export * from './rbac-tab-query'
