import type { ReactNode } from 'react'

import { HomeLayout } from '@/components/layout'

interface ProtectedHomeLayoutProps {
    children: ReactNode
}

// Layout trang chủ cho người dùng: chỉ có AppBar ở trên, không bọc trong sidebar.
export default function ProtectedHomeLayout({ children }: ProtectedHomeLayoutProps) {
    return <HomeLayout>{children}</HomeLayout>
}
