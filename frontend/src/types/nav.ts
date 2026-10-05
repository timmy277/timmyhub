import type { LucideIcon } from 'lucide-react'

// `titleKey`/`labelKey` là key i18n trong namespace `nav`, không phải nhãn — sidebar tự dịch.
// `icon` bắt buộc: khi sidebar thu gọn còn mỗi rail 3rem, icon là thứ duy nhất để bấm.
export interface NavItem {
    titleKey: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: readonly NavItem[]
    // Nếu có, nav item chỉ hiện khi người dùng sở hữu quyền này (hoặc 1 trong các quyền nếu là mảng).
    requirePermission?: string | readonly string[]
    // Nếu có, nav item sẽ bị ẩn khi người dùng sở hữu quyền này (hoặc 1 trong các quyền nếu là mảng).
    excludePermission?: string | readonly string[]
}

export interface NavGroup {
    labelKey?: string
    items: readonly NavItem[]
}

export interface NavUserInfo {
    name: string
    email: string
    avatar?: string
}

// Một mắt xích breadcrumb. Route đã khai báo dùng `titleKey` (dịch được); đoạn URL không khai báo
// (vd. id động) rơi về `title` lấy nguyên từ URL.
export type BreadcrumbEntry = { url: string } & (
    { titleKey: string; title?: never } | { title: string; titleKey?: never }
)
