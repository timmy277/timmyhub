import { cache } from 'react'

import { API_ROUTE } from '@/constants'

import { fetchBackend } from './api-server'
import { auth } from './auth'

// Danh tính + quyền hiệu lực của người đang đăng nhập, đọc **phía server**. Đây là nguồn duy nhất để giao diện biết
// mình được làm gì: quyền là tập động (role ∪ grant − deny) nên chỉ backend trả lời được chính xác; phiên NextAuth cố
// ý không mang role/permission ra client (REQ-IDN-023).
export type Actor = {
    userId: string
    email: string
    accessToken: string
    permissions: ReadonlySet<string>
    // Backend không trả được tập quyền (chết/mất mạng). Giao diện phải coi như **không có** quyền ghi thay vì đoán —
    // hỏng hạ tầng không được biến thành mở toang nút thao tác.
    permissionsUnavailable: boolean
}

// `cache()` của React gộp mọi lời gọi trong cùng một request: layout, trang và các Server Action đều dùng chung một
// lượt đọc phiên + một lượt hỏi quyền.
export const getActor = cache(async (): Promise<Actor | null> => {
    const session = await auth()
    const userId = session?.user?.id
    const accessToken = session?.accessToken
    if (!userId || !accessToken) return null

    const result = await fetchBackend<{ userId: string; permissions: string[] }>(
        API_ROUTE.RBAC.USER_EFFECTIVE_PERMISSIONS(userId),
        { token: accessToken },
    )

    return {
        userId,
        email: session.user.email ?? '',
        accessToken,
        permissions: new Set(result.ok ? result.data.permissions : []),
        permissionsUnavailable: !result.ok,
    }
})
