import { Suspense } from 'react'
import Link from 'next/link'
import { LayoutGridIcon, StoreIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import {
    LocaleSwitcher,
    MessageMenu,
    NotificationMenu,
    ThemeMenu,
    ThemeModeToggle,
    UserMenu,
} from '@/components/common'
import { Button, Skeleton } from '@/components/ui'
import { DASHBOARD_PERMISSION, ROUTE, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'
import { CartButton } from './cart-button'

// AppBar độc lập trên trang chủ — không bị bọc trong sidebar.
// Hiển thị logo TimmyHub, các công cụ đổi theme/ngôn ngữ, thông báo, menu tài khoản.
// Luôn hiển thị nút vào Kênh Người Bán / Đăng ký bán hàng cho người dùng,
// và nếu tài khoản có quyền vào dashboard (ADMIN+), hiển thị thêm nút Dashboard.
export async function HomeHeader() {
    const t = await getTranslations('nav')
    const actor = await getActor()
    const canAccessDashboard = actor?.permissions.has(DASHBOARD_PERMISSION) ?? false
    const isSellerByPermission = !canAccessDashboard && (actor?.permissions.has(SELLER_SHOP_PERMISSION) ?? false)
    let isSeller = isSellerByPermission
    if (!isSeller && !canAccessDashboard && actor) {
        const shopRes = await getMyShopAction()
        if (shopRes.ok && Boolean(shopRes.data)) {
            isSeller = true
        }
    }
    const sellerRoute = isSeller ? ROUTE.SELLER_PORTAL : ROUTE.SELLER_REGISTER
    const sellerLabel = isSeller ? t('sellerPortal') : t('becomeSeller')

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 sm:px-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <Link
                    href={canAccessDashboard ? ROUTE.DASHBOARD : ROUTE.HOME}
                    className="flex items-center gap-2.5 font-bold text-base sm:text-lg transition-opacity hover:opacity-90"
                >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">
                        T
                    </div>
                    <span className="tracking-tight">{t('brand')}</span>
                </Link>

                {!canAccessDashboard && (
                    <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5 h-8">
                        <Link href={sellerRoute}>
                            <StoreIcon className="size-3.5 text-muted-foreground" />
                            <span>{sellerLabel}</span>
                        </Link>
                    </Button>
                )}

                {canAccessDashboard && (
                    <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 h-8">
                        <Link href={ROUTE.DASHBOARD}>
                            <LayoutGridIcon className="size-3.5" />
                            <span>{t('dashboard')}</span>
                        </Link>
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
                <LocaleSwitcher />
                <ThemeMenu />
                <ThemeModeToggle />
                <MessageMenu />
                <NotificationMenu />
                <CartButton />
                <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
                    <UserMenu />
                </Suspense>
            </div>
        </header>
    )
}
