'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ChevronRightIcon,
    HeadphonesIcon,
    MailIcon,
    MapPinIcon,
    PhoneIcon,
    ShieldCheckIcon,
    StoreIcon,
    TruckIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { IconPath } from '@/components/icons'
import { Badge, Button, Input } from '@/components/ui'
import { ROUTE } from '@/constants'

const FOOTER_LINKS = {
    about: [
        { label: 'Giới thiệu về TimmyHub', href: '#' },
        { label: 'Tuyển dụng & Việc làm', href: '#' },
        { label: 'Điều khoản sử dụng', href: '#' },
        { label: 'Chính sách bảo mật', href: '#' },
        { label: 'Kênh người bán (Seller)', href: ROUTE.SELLER_PORTAL },
        { label: 'Chương trình Affiliate', href: '#' },
    ],
    support: [
        { label: 'Trung tâm trợ giúp (FAQ)', href: '#' },
        { label: 'Hướng dẫn mua hàng', href: '#' },
        { label: 'Chính sách đổi trả 7 ngày', href: '#' },
        { label: 'Chính sách bảo hành', href: '#' },
        { label: 'Vận chuyển & Giao nhận', href: '#' },
        { label: 'Tra cứu đơn hàng', href: '#' },
    ],
    payments: [
        { name: 'Visa', badge: 'VISA' },
        { name: 'MasterCard', badge: 'MC' },
        { name: 'JCB', badge: 'JCB' },
        { name: 'MoMo', badge: 'MOMO' },
        { name: 'ZaloPay', badge: 'ZALOPAY' },
        { name: 'VNPay', badge: 'VNPAY' },
        { name: 'COD', badge: 'TIỀN MẶT' },
    ],
    shipping: [
        { name: 'Hỏa tốc 2H', icon: '⚡' },
        { name: 'Giao Hàng Nhanh', icon: '🚚' },
        { name: 'Viettel Post', icon: '📦' },
        { name: 'Shopee Express', icon: '🛵' },
        { name: 'J&T Express', icon: '🚛' },
    ],
}

