import type { ReactNode } from 'react'

interface SellerLayoutProps {
    children: ReactNode
}

// Layout gốc cho nhánh route /seller — các trang con (register, portal) tự định nghĩa layout riêng.
export default function SellerLayout({ children }: SellerLayoutProps) {
    return <>{children}</>
}
