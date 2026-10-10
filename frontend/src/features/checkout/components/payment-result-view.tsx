'use client'

import Link from 'next/link'
import {
    AlertCircleIcon,
    ArrowRightIcon,
    CheckCircle2Icon,
    HomeIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
} from 'lucide-react'

import { Badge, Button, Card } from '@/components/ui'
import { ROUTE } from '@/constants'

interface PaymentResultViewProps {
    success: boolean
    orderId?: string
    message?: string
    code?: string
}

export function PaymentResultView({ success, orderId = '', message = '', code = '' }: PaymentResultViewProps) {
    const displayOrderId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''

    const getCodeDescription = (c: string) => {
        switch (c) {
            case '00':
                return 'Giao dịch thành công'
            case '07':
                return 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).'
            case '09':
                return 'Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.'
            case '10':
                return 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.'
            case '11':
                return 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.'
            case '12':
                return 'Thẻ/Tài khoản của khách hàng bị khóa.'
            case '13':
                return 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).'
            case '24':
                return 'Khách hàng đã hủy giao dịch.'
            case '51':
                return 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.'
            case '65':
                return 'Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.'
            case '75':
                return 'Ngân hàng thanh toán đang bảo trì.'
            default:
                return ''
        }
    }

    const codeDesc = code ? getCodeDescription(code) : ''

    return (
        <div className="relative min-h-[80vh] w-full px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl space-y-8">
                {/* 1. Header Icon & Status */}
                <div className="text-center space-y-4">
                    {success ? (
                        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                            <CheckCircle2Icon className="size-10 stroke-[2.5]" />
                        </div>
                    ) : (
                        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                            <AlertCircleIcon className="size-10 stroke-[2.5]" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            {success ? 'Thanh toán VNPay thành công!' : 'Thanh toán chưa hoàn tất'}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            {message ||
                                (success
                                    ? 'Cảm ơn bạn. Giao dịch thanh toán qua cổng VNPay đã được ghi nhận thành công.'
                                    : 'Giao dịch qua cổng VNPay chưa được hoàn tất hoặc đã bị huỷ bởi người dùng.')}
                        </p>
                    </div>

                    {displayOrderId ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs">
                            <span className="text-muted-foreground">Mã đơn hàng:</span>
                            <span className="font-mono font-bold text-foreground">{displayOrderId}</span>
                        </div>
                    ) : null}
                </div>

                {/* 2. Chi tiết kết quả */}
                <Card className="rounded-2xl border border-border/80 p-5 sm:p-6 bg-card space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                        <span className="text-xs font-semibold text-muted-foreground">Phương thức thanh toán:</span>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                            <span className="text-blue-600 font-extrabold">VNPAY</span>
                            <span>(Cổng thanh toán điện tử)</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                        <span className="text-xs font-semibold text-muted-foreground">Trạng thái giao dịch:</span>
                        <Badge
                            variant={success ? 'secondary' : 'outline'}
                            className={
                                success
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-bold'
                            }
                        >
                            {success ? 'Thành công' : 'Chưa thanh toán'}
                        </Badge>
                    </div>

                    {code ? (
                        <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Mã phản hồi VNPay:</span>
                                <span className="font-mono font-bold text-foreground">{code}</span>
                            </div>
                            {codeDesc ? (
                                <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg leading-relaxed">
                                    {codeDesc}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    {!success ? (
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground">Lưu ý về đơn hàng:</p>
                            <p className="leading-relaxed">
                                Đơn hàng của bạn đã được ghi nhận trong hệ thống ở trạng thái{' '}
                                <strong className="text-foreground">Chờ thanh toán</strong>. Bạn có thể xem lại đơn hàng
                                trong mục Quản lý đơn hàng.
                            </p>
                        </div>
                    ) : null}
                </Card>

                {/* 3. Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2"
                    >
                        <Link href={ROUTE.HOME}>
                            <HomeIcon className="size-4" />
                            Tiếp tục mua sắm
                        </Link>
                    </Button>

                    {!success ? (
                        <Button
                            asChild
                            variant="secondary"
                            size="lg"
                            className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2"
                        >
                            <Link href={ROUTE.CART}>
                                <ShoppingCartIcon className="size-4" />
                                Về giỏ hàng
                            </Link>
                        </Button>
                    ) : null}

                    {orderId ? (
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <Link href={ROUTE.ORDER_DETAIL(orderId)}>
                                <ShoppingBagIcon className="size-4" />
                                Xem chi tiết đơn hàng
                                <ArrowRightIcon className="size-4" />
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <Link href={ROUTE.ORDERS}>
                                <ShoppingBagIcon className="size-4" />
                                Xem danh sách đơn hàng
                                <ArrowRightIcon className="size-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
