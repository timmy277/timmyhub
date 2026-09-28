import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { ROUTE } from '@/constants'

// Proxy (Next.js 16) — lớp chặn thứ nhất và là chỗ DUY NHẤT ở tầng điều hướng biết phiên có hợp lệ hay
// không: dùng `auth()` của NextAuth (ADR-0005, REQ-IDN-023 kịch bản 2), KHÔNG tự đọc tên cookie bằng tay.
// Cookie tồn tại không có nghĩa là phiên còn dùng được (secret đổi, phiên bị thu hồi, cookie cũ…): tự kiểm
// tra sự tồn tại của cookie sẽ sinh vòng lặp redirect — proxy cho qua trang protected, layout xác minh
// thất bại rồi đá về /login, proxy lại thấy cookie và cho qua tiếp.
//
// `auth()` chạy ở edge runtime và chỉ giải mã JWT, không gọi mạng khi phiên còn hiệu lực.

// Route công khai: chỉ trang đăng nhập — mọi trang khác nằm trong nhóm `(protected)`.
const PUBLIC_PATHS = [ROUTE.LOGIN]

// Header gắn đích gốc vào request để Server Component (vd (protected)/layout.tsx) đọc khi cần điều hướng về
// login kèm callbackUrl — proxy chạy trước layout nên không đọc được pathname bằng cách khác.
const REQUEST_PATH_HEADER = 'x-original-path'

export const proxy = auth((request) => {
    const { pathname } = request.nextUrl
    const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    const isAuthenticated = Boolean(request.auth?.user?.id)

    // Chưa có phiên hợp lệ mà vào trang protected → về login kèm callbackUrl (REQ-IDN-032). Đích gốc lấy từ
    // chính request, không tin tham số do client truyền lên.
    if (!isPublic && !isAuthenticated) {
        const loginUrl = new URL(ROUTE.LOGIN, request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Có phiên hợp lệ mà vào /login → render bình thường, để trang login tự chuyển hướng
    // (RedirectIfAuthenticated dùng getSession() nên chỉ tin phiên đã xác minh phía server).

    // Gắn đích gốc vào header — (protected)/layout dùng làm callbackUrl khi phiên hết hạn thật.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(REQUEST_PATH_HEADER, pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
    matcher: [
        // Bỏ qua static files, image optimization, favicon, sitemap, robots, và chính route NextAuth.
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}
