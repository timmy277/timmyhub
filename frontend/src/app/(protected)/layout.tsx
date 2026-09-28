import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { NavLayout } from '@/components/layout'
import { auth } from '@/lib/auth'
import { ROUTE } from '@/constants'
import { resolveSafeCallbackUrl } from '@/utils'

// Một khung sidebar + header cho mọi trang trong nhóm — Next giữ layout này qua các lần điều hướng nội bộ (PERF-001).
// Lớp xác minh thứ hai sau proxy (ADR-0005): proxy đã giải mã phiên bằng auth() và chặn trước, còn ở đây
// `auth()` đảm bảo không có request nào chạm tới trang khi phiên không hợp lệ.
export default async function ProtectedLayout({ children }: LayoutProps<'/'>) {
    const session = await auth()
    if (!session?.user?.id) {
        // Đích gốc do proxy gắn vào header `x-original-path` (proxy chạy trước layout); lọc open-redirect
        // bằng đúng helper dùng ở phía client (REQ-IDN-033).
        const headerList = await headers()
        const pathname = headerList.get('x-original-path')
        const callbackUrl = encodeURIComponent(resolveSafeCallbackUrl(pathname, ROUTE.HOME))
        redirect(`${ROUTE.LOGIN}?callbackUrl=${callbackUrl}`)
    }

    return <NavLayout>{children}</NavLayout>
}
