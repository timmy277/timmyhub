'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    BadgePercentIcon,
    CheckIcon,
    ClockIcon,
    CopyIcon,
    Loader2Icon,
    SearchIcon,
    ShoppingBagIcon,
    SparklesIcon,
    StoreIcon,
    TagIcon,
    TicketIcon,
    Trash2Icon,
    TruckIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { UserVoucherItem } from '@timmyhub/contracts'
import { Badge, Button, Input, Skeleton } from '@/components/ui'
import { ROUTE } from '@/constants'
import { useClaimVoucherByCode, useMyUserVouchers, useSaveUserVoucher } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

export type VoucherStatusTab = 'ALL' | 'AVAILABLE' | 'USED' | 'EXPIRED'
export type VoucherTypeFilter = 'ALL' | 'FREE_SHIPPING' | 'PLATFORM' | 'SELLER'

interface MyVouchersViewProps {
    initialItems?: UserVoucherItem[]
    compact?: boolean
}

export function MyVouchersView({ initialItems, compact = false }: MyVouchersViewProps) {
    const t = useTranslations('vouchers')
    const [statusTab, setStatusTab] = useState<VoucherStatusTab>('AVAILABLE')
    const [typeFilter, setTypeFilter] = useState<VoucherTypeFilter>('ALL')
    const [voucherCodeInput, setVoucherCodeInput] = useState('')
    const [searchKeyword, setSearchKeyword] = useState('')
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    // Queries & Mutations
    const { data: userVouchers = initialItems || [], isLoading } = useMyUserVouchers(undefined, {
        enabled: true,
    })
    const claimMutation = useClaimVoucherByCode()
    const saveToggleMutation = useSaveUserVoucher()

    // Phân loại trạng thái thực tế dựa theo UserVoucher status và thời hạn voucher
    const analyzedVouchers = useMemo(() => {
        const now = new Date()
        return userVouchers.map((uv) => {
            const v = uv.voucher
            const end = new Date(v.endDate)
            const isDateExpired = end < now
            const isLimitReached = v.usageLimit != null && v.usedCount >= v.usageLimit
            const isInactive = !v.isActive

            let computedStatus: VoucherStatusTab = 'AVAILABLE'
            if (uv.status === 'USED') {
                computedStatus = 'USED'
            } else if (uv.status === 'EXPIRED' || isDateExpired || isLimitReached || isInactive) {
                computedStatus = 'EXPIRED'
            } else {
                computedStatus = 'AVAILABLE'
            }

            const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            const isExpiringSoon = computedStatus === 'AVAILABLE' && diffDays >= 0 && diffDays <= 3

            return {
                ...uv,
                computedStatus,
                isExpiringSoon,
                diffDays,
            }
        })
    }, [userVouchers])

    // Số lượng cho từng tab
    const counts = useMemo(() => {
        return {
            ALL: analyzedVouchers.length,
            AVAILABLE: analyzedVouchers.filter((v) => v.computedStatus === 'AVAILABLE').length,
            USED: analyzedVouchers.filter((v) => v.computedStatus === 'USED').length,
            EXPIRED: analyzedVouchers.filter((v) => v.computedStatus === 'EXPIRED').length,
        }
    }, [analyzedVouchers])

    // Danh sách đã lọc theo Tab, Phân loại, và Từ khóa
    const filteredVouchers = useMemo(() => {
        return analyzedVouchers.filter((v) => {
            // 1. Tab filter
            if (statusTab !== 'ALL' && v.computedStatus !== statusTab) {
                return false
            }

            // 2. Type filter
            if (typeFilter === 'FREE_SHIPPING' && v.voucher.type !== 'FREE_SHIPPING') {
                return false
            }
            if (typeFilter === 'SELLER' && !v.voucher.sellerId) {
                return false
            }
            if (typeFilter === 'PLATFORM' && (Boolean(v.voucher.sellerId) || v.voucher.type === 'FREE_SHIPPING')) {
                return false
            }

            // 3. Keyword filter
            if (searchKeyword.trim()) {
                const kw = searchKeyword.trim().toLowerCase()
                const code = v.voucher.code.toLowerCase()
                const desc = (v.voucher.description || '').toLowerCase()
                const campaign = (v.voucher.campaignName || '').toLowerCase()
                return code.includes(kw) || desc.includes(kw) || campaign.includes(kw)
            }

            return true
        })
    }, [analyzedVouchers, statusTab, typeFilter, searchKeyword])

    // Xử lý nạp mã voucher vào kho
    const handleClaimCode = () => {
        const code = voucherCodeInput.trim().toUpperCase()
        if (!code) {
            toast.error(t('inputCodePlaceholder') || 'Vui lòng nhập mã voucher')
            return
        }
        claimMutation.mutate(code, {
            onSuccess: () => {
                setVoucherCodeInput('')
            },
        })
    }

    // Sao chép mã
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        toast.success(`Đã sao chép mã ${code}`)
        setTimeout(() => setCopiedCode(null), 2000)
    }

    // Gỡ khỏi ví voucher
    const handleRemove = (voucherId: string, code: string) => {
        saveToggleMutation.mutate({ voucherId, code })
    }

    return (
        <div className={`space-y-6 ${compact ? '' : 'w-full'}`}>
            {/* 1. Header & Thanh nhập mã Voucher (Shopee-Style Claim Banner) */}
            <div
                className={`relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'} shadow-sm`}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <TicketIcon className="size-5" />
                            </div>
                            <h1
                                className={`${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} font-black tracking-tight text-foreground`}
                            >
                                {t('myVouchersTitle') || 'Kho Voucher của tôi'}
                            </h1>
                            <Badge className="ml-1 text-[10px] bg-primary text-primary-foreground font-bold">
                                {counts.AVAILABLE} {t('voucherCountAvailable') || 'khả dụng'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {t('myVouchersSubtitle') ||
                                'Quản lý và sử dụng các mã giảm giá, miễn phí vận chuyển đã lưu từ TimmyHub và Shop.'}
                        </p>
                    </div>

                    {/* Ô nhập mã Voucher */}
                    <div className="flex w-full md:w-auto items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Input
                                placeholder={t('inputCodePlaceholder') || 'Nhập mã voucher...'}
                                value={voucherCodeInput}
                                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleClaimCode()}
                                className="h-10 text-xs font-mono uppercase pl-3 pr-2 rounded-xl"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleClaimCode}
                            disabled={claimMutation.isPending || !voucherCodeInput.trim()}
                            className="h-10 px-4 text-xs font-bold rounded-xl gap-1.5 shrink-0"
                        >
                            {claimMutation.isPending ? (
                                <Loader2Icon className="size-3.5 animate-spin" />
                            ) : (
                                <SparklesIcon className="size-3.5" />
                            )}
                            {t('saveVoucher') || 'Lưu vào ví'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Tabs trạng thái giống Shopee (Tất cả / Khả dụng / Đã sử dụng / Hết hiệu lực) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-1">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                    {(
                        [
                            { key: 'AVAILABLE', label: t('tabAvailable') || 'Khả dụng', count: counts.AVAILABLE },
                            { key: 'ALL', label: t('tabAll') || 'Tất cả', count: counts.ALL },
                            { key: 'USED', label: t('tabUsed') || 'Đã sử dụng', count: counts.USED },
                            { key: 'EXPIRED', label: t('tabExpired') || 'Hết hiệu lực', count: counts.EXPIRED },
                        ] as const
                    ).map((tab) => {
                        const isActive = statusTab === tab.key
                        return (
                            <Button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? 'bg-primary/10 text-primary border border-primary/25 shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                                variant="ghost"
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </Button>
                        )
                    })}
                </div>

                {/* Ô tìm kiếm nhanh voucher */}
                <div className="relative w-full sm:w-56">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder={t('searchVoucherPlaceholder') || 'Tìm mã...'}
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="h-9 pl-8 pr-3 text-xs rounded-lg"
                    />
                </div>
            </div>

            {/* 3. Phân loại theo loại voucher (Chips Filter: Tất cả | Freeship | Giảm giá sàn | Voucher Shop) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
                <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                    <TagIcon className="size-3" />
                    {t('filterType') || 'Loại mã:'}
                </span>
                {(
                    [
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'FREE_SHIPPING', label: 'Miễn phí vận chuyển' },
                        { key: 'PLATFORM', label: 'Mã giảm TimmyHub' },
                        { key: 'SELLER', label: 'Voucher từ Shop' },
                    ] as const
                ).map((f) => (
                    <Button
                        key={f.key}
                        type="button"
                        onClick={() => setTypeFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                            typeFilter === f.key
                                ? 'bg-foreground text-background font-bold shadow-xs'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        variant="ghost"
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {/* 4. Danh sách các Voucher Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <Skeleton key={idx} className="h-36 w-full rounded-2xl" />
                    ))}
                </div>
            ) : filteredVouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-border/80 bg-card/50 space-y-3">
                    <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/60">
                        <TicketIcon className="size-8" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-bold text-foreground">
                            {t('emptyVoucherTitle') || 'Chưa có mã giảm giá nào ở mục này'}
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            {t('emptyVoucherDesc') ||
                                'Lưu thêm các mã Freeship và giảm giá hấp dẫn tại Trang chủ để tiết kiệm hơn khi mua sắm.'}
                        </p>
                    </div>
                    <Button asChild size="sm" variant="default" className="rounded-xl mt-2">
                        <Link href={ROUTE.HOME}>
                            <ShoppingBagIcon className="size-3.5 mr-1.5" />
                            {t('browseVouchers') || 'Săn voucher tại Trang chủ'}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div
                    className={`grid grid-cols-1 ${compact ? 'xl:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}
                >
                    {filteredVouchers.map((uv) => {
                        const v = uv.voucher
                        const isAvailable = uv.computedStatus === 'AVAILABLE'
                        const isUsed = uv.computedStatus === 'USED'
                        const isShipping = v.type === 'FREE_SHIPPING'
                        const isSeller = Boolean(v.sellerId)

                        // Màu sắc & Icon thẻ vé theo kiểu Shopee
                        const themeColor = isShipping
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : isSeller
                              ? 'text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30'
                              : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'

                        const typeBadgeText = isShipping
                            ? 'Freeship'
                            : isSeller
                              ? 'Shop Voucher'
                              : v.campaignName || 'TimmyHub'

                        let valueText = ''
                        if (isShipping) {
                            valueText = v.value ? `Freeship ${formatCurrencyVND(v.value)}` : 'Freeship 100%'
                        } else if (v.type === 'PERCENTAGE') {
                            valueText = `Giảm ${v.value}%${v.maxDiscount ? ` (Tối đa ${formatCurrencyVND(v.maxDiscount)})` : ''}`
                        } else {
                            valueText = `Giảm ngay ${formatCurrencyVND(v.value)}`
                        }

                        return (
                            <div
                                key={uv.id}
                                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md ${
                                    isAvailable
                                        ? 'border-border/80 bg-card hover:border-primary/50'
                                        : 'border-border/40 bg-muted/20 opacity-70 grayscale-[30%]'
                                }`}
                            >
                                {/* Thân vé Voucher */}
                                <div className="p-4 space-y-3">
                                    {/* Hàng 1: Loại mã, Hạn sử dụng, Nút gỡ */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Badge
                                                variant="secondary"
                                                className={`text-[10px] font-bold border px-2 py-0.5 ${themeColor}`}
                                            >
                                                {isShipping ? (
                                                    <TruckIcon className="size-3 mr-1 inline-block" />
                                                ) : isSeller ? (
                                                    <StoreIcon className="size-3 mr-1 inline-block" />
                                                ) : (
                                                    <BadgePercentIcon className="size-3 mr-1 inline-block" />
                                                )}
                                                {typeBadgeText}
                                            </Badge>
                                            {uv.isExpiringSoon && (
                                                <Badge
                                                    variant="destructive"
                                                    className="text-[9px] px-1.5 py-0 font-bold animate-pulse"
                                                >
                                                    {t('expiringSoon') || 'Sắp hết hạn'}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Nút xóa / gỡ voucher khỏi ví */}
                                        <Button
                                            type="button"
                                            onClick={() => handleRemove(v.id, v.code)}
                                            title="Gỡ khỏi kho voucher"
                                            className="text-muted-foreground/60 hover:text-destructive p-1 rounded-md transition-colors"
                                            variant="ghost"
                                        >
                                            <Trash2Icon className="size-3.5" />
                                        </Button>
                                    </div>

                                    {/* Hàng 2: Giá trị ưu đãi & Mô tả */}
                                    <div className="space-y-1">
                                        <p className="text-base font-black text-foreground leading-snug line-clamp-1">
                                            {valueText}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {v.description ||
                                                (v.minOrderValue
                                                    ? `Áp dụng cho đơn hàng từ ${formatCurrencyVND(v.minOrderValue)}`
                                                    : 'Áp dụng cho mọi đơn hàng')}
                                        </p>
                                    </div>

                                    {/* Hàng 3: Điều kiện & Hạn sử dụng */}
                                    <div className="space-y-1 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>
                                                Đơn tối thiểu:{' '}
                                                <strong className="text-foreground font-semibold">
                                                    {v.minOrderValue ? formatCurrencyVND(v.minOrderValue) : '0₫'}
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px]">
                                            <ClockIcon className="size-3 text-muted-foreground" />
                                            <span>
                                                HSD: {new Date(v.endDate).toLocaleDateString('vi-VN')}
                                                {isAvailable && ` (còn ${uv.diffDays} ngày)`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Chân vé Voucher: Mã Code + Nút Dùng Ngay */}
                                <div className="bg-muted/40 px-4 py-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => handleCopy(v.code)}
                                        className="group flex items-center gap-1.5 font-mono text-xs font-bold text-foreground bg-background border border-border/70 rounded-lg px-2 py-1 hover:border-primary transition-colors cursor-pointer"
                                        variant="ghost"
                                    >
                                        <span>{v.code}</span>
                                        {copiedCode === v.code ? (
                                            <CheckIcon className="size-3 text-emerald-600" />
                                        ) : (
                                            <CopyIcon className="size-3 text-muted-foreground group-hover:text-primary" />
                                        )}
                                    </Button>

                                    <div>
                                        {isAvailable ? (
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="default"
                                                className="h-8 px-3 text-xs font-bold rounded-lg shadow-xs"
                                            >
                                                <Link href={ROUTE.CHECKOUT}>{t('useNow') || 'Dùng ngay'}</Link>
                                            </Button>
                                        ) : isUsed ? (
                                            <Badge
                                                variant="outline"
                                                className="text-xs bg-muted text-muted-foreground py-1 px-2.5 font-bold"
                                            >
                                                {t('statusUsed') || 'Đã sử dụng'}
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-xs bg-muted text-muted-foreground/80 py-1 px-2.5 font-bold"
                                            >
                                                {t('statusExpired') || 'Hết hiệu lực'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
