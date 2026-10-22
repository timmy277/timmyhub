'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { HeartIcon, LayoutGridIcon, LogInIcon, LogOutIcon, PackageIcon, TicketIcon, UserIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
    Skeleton,
} from '@/components/ui'
import { DASHBOARD_PERMISSION, QUERY_KEY, ROUTE } from '@/constants'
import { AccountDialog, type AccountTabKey } from '@/features/account'
import { getCurrentUserProfileAction } from '@/features/users'
import { useLogout, useMounted, usePermissions } from '@/hooks'
import { useUserProfileStore } from '@/stores'
import { getInitials } from '@/utils'

import { UserAvatar } from './user-avatar'

// Menu tài khoản trên header. Đồng bộ avatar và tên từ cả 3 tầng: store client tức thì, React Query từ backend và phiên NextAuth.
export function UserMenu() {
    // ===== Hooks =====
    const t = useTranslations('nav')
    const isMounted = useMounted()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const { data: session, status } = useSession()
    const isAuthenticated = Boolean(session?.user?.id)
    const { mutate: logout, isPending } = useLogout()
    const profileOverride = useUserProfileStore((state) => state.override)

    const { hasPermission } = usePermissions()
    const canAccessDashboard = hasPermission(DASHBOARD_PERMISSION)

    // Tự động tải profile thực tế từ backend; query key 'users' sẽ tự invalidate khi có mutation sửa user
    const { data: backendProfile } = useQuery({
        queryKey: QUERY_KEY.USERS.NAVBAR_PROFILE,
        queryFn: () => getCurrentUserProfileAction(),
        staleTime: 30_000,
        enabled: isAuthenticated,
    })

    // ===== Handlers =====
    const handleOpenAccount = useCallback(
        (tab: AccountTabKey = 'profile') => {
            if (pathname === ROUTE.ACCOUNT) {
                const params = new URLSearchParams(searchParams.toString())
                params.set('tab', tab)
                params.delete('orderId')
                router.push(`${pathname}?${params.toString()}`, { scroll: false })
                return
            }
            const params = new URLSearchParams(searchParams.toString())
            params.set('modal', 'account')
            params.set('tab', tab)
            params.delete('orderId')
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        },
        [pathname, router, searchParams],
    )

    const handleAccountOpenChange = useCallback(
        (open: boolean) => {
            const params = new URLSearchParams(searchParams.toString())
            if (open) {
                params.set('modal', 'account')
                if (!params.has('tab')) {
                    params.set('tab', 'profile')
                }
            } else {
                params.delete('modal')
                params.delete('tab')
                params.delete('orderId')
            }
            const query = params.toString()
            router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
        },
        [pathname, router, searchParams],
    )

    // Khi chưa mounted hoặc đang nạp session: hiển thị placeholder nhỏ
    if (!isMounted || status === 'loading') {
        return <Skeleton className="h-8 w-8 rounded-full" />
    }

    // Khi CHƯA đăng nhập: Hiển thị Button Đăng nhập điều hướng thẳng tới trang /login
    if (!isAuthenticated) {
        const callbackUrl = pathname && pathname !== ROUTE.LOGIN ? `?callbackUrl=${encodeURIComponent(pathname)}` : ''
        return (
            <Button
                asChild
                variant="default"
                size="sm"
                className="h-8 gap-1.5 px-3.5 rounded-full font-bold shadow-sm text-xs transition-transform hover:scale-[1.02]"
            >
                <Link href={`${ROUTE.LOGIN}${callbackUrl}`}>
                    <LogInIcon className="size-3.5" />
                    <span>{t('login')}</span>
                </Link>
            </Button>
        )
    }

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
    const isAccountOpen = searchParams.get('modal') === 'account'
    const accountTab = (searchParams.get('tab') as AccountTabKey) || 'profile'
    const initials = isMounted && username ? getInitials(username) : ''
    const accountLabel = initials ? `${initials} - ${t('account')}` : t('account')

    const handleLogOut = () => {
        useUserProfileStore.getState().clearOverride()
        logout()
        toast.success(t('loggedOut'))
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={accountLabel} className="rounded-full">
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
                        {canAccessDashboard && (
                            <DropdownMenuItem asChild>
                                <Link href={ROUTE.DASHBOARD}>
                                    <LayoutGridIcon aria-hidden />
                                    {t('dashboard')}
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleOpenAccount('profile')}>
                            <UserIcon aria-hidden />
                            {t('myProfile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenAccount('orders')}>
                            <PackageIcon aria-hidden />
                            {t('myOrders')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenAccount('vouchers')}>
                            <TicketIcon aria-hidden />
                            {t('myVouchers')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenAccount('wishlist')}>
                            <HeartIcon aria-hidden />
                            {t('myWishlist')}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogOut} disabled={isPending}>
                        <LogOutIcon aria-hidden />
                        {t('logOut')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AccountDialog open={isAccountOpen} onOpenChange={handleAccountOpenChange} defaultTab={accountTab} />
        </>
    )
}
