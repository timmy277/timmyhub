import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

interface SellerLayoutProps {
    children: ReactNode
}

// Layout gốc cho nhánh route /seller — các trang con (register, portal) tự định nghĩa layout riêng.
export default function SellerLayout({ children }: SellerLayoutProps) {
    return <>{children}</>
}
