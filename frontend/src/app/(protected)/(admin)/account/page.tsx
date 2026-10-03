import type { Metadata } from 'next'

import { AccountShell } from '@/features/account'
import { getCurrentUserDetailAction } from '@/features/users'

export const metadata: Metadata = {
    title: 'Cài đặt tài khoản · TimmyHub',
    description: 'Quản lý thông tin cá nhân, bảo mật mật khẩu, sổ địa chỉ và cài đặt thông báo',
    robots: {
        index: false,
        follow: false,
    },
}

export default async function AccountPage() {
    const user = await getCurrentUserDetailAction()
    return <AccountShell initialUser={user} />
}
