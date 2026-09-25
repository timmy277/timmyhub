// Khớp các `variant` của `badgeVariants` (components/ui/badge.tsx). Khai báo tay thay vì suy từ component để
// `types/` và `constants/` không import `components/` (tránh vòng import); lệch tập giá trị thì chỗ truyền vào
// `<Badge variant>` báo lỗi biên dịch.
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
