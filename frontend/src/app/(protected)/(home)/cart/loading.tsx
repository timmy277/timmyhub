import { CheckCircle2Icon, ChevronRightIcon, HomeIcon, ShieldCheckIcon, StoreIcon, TruckIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui'

export default function CartLoading() {
    return (
        <div className="relative min-h-screen w-full pb-20">
            {/* Top Breadcrumb & Header Banner */}
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
                            <span className="font-medium text-foreground">Giỏ hàng</span>
                        </nav>
                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            <TruckIcon className="size-3.5 shrink-0" />
                            <span>Đơn hàng của bạn đủ điều kiện nhận Freeship 0Đ toàn quốc!</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Cart Content */}
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
                            Giỏ hàng của bạn
                        </h1>
                        <Skeleton className="h-6 w-9 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-32 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Cart Items Table Skeleton */}
                    <div className="lg:col-span-8 space-y-5">
                        {/* Table Header Bar */}
                        <div className="hidden sm:grid grid-cols-12 items-center gap-4 rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md px-5 py-3.5 text-xs font-bold text-muted-foreground shadow-xs">
                            <div className="col-span-6 flex items-center gap-3">
                                <Skeleton className="size-4 rounded-md" />
                                <span className="text-foreground">Chọn tất cả</span>
                            </div>
                            <div className="col-span-2 text-center">Đơn giá</div>
                            <div className="col-span-2 text-center">Số lượng</div>
                            <div className="col-span-2 text-right">Thành tiền</div>
                        </div>

                        {/* Shop Group Skeleton */}
                        <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md overflow-hidden shadow-sm">
                            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-5 py-3">
                                <Skeleton className="size-4 rounded-md" />
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                    <StoreIcon className="size-4 text-primary" />
                                    <Skeleton className="h-4 w-28 rounded-md" />
                                </div>
                            </div>

                            <div className="divide-y divide-border/60">
                                {/* Item Row 1 */}
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                        <div className="sm:col-span-6 flex items-start gap-3">
                                            <Skeleton className="size-4 rounded-md mt-1" />
                                            <Skeleton className="size-16 sm:size-20 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-4/5 rounded-md" />
                                                <Skeleton className="h-3 w-1/3 rounded-md" />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 text-left sm:text-center">
                                            <Skeleton className="h-4 w-20 rounded-md sm:mx-auto" />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center sm:justify-center">
                                            <Skeleton className="h-8 w-24 rounded-xl" />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3">
                                            <Skeleton className="h-4 w-20 rounded-md" />
                                            <Skeleton className="size-7 rounded-lg" />
                                        </div>
                                    </div>
                                </div>

                                {/* Item Row 2 */}
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                        <div className="sm:col-span-6 flex items-start gap-3">
                                            <Skeleton className="size-4 rounded-md mt-1" />
                                            <Skeleton className="size-16 sm:size-20 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-3/4 rounded-md" />
                                                <Skeleton className="h-3 w-2/5 rounded-md" />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 text-left sm:text-center">
                                            <Skeleton className="h-4 w-20 rounded-md sm:mx-auto" />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center sm:justify-center">
                                            <Skeleton className="h-8 w-24 rounded-xl" />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3">
                                            <Skeleton className="h-4 w-20 rounded-md" />
                                            <Skeleton className="size-7 rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Sticky Order Summary & Trust Guarantee */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">
                        {/* Order Summary Card */}
                        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-6 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-foreground font-heading">Tóm tắt đơn hàng</h2>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Sản phẩm đã chọn</span>
                                    <Skeleton className="h-4 w-8 rounded-md" />
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Tổng tiền hàng</span>
                                    <Skeleton className="h-4 w-24 rounded-md" />
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Phí vận chuyển</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Miễn phí</span>
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
                                    <span>Bảo vệ thanh toán 100% đến khi nhận hàng</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                    <CheckCircle2Icon className="size-3 text-primary shrink-0" />
                                    <span>Đổi trả miễn phí trong 7 ngày nếu lỗi</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
