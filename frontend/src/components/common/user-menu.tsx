'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { BadgeCheckIcon, LayoutGridIcon, LogOutIcon, PackageIcon, StoreIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { DASHBOARD_PERMISSION, QUERY_KEY, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
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

    const { data: session } = useSession()
    const { mutate: logout, isPending } = useLogout()
    const profileOverride = useUserProfileStore((state) => state.override)

    const { hasPermission } = usePermissions()
    const canAccessDashboard = hasPermission(DASHBOARD_PERMISSION)
    const isSeller = !canAccessDashboard && hasPermission(SELLER_SHOP_PERMISSION)
    const sellerRoute = isSeller ? ROUTE.SELLER_PORTAL : ROUTE.SELLER_REGISTER
    const sellerLabel = isSeller ? t('sellerPortal') : t('becomeSeller')

    // Tự động tải profile thực tế từ backend; query key 'users' sẽ tự invalidate khi có mutation sửa user
    const { data: backendProfile } = useQuery({
        queryKey: QUERY_KEY.USERS.NAVBAR_PROFILE,
        queryFn: () => getCurrentUserProfileAction(),
        staleTime: 30_000,
        enabled: Boolean(session?.user?.id),
    })

    // ===== Derived =====
    const email = isMounted ? (session?.user?.email ?? '') : ''
    const username = isMounted
        ? profileOverride?.displayName ||
          backendProfile?.displayName ||
          session?.user?.name ||
          (email ? email.split('@')[0] : '') ||
          t('account')
        : t('account')
    const avatar = isMounted
        ? profileOverride?.avatar !== undefined
            ? profileOverride.avatar
            : backendProfile?.avatar !== undefined
              ? backendProfile.avatar
              : session?.user?.image
        : undefined

    // ===== Handlers =====
    const router = useRouter()
    const searchParams = useSearchParams()
    const isAccountOpen = searchParams.get('modal') === 'account'
    const accountTab = (searchParams.get('tab') as AccountTabKey) || 'profile'

    const handleOpenAccount = useCallback(
        (tab: AccountTabKey = 'profile') => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('modal', 'account')
            params.set('tab', tab)
            router.push(`?${params.toString()}`, { scroll: false })
        },
        [router, searchParams],
    )

    const handleAccountOpenChange = useCallback(
        (open: boolean) => {
            const params = new URLSearchParams(searchParams.toString())
            if (open) {
                params.set('modal', 'account')
            } else {
                params.delete('modal')
                params.delete('tab')
            }
            router.push(`?${params.toString()}`, { scroll: false })
        },
        [router, searchParams],
    )

    const handleLogOut = () => {
        useUserProfileStore.getState().clearOverride()
        logout()
        toast.success(t('loggedOut'))
    }

    const initials = isMounted && username ? getInitials(username) : ''
    const accountLabel = initials ? `${initials} - ${t('account')}` : t('account')

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
                        {!canAccessDashboard && (
                            <DropdownMenuItem asChild>
                                <Link href={sellerRoute}>
                                    <StoreIcon aria-hidden />
                                    {sellerLabel}
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {canAccessDashboard && (
                            <DropdownMenuItem asChild>
                                <Link href={ROUTE.DASHBOARD}>
                                    <LayoutGridIcon aria-hidden />
                                    {t('dashboard')}
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleOpenAccount('orders')}>
                            <PackageIcon aria-hidden />
                            {t('myOrders')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenAccount('profile')}>
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

            <AccountDialog open={isAccountOpen} onOpenChange={handleAccountOpenChange} defaultTab={accountTab} />
        </>
    )
}
