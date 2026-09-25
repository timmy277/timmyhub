import type { UserRole } from '@timmyhub/contracts'

export interface DemoUserProfile {
    firstName: string
    lastName: string
    avatarUrl: string | null
}

// Hình dạng giống `User` của TimmyHub gốc: profile có thể chưa tạo, một user giữ nhiều role. Tạm dùng cho bảng quản
// trị bản demo — khi có API identity thì thay bằng schema trong `@timmyhub/contracts`.
export interface DemoUser {
    id: string
    email: string
    profile: DemoUserProfile | null
    roles: UserRole[]
    isActive: boolean
    createdAt: string
}
