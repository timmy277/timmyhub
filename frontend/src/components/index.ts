// Barrel gộp — nơi khác trong repo import component qua `@/components`, không import thẳng
// `@/components/ui/*` hay `@/components/common/*`.
//
// Ngoại lệ bắt buộc (luật 12 CLAUDE.md): thư viện nặng (TipTap, Uppy, hls.js, AG Grid, Recharts,
// Motion…) phải nạp qua `next/dynamic`, và `next/dynamic` cần trỏ thẳng vào file component cụ thể —
// đi qua barrel này sẽ kéo theo toàn bộ nội dung của cả hai thư mục vào cùng một chunk, phá mất việc
// tách gói 0 KB. Component nặng dùng dynamic import thì import thẳng đường dẫn file, không qua barrel.
export * from './common'
export * from './ui'
