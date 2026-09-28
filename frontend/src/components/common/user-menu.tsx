'use client'

import { BadgeCheckIcon, LogOutIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui'
import { useLogout } from '@/hooks'
import { MOCK_NAV_USER } from '@/mocks'

import { UserAvatar } from './user-avatar'

// Menu tài khoản trên header. Đọc phiên từ SessionProvider (không chứa token — REQ-IDN-023); trang tài
// khoản chưa dựng nên báo "sắp ra mắt" thay vì link tới 404.
export function UserMenu() {
    // ===== Hooks =====
    const t = useTranslations('nav')
    const { data: session } = useSession()
    const { mutate: logout, isPending } = useLogout()

    // ===== Derived =====
    // Fallback mock khi session chưa kịp nạp — tránh nhảy layout. Email/tên thật hiển thị khi có phiên.
    const name = session?.user?.name ?? MOCK_NAV_USER.name
    const email = session?.user?.email ?? MOCK_NAV_USER.email
    const avatar = MOCK_NAV_USER.avatar

    // ===== Handlers =====
    const handleAccount = () => toast.info(t('accountComingSoon'))

    const handleLogOut = () => {
        // Thu hồi phiên ở BE, xoá cookie + reset SessionProvider, rồi điều hướng về login —
        // onSettled đảm bảo về login kể cả request lỗi.
        logout()
        toast.success(t('loggedOut'))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('account')} className="rounded-full">
                    <UserAvatar name={name} imageUrl={avatar} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <UserAvatar name={name} imageUrl={avatar} />
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate font-medium">{name}</span>
                            <span className="truncate text-xs text-muted-foreground">{email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={handleAccount}>
                        <BadgeCheckIcon aria-hidden />
                        {t('account')}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogOut} disabled={isPending}>
                    <LogOutIcon aria-hidden />
                    {t('logOut')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
