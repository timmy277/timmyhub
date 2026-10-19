'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    BellIcon,
    CalendarIcon,
    CheckCircle2Icon,
    HeartIcon,
    LockIcon,
    MapPinIcon,
    PackageIcon,
    ShieldCheckIcon,
    TicketIcon,
    UserIcon,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import type { UserDetail, UserRole } from '@timmyhub/contracts'

import { UserAvatar } from '@/components/common'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { DASHBOARD_PERMISSION, QUERY_KEY, ROLE_LABEL_KEY } from '@/constants'
import { getCurrentUserDetailAction } from '@/features/users'
import { usePermissions } from '@/hooks'
import { useUserProfileStore } from '@/stores'

import { AddressesTab } from './addresses-tab'
import { NotificationsTab } from './notifications-tab'
import { OrdersTab } from './orders-tab'
import { ProfileTab } from './profile-tab'
import { SecurityTab } from './security-tab'
import { VouchersTab } from './vouchers-tab'
import { WishlistTab } from './wishlist-tab'

type TabKey = 'profile' | 'orders' | 'vouchers' | 'wishlist' | 'security' | 'addresses' | 'notifications'

const VALID_TABS: readonly TabKey[] = [
    'profile',
    'orders',
    'vouchers',
    'wishlist',
    'security',
    'addresses',
    'notifications',
] as const

function isValidAccountTab(tab: string | null): tab is TabKey {
    return Boolean(tab && (VALID_TABS as readonly string[]).includes(tab))
}

const NAV_ITEMS: {
    key: TabKey
    labelKey:
        | 'tabs.profile'
        | 'tabs.orders'
        | 'tabs.vouchers'
        | 'tabs.wishlist'
        | 'tabs.security'
        | 'tabs.addresses'
        | 'tabs.notifications'
    icon: React.ComponentType<{ className?: string }>
}[] = [
    { key: 'profile', labelKey: 'tabs.profile', icon: UserIcon },
    { key: 'orders', labelKey: 'tabs.orders', icon: PackageIcon },
    { key: 'vouchers', labelKey: 'tabs.vouchers', icon: TicketIcon },
    { key: 'wishlist', labelKey: 'tabs.wishlist', icon: HeartIcon },
    { key: 'security', labelKey: 'tabs.security', icon: ShieldCheckIcon },
    { key: 'addresses', labelKey: 'tabs.addresses', icon: MapPinIcon },
    { key: 'notifications', labelKey: 'tabs.notifications', icon: BellIcon },
]

export interface AccountShellProps {
    initialUser?: UserDetail | null
}

export function AccountShell({ initialUser }: AccountShellProps = {}) {
    const t = useTranslations('account')
    const tCommon = useTranslations('common')
    const tRole = useTranslations('role')
    const locale = useLocale()
    const { data: session } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const profileOverride = useUserProfileStore((state) => state.override)
    const { hasPermission } = usePermissions()
    const {
        data: user,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.USERS.ME,
        queryFn: () => getCurrentUserDetailAction(),
        initialData: initialUser ?? undefined,
        staleTime: 30_000,
        enabled: Boolean(session?.user?.id),
    })

    const isAdmin =
        hasPermission(DASHBOARD_PERMISSION) || (user?.roles ?? []).some((r) => r === 'SUPER_ADMIN' || r === 'ADMIN')

    const navItems = useMemo(() => {
        if (isAdmin) {
            return NAV_ITEMS.filter(
                (item) =>
                    item.key !== 'orders' &&
                    item.key !== 'addresses' &&
                    item.key !== 'vouchers' &&
                    item.key !== 'wishlist',
            )
        }
        return NAV_ITEMS
    }, [isAdmin])

    const queryTab = searchParams.get('tab')
    const rawTab: TabKey = isValidAccountTab(queryTab) ? queryTab : 'profile'
    const activeTab: TabKey =
        isAdmin && (rawTab === 'orders' || rawTab === 'addresses' || rawTab === 'vouchers' || rawTab === 'wishlist')
            ? 'profile'
            : rawTab

    const handleTabChange = (key: TabKey) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', key)
        params.delete('orderId')
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-44 w-full rounded-2xl" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <Skeleton className="h-64 rounded-xl lg:col-span-1" />
                    <Skeleton className="h-96 rounded-xl lg:col-span-3" />
                </div>
            </div>
        )
    }

    if (isError || !user) {
        return (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <LockIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{t('errorLoadTitle')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t('errorLoadDescription')}</p>
                <Button size="sm" onClick={() => refetch()} className="mt-4">
                    {tCommon('retry')}
                </Button>
            </Card>
        )
    }

    const currentDisplayName =
        profileOverride?.displayName ||
        user.profile?.displayName ||
        (user.profile ? `${user.profile.lastName} ${user.profile.firstName}`.trim() : null) ||
        (user.email ? user.email.split('@')[0] : '') ||
        'User'
    const currentAvatar =
        profileOverride?.avatar !== undefined ? profileOverride.avatar : (user.profile?.avatar ?? null)
    const formattedCreatedAt = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
              month: 'long',
              year: 'numeric',
          })
        : ''

    return (
        <div className="space-y-6 pb-12">
            {/* Hero Profile Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <UserAvatar
                                name={currentDisplayName}
                                imageUrl={currentAvatar}
                                className="h-18 w-18 ring-3 ring-primary/20 shadow-md text-xl"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 shadow-xs">
                                <span className="flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    {currentDisplayName}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="text-[11px] gap-1 py-0.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                >
                                    <CheckCircle2Icon className="h-3 w-3" />
                                    {t('profile.emailVerified')}
                                </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground">{user.email}</p>

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                                {formattedCreatedAt && (
                                    <div className="flex items-center gap-1">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        <span>{t('memberSince', { date: formattedCreatedAt })}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    {(user.roles ?? []).map((role: string) => {
                                        const roleKey = ROLE_LABEL_KEY[role as UserRole]
                                        const label =
                                            roleKey && tRole.has(roleKey)
                                                ? tRole(roleKey)
                                                : tRole.has(role)
                                                  ? tRole(role)
                                                  : role
                                        return (
                                            <Badge
                                                key={role}
                                                variant="secondary"
                                                className="text-[10px] font-semibold tracking-wider py-0 px-2"
                                            >
                                                {label}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Settings Navigation & Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                {/* Desktop & Mobile Navigation */}
                <div className="lg:col-span-1">
                    {/* Mobile Horizontal Tabs */}
                    <div className="flex overflow-x-auto gap-1 pb-2 sm:hidden border-b border-border/60">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = activeTab === item.key
                            return (
                                <Button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleTabChange(item.key)}
                                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                    variant="ghost"
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{t(item.labelKey)}</span>
                                </Button>
                            )
                        })}
                    </div>

                    {/* Desktop Vertical Menu */}
                    <div className="hidden sm:block space-y-1 rounded-xl border border-border/80 bg-card p-2 shadow-xs">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = activeTab === item.key
                            return (
                                <Button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleTabChange(item.key)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-all ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                    variant="ghost"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{t(item.labelKey)}</span>
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    {activeTab === 'profile' && <ProfileTab user={user} onProfileUpdated={() => refetch()} />}
                    {!isAdmin && activeTab === 'orders' && <OrdersTab />}
                    {!isAdmin && activeTab === 'vouchers' && <VouchersTab />}
                    {!isAdmin && activeTab === 'wishlist' && <WishlistTab />}
                    {activeTab === 'security' && <SecurityTab user={user} />}
                    {!isAdmin && activeTab === 'addresses' && <AddressesTab />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                </div>
            </div>
        </div>
    )
}
