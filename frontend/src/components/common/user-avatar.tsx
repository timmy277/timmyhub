import type { ComponentProps } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { cn, getInitials } from '@/utils'

interface UserAvatarProps {
    // Tên dùng để lấy chữ cái viết tắt khi chưa có ảnh (hoặc ảnh lỗi).
    name: string
    imageUrl?: string | null
    size?: ComponentProps<typeof Avatar>['size']
    className?: string
    fallbackClassName?: string
}

// Ảnh đại diện người dùng, rơi về chữ viết tắt (`getInitials`). Ảnh để `alt=""` vì luôn đi kèm tên hiển thị bên
// cạnh — đọc lại tên là thừa. 7 trạng thái: mặc định (ảnh) · đang tải (Radix hiện fallback tới khi ảnh tải xong) ·
// rỗng (không có ảnh → chữ viết tắt) · lỗi (ảnh hỏng → chữ viết tắt) · không có quyền / vô hiệu hoá / thành công (N/A
// — chỉ hiển thị).
export function UserAvatar({ name, imageUrl, size, className, fallbackClassName }: UserAvatarProps) {
    return (
        <Avatar size={size} className={className}>
            {imageUrl && <AvatarImage src={imageUrl} alt="" />}
            <AvatarFallback
                suppressHydrationWarning
                className={cn('bg-primary/10 text-xs font-semibold text-primary', fallbackClassName)}
            >
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    )
}
