'use client'

import { useQuery } from '@tanstack/react-query'
import { BellIcon, CalendarIcon, LockIcon, MapPinIcon, PackageIcon, ShieldCheckIcon, UserIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { UserAvatar } from '@/components/common'
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Skeleton,
} from '@/components/ui'
import { QUERY_KEY } from '@/constants'
import { getCurrentUserDetailAction } from '@/features/users'
import { useUserProfileStore } from '@/stores'

import { AddressesTab } from './addresses-tab'
import { NotificationsTab } from './notifications-tab'
import { OrdersTab } from './orders-tab'
import { ProfileTab } from './profile-tab'
import { SecurityTab } from './security-tab'

export type AccountTabKey = 'profile' | 'orders' | 'security' | 'addresses' | 'notifications'

const VALID_TABS: readonly AccountTabKey[] = ['profile', 'orders', 'security', 'addresses', 'notifications'] as const

function isValidAccountTab(tab: string | null): tab is AccountTabKey {
    return Boolean(tab && (VALID_TABS as readonly string[]).includes(tab))
}

const NAV_ITEMS: {
    key: AccountTabKey
    labelKey: 'tabs.profile' | 'tabs.orders' | 'tabs.security' | 'tabs.addresses' | 'tabs.notifications'
    icon: React.ComponentType<{ className?: string }>
}[] = [
    { key: 'profile', labelKey: 'tabs.profile', icon: UserIcon },
    { key: 'orders', labelKey: 'tabs.orders', icon: PackageIcon },
    { key: 'security', labelKey: 'tabs.security', icon: ShieldCheckIcon },
    { key: 'addresses', labelKey: 'tabs.addresses', icon: MapPinIcon },
    { key: 'notifications', labelKey: 'tabs.notifications', icon: BellIcon },
]

interface AccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: AccountTabKey
}

export function AccountDialog({ open, onOpenChange, defaultTab = 'profile' }: AccountDialogProps) {
    const t = useTranslations('account')
    const tCommon = useTranslations('common')
    const { data: session } = useSession()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const profileOverride = useUserProfileStore((state) => state.override)

    const queryTab = searchParams.get('tab')
    const activeTab: AccountTabKey = isValidAccountTab(queryTab) ? queryTab : defaultTab

    const handleTabChange = (key: AccountTabKey) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('modal', 'account')
        params.set('tab', key)
        params.delete('orderId')
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const {
        data: user,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.USERS.ME,
        queryFn: () => getCurrentUserDetailAction(),
        staleTime: 30_000,
        enabled: Boolean(session?.user?.id) && open,
    })

    const currentDisplayName =
        profileOverride?.displayName ||
        user?.profile?.displayName ||
        (user?.profile ? `${user.profile.lastName} ${user.profile.firstName}`.trim() : null) ||
        (user?.email ? user.email.split('@')[0] : '') ||
        session?.user?.name ||
        'User'
    const currentAvatar =
        profileOverride?.avatar !== undefined
            ? profileOverride.avatar
            : (user?.profile?.avatar ?? session?.user?.image ?? null)
    const formattedCreatedAt = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
              month: 'long',
              year: 'numeric',
          })
        : ''

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 gap-0 overflow-hidden h-[85vh] max-h-[800px] flex flex-col">
                <DialogHeader className="px-6 py-4 pr-12 border-b border-border/80 bg-muted/20 shrink-0">
                    <DialogTitle className="text-lg font-bold">{t('dialogTitle')}</DialogTitle>
                    <DialogDescription className="text-xs">{t('dialogDescription')}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 p-6 space-y-4">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-64">
                            <Skeleton className="h-full rounded-xl md:col-span-1" />
                            <Skeleton className="h-full rounded-xl md:col-span-3" />
                        </div>
                    </div>
                ) : isError || !user ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <LockIcon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold">{t('errorLoadTitle')}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{t('errorLoadDescription')}</p>
                        <Button size="sm" onClick={() => refetch()} className="mt-4">
                            {tCommon('retry')}
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Sidebar Left */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/80 bg-muted/10 p-4 flex flex-col gap-4 shrink-0">
                            {/* User Quick Info */}
                            <div className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl bg-card border border-border/60 shadow-2xs text-center">
                                <UserAvatar
                                    name={currentDisplayName}
                                    imageUrl={currentAvatar}
                                    className="h-16 w-16 ring-2 ring-primary/20 text-lg"
                                />
                                <div className="min-w-0 w-full">
                                    <p className="truncate text-xs font-semibold text-foreground">
                                        {currentDisplayName}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                                </div>
                            </div>

                            {/* Navigation List */}
                            <div className="flex md:flex-col overflow-x-auto gap-1">
                                {NAV_ITEMS.map((item) => {
                                    const Icon = item.icon
                                    const isActive = activeTab === item.key
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => handleTabChange(item.key)}
                                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left whitespace-nowrap ${
                                                isActive
                                                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span>{t(item.labelKey)}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Account Status Meta */}
                            <div className="hidden md:flex flex-col gap-1.5 mt-auto pt-4 border-t border-border/60 text-[11px] text-muted-foreground">
                                {formattedCreatedAt && (
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="h-3 w-3" />
                                        <span>{t('memberSince', { date: formattedCreatedAt })}</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {(user.roles ?? []).map((role) => (
                                        <Badge
                                            key={role}
                                            variant="secondary"
                                            className="text-[9px] font-semibold uppercase tracking-wider py-0 px-1.5"
                                        >
                                            {role}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Content Right */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'profile' && <ProfileTab user={user} onProfileUpdated={() => refetch()} />}
                            {activeTab === 'orders' && <OrdersTab onCloseDialog={() => onOpenChange(false)} />}
                            {activeTab === 'security' && <SecurityTab user={user} />}
                            {activeTab === 'addresses' && <AddressesTab />}
                            {activeTab === 'notifications' && <NotificationsTab />}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
