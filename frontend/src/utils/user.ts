import type { DemoUser } from '@/types'

// Tên hiển thị theo thứ tự tiếng Việt: họ trước tên. Chưa có profile thì trả `null` để nơi dùng tự hiện "Chưa cập nhật".
export function getUserDisplayName(user: DemoUser): string | null {
    if (!user.profile) return null
    return `${user.profile.lastName} ${user.profile.firstName}`.trim()
}
