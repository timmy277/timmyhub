import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserProfileOverride {
    displayName?: string | null
    avatar?: string | null
}

interface UserProfileState {
    override: UserProfileOverride | null
    setOverride: (override: UserProfileOverride) => void
    clearOverride: () => void
}

// Lưu trữ tạm thời tên hiển thị và avatar mới nhất phía client để Navbar phản hồi ngay lập tức,
// không bị trễ do độ trễ cập nhật cookie phiên HttpOnly của NextAuth.
export const useUserProfileStore = create<UserProfileState>()(
    persist(
        (set) => ({
            override: null,
            setOverride: (override) => set({ override }),
            clearOverride: () => set({ override: null }),
        }),
        {
            name: 'timmyhub:user-profile-override',
        },
    ),
)
