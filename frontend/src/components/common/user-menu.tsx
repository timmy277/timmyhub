'use client'

import { useQuery } from '@tanstack/react-query'
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
import { QUERY_KEY } from '@/constants'
import { getCurrentUserProfileAction } from '@/features/users'
import { useLogout } from '@/hooks'
import { useUserProfileStore } from '@/stores'

import { UserAvatar } from './user-avatar'

// Menu tài khoản trên header. Đồng bộ avatar và tên từ cả 3 tầng: store client tức thì, React Query từ backend và phiên NextAuth.
export function UserMenu() {
    // ===== Hooks =====
    const t = useTranslations('nav')
    const { data: session } = useSession()
    const { mutate: logout, isPending } = useLogout()
    const profileOverride = useUserProfileStore((state) => state.override)

    // Tự động tải profile thực tế từ backend; query key 'users' sẽ tự invalidate khi có mutation sửa user
    const { data: backendProfile } = useQuery({
        queryKey: QUERY_KEY.USERS.DETAIL('me'),
        queryFn: () => getCurrentUserProfileAction(),
        staleTime: 30_000,
        enabled: Boolean(session?.user?.id),
    })

    // ===== Derived =====
    const email = session?.user?.email ?? ''
    const username =
        profileOverride?.displayName ||
        backendProfile?.displayName ||
        session?.user?.name ||
        (email ? email.split('@')[0] : '') ||
        t('account')
    const avatar =
        profileOverride?.avatar !== undefined
            ? profileOverride.avatar
            : backendProfile?.avatar !== undefined
              ? backendProfile.avatar
              : session?.user?.image

    // ===== Handlers =====
    const handleAccount = () => toast.info(t('accountComingSoon'))

    const handleLogOut = () => {
        useUserProfileStore.getState().clearOverride()
        logout()
        toast.success(t('loggedOut'))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('account')} className="rounded-full">
                    <UserAvatar name={username} imageUrl={avatar} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <UserAvatar name={username} imageUrl={avatar} />
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate font-medium">{username}</span>
                            {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
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
