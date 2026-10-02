'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { ArrowRightIcon, BellIcon, LayoutGridIcon, ShieldCheckIcon, SparklesIcon, UserIcon } from 'lucide-react'

import { UserAvatar } from '@/components/common'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { DASHBOARD_PERMISSION, ROUTE } from '@/constants'
import { usePermissions } from '@/hooks'
import { useUserProfileStore } from '@/stores'

// Trang chủ độc lập cho người dùng — hiển thị khi đăng nhập thành công.
// Bố cục toàn màn hình với thanh AppBar ở trên, không bọc trong sidebar.
// Người dùng thông thường sử dụng trang chủ làm nơi quản lý tài khoản cá nhân và trải nghiệm dịch vụ.
// Quản trị viên (ADMIN+) có thêm lối tắt vào Bảng điều khiển (Dashboard).
export function HomePage() {
    // ===== Hooks =====
    const t = useTranslations('home')
    const tNav = useTranslations('nav')
    const { data: session } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { hasPermission } = usePermissions()
    const profileOverride = useUserProfileStore((state) => state.override)

    // ===== Derived =====
    const canAccessDashboard = hasPermission(DASHBOARD_PERMISSION)
    const email = session?.user?.email ?? ''
    const displayName = profileOverride?.displayName || session?.user?.name || (email ? email.split('@')[0] : '')
    const avatar = profileOverride?.avatar !== undefined ? profileOverride.avatar : session?.user?.image

    // ===== Handlers =====
    const openAccountModal = useCallback(
        (tab?: string) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('modal', 'account')
            if (tab) params.set('tab', tab)
            router.push(`?${params.toString()}`, { scroll: false })
        },
        [router, searchParams],
    )

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
            {/* Hero Banner */}
            <div className="relative mb-10 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-muted/40 p-6 sm:p-10 shadow-sm">
                <div className="relative z-10 max-w-2xl space-y-3">
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-medium">
                        <SparklesIcon className="size-3.5 text-primary" />
                        TimmyHub Platform
                    </Badge>
                    <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                        {t('welcomeHeroTitle')}
                    </h1>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                        {t('welcomeHeroSubtitle')}
                    </p>
                </div>

                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl"
                />
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Account Card */}
                <Card className="flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-primary/40">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <UserAvatar name={displayName} imageUrl={avatar} className="size-11" />
                            <div className="min-w-0 flex-1">
                                <CardTitle className="truncate text-base font-semibold">{displayName}</CardTitle>
                                <CardDescription className="truncate text-xs">{email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('accountCardDescription')}</p>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => openAccountModal('profile')}
                        >
                            <span className="flex items-center gap-2">
                                <UserIcon className="size-4" />
                                {t('manageAccount')}
                            </span>
                            <ArrowRightIcon className="size-4 text-muted-foreground" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Dashboard Card - Only shown if user has permission */}
                {canAccessDashboard && (
                    <Card className="flex flex-col justify-between border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card transition-all duration-200 hover:shadow-md hover:border-primary">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                    <LayoutGridIcon className="size-5" />
                                </div>
                                <Badge variant="default" className="text-xs">
                                    Quản trị
                                </Badge>
                            </div>
                            <CardTitle className="text-base font-semibold pt-2">{t('dashboardCardTitle')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{t('dashboardCardDescription')}</p>
                            <Button asChild className="w-full justify-between">
                                <Link href={ROUTE.DASHBOARD}>
                                    <span className="flex items-center gap-2">
                                        <LayoutGridIcon className="size-4" />
                                        {t('goToDashboard')}
                                    </span>
                                    <ArrowRightIcon className="size-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Security Card */}
                <Card className="flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-primary/40">
                    <CardHeader>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                            <ShieldCheckIcon className="size-5 text-primary" />
                        </div>
                        <CardTitle className="text-base font-semibold pt-2">{t('securityCardTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('securityCardDescription')}</p>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => openAccountModal('security')}
                        >
                            <span className="flex items-center gap-2">
                                <ShieldCheckIcon className="size-4" />
                                {tNav('account')}
                            </span>
                            <ArrowRightIcon className="size-4 text-muted-foreground" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Notifications Card */}
                <Card className="flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-primary/40">
                    <CardHeader>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                            <BellIcon className="size-5 text-primary" />
                        </div>
                        <CardTitle className="text-base font-semibold pt-2">{t('notificationsCardTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t('notificationsCardDescription')}</p>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => openAccountModal('notifications')}
                        >
                            <span className="flex items-center gap-2">
                                <BellIcon className="size-4" />
                                {tNav('notifications')}
                            </span>
                            <ArrowRightIcon className="size-4 text-muted-foreground" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
