// Khai báo trực tiếp, không suy ra từ `LOCALES` — `constants/locale.ts` đã import kiểu này, suy ngược lại sẽ tạo vòng
// import constants ↔ types. `LOCALES` dùng `satisfies readonly Locale[]` nên thêm ngôn ngữ phải sửa cả hai nơi.
export type Locale = 'vi' | 'en'
