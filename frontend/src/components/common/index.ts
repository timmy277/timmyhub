// Barrel export cho toàn bộ component dùng chung của dự án. Thêm component mới vào thư mục này (kể cả
// trong thư mục con) thì phải export lại ở đây — nơi khác trong repo chỉ import qua `@/components`,
// không import thẳng file con.
export * from './locale-switcher/locale-switcher'
export * from './theme-customizer/color-swatch-button'
export * from './theme-customizer/theme-attributes-sync'
export * from './theme-customizer/theme-customizer'
export * from './theme-customizer/theme-customizer-trigger'
