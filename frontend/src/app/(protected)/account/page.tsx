import type { Metadata } from 'next'

import { AccountShell } from '@/features/account'

export const metadata: Metadata = {
    title: 'Cài đặt tài khoản · TimmyHub',
    description: 'Quản lý thông tin cá nhân, bảo mật mật khẩu, sổ địa chỉ và cài đặt thông báo',
    robots: {
        index: false,
        follow: false,
    },
}

export default function AccountPage() {
    return <AccountShell />
}
