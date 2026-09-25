'use client'

import { useRouter } from 'next/navigation'
import { BadgeCheckIcon, LogOutIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
import { ROUTE } from '@/constants'
import { MOCK_NAV_USER } from '@/mocks'

import { UserAvatar } from './user-avatar'

// Menu tài khoản trên header. Chưa có auth ở FE: đăng xuất chỉ điều hướng về trang đăng nhập, trang tài khoản chưa
// dựng nên báo "sắp ra mắt" thay vì link tới 404.
export function UserMenu() {
    // ===== Hooks =====
    const t = useTranslations('nav')
    const router = useRouter()

    // ===== Derived =====
    const user = MOCK_NAV_USER

    // ===== Handlers =====
    const handleAccount = () => toast.info(t('accountComingSoon'))

    const handleLogOut = () => {
        // TODO(auth): gọi `API_ROUTE.AUTH.LOGOUT` và xoá phiên trước khi điều hướng.
        router.push(ROUTE.LOGIN)
        toast.success(t('loggedOut'))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('account')} className="rounded-full">
                    <UserAvatar name={user.name} imageUrl={user.avatar} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <UserAvatar name={user.name} imageUrl={user.avatar} />
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate font-medium">{user.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
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
                <DropdownMenuItem onSelect={handleLogOut}>
                    <LogOutIcon aria-hidden />
                    {t('logOut')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
