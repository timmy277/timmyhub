import {
    CheckCircle2Icon,
    ChevronRightIcon,
    CreditCardIcon,
    HomeIcon,
    LockIcon,
    MapPinIcon,
    ShieldCheckIcon,
    StoreIcon,
    TruckIcon,
} from 'lucide-react'

import { Skeleton } from '@/components/ui'

export default function CheckoutLoading() {
    return (
        <div className="relative min-h-screen w-full pb-20">
            {/* Top Breadcrumb & Trust Banner */}
            <div className="border-b border-border/60 bg-card/60 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <nav
                            aria-label="Breadcrumb"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                            <div className="flex items-center gap-1.5">
                                <HomeIcon className="size-3.5 text-primary" />
                                <span>Trang chủ</span>
                            </div>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <span>Giỏ hàng</span>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <span className="font-medium text-foreground">Thanh toán</span>
                        </nav>
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            <LockIcon className="size-3.5 shrink-0" />
                            <span>Thanh toán bảo mật & Mã hóa SSL 256-bit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Checkout Content */}
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
                        Thanh toán đơn hàng
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Address, Products & Payment */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* 1. Address Card Skeleton */}
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md overflow-hidden shadow-sm">
                            {/* Shopee envelope border stripe */}
                            <div className="h-1 w-full bg-gradient-to-r from-destructive/60 via-primary/60 to-destructive/60" />

                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                        <MapPinIcon className="size-4" />
                                        <span>Địa chỉ nhận hàng</span>
                                    </div>
                                    <Skeleton className="h-8 w-24 rounded-xl" />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-28 rounded-md" />
                                        <Skeleton className="h-5 w-24 rounded-md" />
                                        <Skeleton className="h-5 w-16 rounded-md" />
                                    </div>
                                    <Skeleton className="h-4 w-64 rounded-md" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Products Breakdown Skeleton */}
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md overflow-hidden shadow-sm">
                            {/* Shop Header */}
                            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-5 py-3.5 text-xs font-bold text-foreground">
                                <StoreIcon className="size-4 text-primary" />
                                <Skeleton className="h-4 w-32 rounded-md" />
                            </div>

                            <div className="p-5 space-y-4 divide-y divide-border/60">
                                {/* Item 1 */}
                                <div className="flex items-start gap-4 pt-1 first:pt-0">
                                    <Skeleton className="size-16 sm:size-20 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4 rounded-md" />
                                        <Skeleton className="h-3 w-1/3 rounded-md" />
                                        <div className="flex items-center justify-between pt-1">
                                            <Skeleton className="h-4 w-12 rounded-md" />
                                            <Skeleton className="h-4 w-24 rounded-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* Item 2 */}
                                <div className="flex items-start gap-4 pt-4">
                                    <Skeleton className="size-16 sm:size-20 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3 rounded-md" />
                                        <Skeleton className="h-3 w-1/4 rounded-md" />
                                        <div className="flex items-center justify-between pt-1">
                                            <Skeleton className="h-4 w-12 rounded-md" />
                                            <Skeleton className="h-4 w-24 rounded-md" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Shop Footer / Note & Shipping */}
                            <div className="border-t border-border/60 bg-muted/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 flex-1">
                                    <Skeleton className="h-9 w-full max-w-sm rounded-xl" />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <TruckIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                                    <Skeleton className="h-4 w-36 rounded-md" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Payment Method Card Skeleton */}
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                <CreditCardIcon className="size-4 text-primary" />
                                <span>Phương thức thanh toán</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Skeleton className="h-20 w-full rounded-2xl" />
                                <Skeleton className="h-20 w-full rounded-2xl" />
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary (Sticky) */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-6 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-foreground font-heading">Tóm tắt đơn hàng</h2>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Tổng tiền hàng</span>
                                    <Skeleton className="h-4 w-24 rounded-md" />
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Phí vận chuyển</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Miễn phí</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Giảm giá vận chuyển</span>
                                    <Skeleton className="h-4 w-16 rounded-md" />
                                </div>

                                <div className="border-t border-border/60 pt-3 flex items-baseline justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-foreground">Tổng thanh toán</p>
                                        <p className="text-[10px] text-muted-foreground">(Đã bao gồm VAT nếu có)</p>
                                    </div>
                                    <div className="text-right">
                                        <Skeleton className="h-7 w-28 rounded-lg" />
                                    </div>
                                </div>
                            </div>

                            <Skeleton className="w-full h-12 rounded-2xl" />
                        </div>

                        {/* Trust Guarantee Box */}
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-2.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 text-foreground font-semibold">
                                <ShieldCheckIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                                <span>Cam kết mua sắm an tâm tại TimmyHub</span>
                            </div>
                            <div className="space-y-1.5 text-[11px] pl-6">
                                <p className="flex items-center gap-1.5">
                                    <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                    <span>Bảo vệ quyền lợi người mua 100%</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                    <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                    <span>Đổi trả miễn phí trong 7 ngày</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