export function HomeFooter() {
    const [email, setEmail] = useState('')

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !email.includes('@')) {
            toast.error('Vui lòng nhập địa chỉ email hợp lệ')
            return
        }
        toast.success('Đăng ký nhận bản tin thành công!', {
            description: 'TimmyHub sẽ gửi các mã giảm giá độc quyền đến hộp thư của bạn.',
        })
        setEmail('')
    }

    return (
        <footer className="relative border-t border-border/70 bg-card/60 backdrop-blur-md overflow-hidden text-foreground">
            {/* Ambient Primary Glows in Footer */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-24 left-1/4 size-96 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-0 right-1/4 size-80 rounded-full bg-primary/10 blur-[90px]" />
                <IconPath name="gemini-star" className="absolute top-10 left-12 size-5 text-primary/30 animate-pulse" />
                <IconPath
                    name="gemini-star"
                    className="absolute top-20 right-20 size-6 text-primary/25 animate-pulse [animation-duration:3s]"
                />
                <IconPath
                    name="gemini-star"
                    className="absolute bottom-16 left-1/3 size-4 text-amber-400/30 animate-pulse [animation-duration:4s]"
                />
            </div>

            {/* Newsletter Section */}
            <div className="border-b border-border/60">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-10 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                            <div className="lg:col-span-7 space-y-2">
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                    <IconPath name="gemini-star" className="size-3.5 text-primary animate-pulse" />
                                    Bản tin ưu đãi VIP 2026
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    Đăng ký nhận voucher giảm đến 50%
                                    <IconPath name="gemini-star" className="size-5 text-amber-400 shrink-0" />
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-xl">
                                    Đừng bỏ lỡ các đợt flash sale siêu chớp, deal công nghệ độc quyền và xu hướng mua
                                    sắm mới nhất được gửi trực tiếp mỗi tuần.
                                </p>
                            </div>

                            <div className="lg:col-span-5">
                                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <MailIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Nhập email của bạn..."
                                            className="h-11 pl-10 rounded-xl bg-background/80 border-border/80 focus-visible:ring-primary"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="h-11 rounded-xl font-semibold gap-2 shadow-sm text-white shrink-0"
                                    >
                                        <span>Đăng ký</span>
                                        <ChevronRightIcon className="size-4" />
                                    </Button>
                                </form>
                                <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                                    <ShieldCheckIcon className="size-3.5 text-primary shrink-0" />
                                    Cam kết bảo mật 100%, không gửi thư rác.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Links Directory */}
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                    {/* Brand Info Column */}
                    <div className="lg:col-span-4 space-y-4">
                        <Link href={ROUTE.HOME} className="inline-flex items-center gap-2.5 font-bold text-xl">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-primary font-bold text-white shadow-md">
                                T
                            </div>
                            <span className="tracking-tight text-foreground">TimmyHub</span>
                            <Badge
                                variant="outline"
                                className="gap-1 border-primary/40 bg-primary/10 text-primary text-[10px] font-semibold"
                            >
                                <IconPath name="gemini-star" className="size-3 text-primary animate-pulse" />
                                Sàn TMĐT 2026
                            </Badge>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                            Nền tảng thương mại điện tử kết hợp mua sắm thông minh thế hệ mới. Cam kết hàng chính hãng
                            100%, giao vận hỏa tốc và trải nghiệm số vượt trội.
                        </p>
                        <div className="space-y-2 pt-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <PhoneIcon className="size-3.5 text-primary shrink-0" />
                                <span>
                                    Hotline: <strong className="text-foreground">1900 8888</strong> (Miễn phí 24/7)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MailIcon className="size-3.5 text-primary shrink-0" />
                                <span>
                                    Email hỗ trợ: <strong className="text-foreground">cskh@timmyhub.vn</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPinIcon className="size-3.5 text-primary shrink-0" />
                                <span>Tầng 18, Tòa nhà Innovation Hub, Hà Nội</span>
                            </div>
                        </div>
                    </div>

                    {/* Links: Về TimmyHub */}
                    <div className="lg:col-span-2 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <IconPath name="gemini-star" className="size-3 text-primary" />
                            Về TimmyHub
                        </h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            {FOOTER_LINKS.about.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="transition-colors hover:text-primary hover:underline underline-offset-4"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Links: Hỗ trợ khách hàng */}
                    <div className="lg:col-span-3 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <HeadphonesIcon className="size-3.5 text-primary" />
                            Hỗ trợ khách hàng
                        </h4>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            {FOOTER_LINKS.support.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="transition-colors hover:text-primary hover:underline underline-offset-4"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Payments, Shipping & Mobile App */}
                    <div className="lg:col-span-3 space-y-4">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2.5 flex items-center gap-1.5">
                                <StoreIcon className="size-3.5 text-primary" />
                                Thanh toán đa kênh
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {FOOTER_LINKS.payments.map((p) => (
                                    <span
                                        key={p.name}
                                        className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 px-2 py-1 text-[10px] font-bold text-foreground/80 shadow-2xs"
                                    >
                                        {p.badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                                <TruckIcon className="size-3.5 text-primary" />
                                Đơn vị vận chuyển
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {FOOTER_LINKS.shipping.map((s) => (
                                    <span
                                        key={s.name}
                                        className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground/80"
                                    >
                                        <span>{s.icon}</span>
                                        <span>{s.name}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-1">
                            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
                                <ShieldCheckIcon className="size-5 text-primary shrink-0" />
                                <div className="text-[11px]">
                                    <p className="font-bold text-foreground">Bảo vệ người mua 100%</p>
                                    <p className="text-muted-foreground text-[10px]">Đổi trả miễn phí trong 7 ngày</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
