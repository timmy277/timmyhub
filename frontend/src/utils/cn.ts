// Ghép class Tailwind cho toàn bộ dự án.
//
// Dùng thẳng gói `cn` chính thức của shadcn (`shadcn-ui/cn`) — chính là bản biên dịch của `twMerge(clsx(...))` mà
// file này trước đây tự ghép. Lý do đổi: `shadcn add` (style `radix-nova`) sinh ra `import { cn } from 'cn'` trong
// `components/ui/`, nên nếu giữ bản tự ghép thì mỗi component mới lại phải sửa tay một dòng — trái tinh thần
// ADR-0006 (giữ `components/ui/` nguyên bản để `shadcn add --overwrite` còn an toàn).
//
// Giữ file này làm **cửa vào duy nhất**: các file trong `components/ui/` vẫn `import { cn } from '@/utils'` và không
// phải đổi gì. Chữ ký hai bên giống nhau — `(...inputs: ClassValue[]) => string`.
export { cn } from 'cn'
