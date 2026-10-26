import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { ROUTE } from '@/constants'
import { resolveSafeCallbackUrl } from '@/utils'

// Bố cục hiển thị (có sidebar hay chỉ có appbar) do từng nhóm route con `(home)` và `(admin)` tự quyết định.
// Metadata robot được khai báo riêng tại từng nhánh (admin/seller/user private vs storefront công khai).

interface ProtectedLayoutProps {
    children: ReactNode
}

// Lớp xác minh thứ hai sau proxy (ADR-0005): proxy đã giải mã phiên bằng auth() và chặn trước, còn ở đây
// `auth()` đảm bảo không có request nào chạm tới trang khi phiên không hợp lệ.
// Bố cục hiển thị (có sidebar hay chỉ có appbar) do từng nhóm route con `(home)` và `(admin)` tự quyết định.
export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const headerList = await headers()
    const pathname = headerList.get('x-original-path') || ''
    const isPublicStorefront =
        pathname === ROUTE.HOME ||
        pathname === ROUTE.SEARCH ||
        pathname.startsWith(`${ROUTE.SEARCH}/`) ||
        pathname.startsWith('/products') ||
        pathname.startsWith('/shops') ||
        pathname.startsWith('/videos') ||
        pathname.startsWith('/posts')

    // Cho phép khách và bot tìm kiếm xem catalog công khai (home, chi tiết sản phẩm, gian hàng) mà không bị ép đăng nhập
    if (!isPublicStorefront) {
        const session = await auth()
        if (!session?.user?.id) {
            // Đích gốc do proxy gắn vào header `x-original-path` (proxy chạy trước layout); lọc open-redirect
            // bằng đúng helper dùng ở phía client (REQ-IDN-033).
            const callbackUrl = encodeURIComponent(resolveSafeCallbackUrl(pathname, ROUTE.HOME))
            redirect(`${ROUTE.LOGIN}?callbackUrl=${callbackUrl}`)
        }
    }

    return <>{children}</>
}
