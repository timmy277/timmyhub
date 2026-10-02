import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { ROUTE } from '@/constants'
import { resolveSafeCallbackUrl } from '@/utils'

// Sau đăng nhập không có nội dung nào để công cụ tìm kiếm lập chỉ mục. Khai ở layout để phủ cả nhóm route một lần,
// thay vì lặp lại ở từng `page.tsx` (và quên khi thêm trang mới).
export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

interface ProtectedLayoutProps {
    children: ReactNode
}

// Lớp xác minh thứ hai sau proxy (ADR-0005): proxy đã giải mã phiên bằng auth() và chặn trước, còn ở đây
// `auth()` đảm bảo không có request nào chạm tới trang khi phiên không hợp lệ.
// Bố cục hiển thị (có sidebar hay chỉ có appbar) do từng nhóm route con `(home)` và `(admin)` tự quyết định.
export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const session = await auth()
    if (!session?.user?.id) {
        // Đích gốc do proxy gắn vào header `x-original-path` (proxy chạy trước layout); lọc open-redirect
        // bằng đúng helper dùng ở phía client (REQ-IDN-033).
        const headerList = await headers()
        const pathname = headerList.get('x-original-path')
        const callbackUrl = encodeURIComponent(resolveSafeCallbackUrl(pathname, ROUTE.HOME))
        redirect(`${ROUTE.LOGIN}?callbackUrl=${callbackUrl}`)
    }

    return <>{children}</>
}
