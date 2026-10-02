// Barrel export cho zod schema phía frontend (form react-hook-form + zod, validate dữ liệu client).
// Mỗi schema export kèm type suy ra (`z.infer`). Schema dùng chung FE/BE thuộc `@timmyhub/contracts`
// (luật 15 CLAUDE.md), không khai báo lại ở đây. Nơi khác trong repo chỉ import qua `@/schemas`.
export * from './theme-config.schema'
export * from './account.schema'
