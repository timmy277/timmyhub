import type { UserSummary } from '@timmyhub/contracts'

// Tên hiển thị theo thứ tự tiếng Việt: họ trước tên. Nhận đúng hình dạng `UserSummary` của `@timmyhub/contracts`
// (không phải một type riêng của FE) để bảng, hộp chi tiết và form dùng chung một cách hiển thị.
// `displayName` do người dùng tự đặt được ưu tiên; chưa có hồ sơ thì trả `null` để nơi dùng tự hiện "Chưa cập nhật".
export function getUserDisplayName(user: Pick<UserSummary, 'profile'>): string | null {
    if (!user.profile) return null
    const fullName = `${user.profile.lastName} ${user.profile.firstName}`.trim()
    return user.profile.displayName?.trim() || fullName || null
}
