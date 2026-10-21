'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    BanknoteIcon,
    CheckCircle2Icon,
    CheckIcon,
    ChevronRightIcon,
    CreditCardIcon,
    HomeIcon,
    Loader2Icon,
    LockIcon,
    MapPinIcon,
    PackageIcon,
    PlusIcon,
    ShieldCheckIcon,
    StoreIcon,
    TagIcon,
    TicketIcon,
    TruckIcon,
    WalletIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { AddressDetail, CartDetail, CheckoutInput, UserVoucherItem, VoucherItem } from '@timmyhub/contracts'

import { FloatInput } from '@/components'
import {
    Input,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    RadioGroup,
    RadioGroupItem,
    Skeleton,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import {
    useAddresses,
    useAvailableVouchers,
    useCart,
    useCheckout,
    useMyUserVouchers,
    usePublicProductDetail,
    useValidateVoucher,
} from '@/hooks'
import { formatCurrencyVND } from '@/utils'
import { AddressFormDialog } from './address-form-dialog'

interface CheckoutViewProps {
    initialAddresses?: AddressDetail[]
    initialCart?: CartDetail | null
}

export function CheckoutView({ initialAddresses = [], initialCart = null }: CheckoutViewProps) {
    const t = useTranslations('checkout')
    const router = useRouter()
    const searchParams = useSearchParams()

    // 1. Lấy thông tin query params cho 2 luồng: Cart Items hoặc Mua Ngay (Direct)
    const cartItemIdsParam = searchParams.get('items')
    const directProductId = searchParams.get('productId')
    const directVariantId = searchParams.get('variantId')
    const directQty = Number(searchParams.get('qty') || '1')

    const selectedCartItemIds = useMemo(() => {
        if (!cartItemIdsParam) return []
        return cartItemIdsParam.split(',').filter(Boolean)
    }, [cartItemIdsParam])

    // Query Cart và Addresses
    const { data: cart } = useCart({ initialData: initialCart })
    const { data: addresses = initialAddresses } = useAddresses({ initialData: initialAddresses })
    const addressList = useMemo(
        () => (addresses && addresses.length > 0 ? addresses : initialAddresses),
        [addresses, initialAddresses],
    )

    // Nếu là luồng Mua Ngay, query product detail để lấy thông tin variant
    const { data: directProduct, isLoading: isLoadingDirectProduct } = usePublicProductDetail(
        directProductId || directVariantId || '',
        {
            enabled: Boolean(directProductId || directVariantId),
        },
    )

    // 2. Trạng thái địa chỉ được chọn
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
    const [isNewAddressFormOpen, setIsNewAddressFormOpen] = useState(false)

    // Địa chỉ hiện tại đang chọn (ưu tiên địa chỉ người dùng click chọn -> địa chỉ mặc định -> địa chỉ đầu tiên)
    const activeAddress = useMemo(() => {
        if (selectedAddressId) {
            const found = addressList.find((a) => a.id === selectedAddressId)
            if (found) return found
        }
        const defaultAddr = addressList.find((a) => a.isDefault)
        return defaultAddr || addressList[0] || null
    }, [addressList, selectedAddressId])

    // 3. Phương thức thanh toán & Ghi chú
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY' | 'WALLET'>('COD')
    const [customerNote, setCustomerNote] = useState('')

    // 4. Danh sách các mặt hàng hiển thị trong Checkout
    const checkoutItems = useMemo(() => {
        // Luồng A: Mua Ngay (Direct Item)
        if (directVariantId && directProduct) {
            const variant = directProduct.variants.find((v) => v.id === directVariantId)
            if (!variant) return []

            const numPrice = Number(variant.price) || 0
            const lineTotal = (numPrice * directQty).toString()

            const variantLabel = variant.optionKey
                ? variant.optionKey
                      .split(':')
                      .map((valId) => {
                          for (const opt of directProduct.options) {
                              const foundVal = opt.values.find((v) => v.id === valId)
                              if (foundVal) return `${opt.name}: ${foundVal.value}`
                          }
                          return ''
                      })
                      .filter(Boolean)
                      .join(', ') || 'Mặc định'
                : 'Mặc định'

            return [
                {
                    shopId: directProduct.shopId,
                    shopName: directProduct.shopName || 'TimmyHub Mall',
                    items: [
                        {
                            id: variant.id,
                            productId: directProduct.id,
                            variantId: variant.id,
                            productName: directProduct.name,
                            productSlug: directProduct.slug,
                            productImage:
                                directProduct.images && directProduct.images.length > 0
                                    ? directProduct.images[0]
                                    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
                            variantLabel,
                            unitPrice: variant.price,
                            quantity: directQty,
                            lineTotal,
                        },
                    ],
                },
            ]
        }

        // Luồng B: Mua từ Cart
        const currentCart = cart || initialCart
        if (!currentCart || currentCart.shopGroups.length === 0) return []

        const groups: Array<{
            shopId: string
            shopName: string
            items: Array<{
                id: string
                productId: string
                variantId: string
                productName: string
                productSlug: string
                productImage: string | null | undefined
                variantLabel: string
                unitPrice: string
                quantity: number
                lineTotal: string
            }>
        }> = []

        for (const shop of currentCart.shopGroups) {
            // Lọc các item được chọn
            const matchedItems = shop.items.filter((item) => {
                if (selectedCartItemIds.length > 0) {
                    return selectedCartItemIds.includes(item.id) && item.isValid
                }
                return item.isValid
            })

            if (matchedItems.length > 0) {
                groups.push({
                    shopId: shop.shopId,
                    shopName: shop.shopName,
                    items: matchedItems.map((item) => {
                        const variantLabel = item.variantOptions
                            ? Object.entries(item.variantOptions)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')
                            : 'Mặc định'

                        const numPrice = Number(item.price) || 0
                        const lineTotal = (numPrice * item.quantity).toString()

                        return {
                            id: item.id,
                            productId: item.productId,
                            variantId: item.variantId,
                            productName: item.productName,
                            productSlug: item.productSlug,
                            productImage: item.productImage,
                            variantLabel,
                            unitPrice: item.price,
                            quantity: item.quantity,
                            lineTotal,
                        }
                    }),
                })
            }
        }

        return groups
    }, [directVariantId, directProduct, directQty, cart, initialCart, selectedCartItemIds])

    // Tính tổng tiền hàng
    const subtotal = useMemo(() => {
        return checkoutItems.reduce((acc, shop) => {
            const shopTotal = shop.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0)
            return acc + shopTotal
        }, 0)
    }, [checkoutItems])

    // Phí vận chuyển tiêu chuẩn 30.000₫ cho mỗi shop trong đơn
    const uniqueShopCount = checkoutItems.length || 1
    const standardShippingFee = 30000 * uniqueShopCount

    // 5. Trạng thái Voucher đa tầng (Shopee Voucher Model: Freeship + Sàn TimmyHub + Shop)
    const [voucherCodeInput, setVoucherCodeInput] = useState('')
    const [appliedShippingVoucher, setAppliedShippingVoucher] = useState<VoucherItem | null>(null)
    const [appliedPlatformVoucher, setAppliedPlatformVoucher] = useState<VoucherItem | null>(null)
    const [appliedShopVouchers, setAppliedShopVouchers] = useState<Record<string, VoucherItem>>({})
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
    const [voucherModalInput, setVoucherModalInput] = useState('')
    const [voucherCategoryTab, setVoucherCategoryTab] = useState<'ALL' | 'SHIPPING' | 'DISCOUNT' | 'SAVED'>('ALL')
    const [selectedModalShippingCode, setSelectedModalShippingCode] = useState<string | null>(null)
    const [selectedModalPlatformCode, setSelectedModalPlatformCode] = useState<string | null>(null)
    const [selectedModalShopCodes, setSelectedModalShopCodes] = useState<Record<string, string>>({})

    const validateVoucherMutation = useValidateVoucher()
    const { data: availableVouchers = [], isLoading: isLoadingAvailableVouchers } = useAvailableVouchers(subtotal)
    const { data: myUserVouchers = [], isLoading: isLoadingMyVouchers } = useMyUserVouchers('SAVED')

    const isLoadingVouchers = isLoadingAvailableVouchers || isLoadingMyVouchers

    // Map các mã voucher đã lưu trong ví của user
    const savedVoucherMap = useMemo(() => {
        const map = new Map<string, UserVoucherItem>()
        for (const item of myUserVouchers) {
            map.set(item.voucher.code, item)
        }
        return map
    }, [myUserVouchers])

    // Bản đồ tổng tiền hàng của từng gian hàng trong đơn
    const shopSubtotals = useMemo(() => {
        const map = new Map<string, number>()
        for (const shop of checkoutItems) {
            const total = shop.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0)
            map.set(shop.shopId, total)
        }
        return map
    }, [checkoutItems])

    // Danh sách voucher hợp nhất giữa các voucher công khai và voucher đã lưu trong ví
    const combinedVouchers = useMemo(() => {
        const voucherMap = new Map<string, { voucher: VoucherItem; isSaved: boolean }>()

        // 1. Thêm các voucher có sẵn từ sàn & shop
        for (const v of availableVouchers) {
            voucherMap.set(v.code, {
                voucher: v,
                isSaved: savedVoucherMap.has(v.code),
            })
        }

        // 2. Thêm các voucher trong ví nếu chưa có trong availableVouchers
        for (const uv of myUserVouchers) {
            if (!voucherMap.has(uv.voucher.code) && uv.voucher.isActive) {
                voucherMap.set(uv.voucher.code, {
                    voucher: uv.voucher,
                    isSaved: true,
                })
            }
        }

        const list = Array.from(voucherMap.values())

        return list.map(({ voucher: v, isSaved }) => {
            const minOrder = Number(v.minOrderValue) || 0
            const hasShop = v.sellerId ? shopSubtotals.has(v.sellerId) : true
            const effectiveSub = v.sellerId ? shopSubtotals.get(v.sellerId) || 0 : subtotal
            const isEligible = hasShop && effectiveSub >= minOrder
            const remaining = minOrder > effectiveSub ? minOrder - effectiveSub : 0

            let estimatedDiscount = 0
            if (isEligible) {
                if (v.type === 'PERCENTAGE') {
                    estimatedDiscount = Math.floor((effectiveSub * v.value) / 100)
                    if (v.maxDiscount && estimatedDiscount > v.maxDiscount) {
                        estimatedDiscount = v.maxDiscount
                    }
                } else if (v.type === 'FIXED_AMOUNT') {
                    estimatedDiscount = Math.min(effectiveSub, v.value)
                } else if (v.type === 'FREE_SHIPPING') {
                    const cap = v.value > 0 ? v.value : standardShippingFee
                    estimatedDiscount = Math.min(standardShippingFee, cap)
                }
            }

            return {
                voucher: v,
                isSaved,
                isEligible,
                remaining,
                minOrder,
                estimatedDiscount,
            }
        })
    }, [availableVouchers, myUserVouchers, savedVoucherMap, subtotal, standardShippingFee, shopSubtotals])

    // Số lượng cho từng tab phân loại
    const modalTabCounts = useMemo(() => {
        return {
            ALL: combinedVouchers.length,
            SHIPPING: combinedVouchers.filter((x) => x.voucher.type === 'FREE_SHIPPING').length,
            DISCOUNT: combinedVouchers.filter((x) => x.voucher.type !== 'FREE_SHIPPING').length,
            SAVED: combinedVouchers.filter((x) => x.isSaved).length,
        }
    }, [combinedVouchers])

    // Lọc theo Tab phân loại trong modal
    const filteredModalVouchers = useMemo(() => {
        return combinedVouchers.filter(({ voucher: v, isSaved }) => {
            if (voucherCategoryTab === 'SHIPPING') return v.type === 'FREE_SHIPPING'
            if (voucherCategoryTab === 'DISCOUNT') return v.type !== 'FREE_SHIPPING'
            if (voucherCategoryTab === 'SAVED') return isSaved
            return true
        })
    }, [combinedVouchers, voucherCategoryTab])

    // Chia nhóm: Thỏa mãn điều kiện (Eligible) vs Chưa đạt điều kiện (Ineligible)
    const eligibleVouchers = useMemo(() => filteredModalVouchers.filter((x) => x.isEligible), [filteredModalVouchers])
    const ineligibleVouchers = useMemo(
        () => filteredModalVouchers.filter((x) => !x.isEligible),
        [filteredModalVouchers],
    )

    // 1. Tính toán giảm giá phí vận chuyển chính xác (Freeship)
    const shippingDiscount = useMemo(() => {
        if (!appliedShippingVoucher) return 0
        const minOrder = Number(appliedShippingVoucher.minOrderValue) || 0
        if (subtotal < minOrder) return 0
        const val = Number(appliedShippingVoucher.value)
        const cap = val > 0 ? val : standardShippingFee
        return Math.min(standardShippingFee, cap)
    }, [appliedShippingVoucher, subtotal, standardShippingFee])

    // 2. Tính toán giảm giá từ từng Shop
    const shopDiscountDetails = useMemo(() => {
        const details: Array<{ shopId: string; voucher: VoucherItem; discount: number }> = []
        for (const [shopId, v] of Object.entries(appliedShopVouchers)) {
            const shopSub = shopSubtotals.get(shopId) || 0
            const minOrder = Number(v.minOrderValue) || 0
            if (shopSub >= minOrder) {
                let disc = 0
                if (v.type === 'PERCENTAGE') {
                    const raw = Math.floor((shopSub * Number(v.value)) / 100)
                    disc = v.maxDiscount ? Math.min(raw, Number(v.maxDiscount)) : raw
                } else if (v.type === 'FIXED_AMOUNT') {
                    disc = Math.min(shopSub, Number(v.value))
                }
                if (disc > 0) {
                    details.push({ shopId, voucher: v, discount: disc })
                }
            }
        }
        return details
    }, [appliedShopVouchers, shopSubtotals])

    const totalShopDiscount = useMemo(() => {
        return shopDiscountDetails.reduce((sum, item) => sum + item.discount, 0)
    }, [shopDiscountDetails])

    // 3. Tính toán giảm giá từ sàn TimmyHub
    const platformDiscount = useMemo(() => {
        if (!appliedPlatformVoucher) return 0
        const minOrder = Number(appliedPlatformVoucher.minOrderValue) || 0
        if (subtotal < minOrder) return 0

        const availableSubtotal = Math.max(0, subtotal - totalShopDiscount)
        let disc = 0
        if (appliedPlatformVoucher.type === 'PERCENTAGE') {
            const raw = Math.floor((subtotal * Number(appliedPlatformVoucher.value)) / 100)
            const capped = appliedPlatformVoucher.maxDiscount
                ? Math.min(raw, Number(appliedPlatformVoucher.maxDiscount))
                : raw
            disc = Math.min(availableSubtotal, capped)
        } else if (appliedPlatformVoucher.type === 'FIXED_AMOUNT') {
            disc = Math.min(availableSubtotal, Number(appliedPlatformVoucher.value))
        }
        return Math.max(0, disc)
    }, [appliedPlatformVoucher, subtotal, totalShopDiscount])

    const productDiscount = totalShopDiscount + platformDiscount
    const netShippingFee = Math.max(0, standardShippingFee - shippingDiscount)
    const totalAmount = Math.max(0, subtotal + netShippingFee - productDiscount)

    // Áp dụng voucher qua nhập mã
    const handleApplyVoucher = async (codeToApply?: string) => {
        const code = (codeToApply || voucherCodeInput).trim().toUpperCase()
        if (!code) {
            toast.error(t('voucherPlaceholder') || 'Vui lòng nhập mã giảm giá')
            return
        }

        try {
            const shopIds = checkoutItems.map((g) => g.shopId)
            const result = await validateVoucherMutation.mutateAsync({
                code,
                subtotal,
                shopIds,
            })

            if (result.valid && result.voucher) {
                const v = result.voucher as VoucherItem
                if (v.type === 'FREE_SHIPPING') {
                    setAppliedShippingVoucher(v)
                    setSelectedModalShippingCode(v.code)
                    toast.success(`Áp dụng mã Freeship ${v.code} thành công!`)
                } else if (v.sellerId) {
                    setAppliedShopVouchers((prev) => ({ ...prev, [v.sellerId!]: v }))
                    setSelectedModalShopCodes((prev) => ({ ...prev, [v.sellerId!]: v.code }))
                    toast.success(`Áp dụng mã Shop ${v.code} thành công!`)
                } else {
                    setAppliedPlatformVoucher(v)
                    setSelectedModalPlatformCode(v.code)
                    toast.success(`Áp dụng mã TimmyHub ${v.code} thành công!`)
                }
                setVoucherCodeInput('')
                setVoucherModalInput('')
                setIsVoucherModalOpen(false)
            } else {
                toast.error('Mã giảm giá không hợp lệ')
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Không thể áp dụng mã giảm giá'
            toast.error(errMsg)
        }
    }

    // Gỡ từng voucher
    const handleRemoveShippingVoucher = () => {
        setAppliedShippingVoucher(null)
        setSelectedModalShippingCode(null)
        toast.info('Đã gỡ mã miễn phí vận chuyển')
    }

    const handleRemovePlatformVoucher = () => {
        setAppliedPlatformVoucher(null)
        setSelectedModalPlatformCode(null)
        toast.info('Đã gỡ mã giảm giá TimmyHub')
    }

    const handleRemoveShopVoucher = (shopId: string) => {
        setAppliedShopVouchers((prev) => {
            const next = { ...prev }
            delete next[shopId]
            return next
        })
        setSelectedModalShopCodes((prev) => {
            const next = { ...prev }
            delete next[shopId]
            return next
        })
        toast.info('Đã gỡ mã giảm giá của Shop')
    }

    // 6. Đặt hàng Mutation
    const checkoutMutation = useCheckout()

    const handlePlaceOrder = async () => {
        if (!activeAddress) {
            toast.error('Vui lòng cung cấp địa chỉ nhận hàng')
            setIsAddressModalOpen(true)
            return
        }

        if (checkoutItems.length === 0) {
            toast.error('Không có sản phẩm nào để đặt hàng')
            return
        }

        const payload: CheckoutInput = {
            addressId: activeAddress.id,
            paymentMethod,
            customerNote: customerNote.trim() || undefined,
            voucherCode: appliedPlatformVoucher?.code || appliedShippingVoucher?.code || undefined,
            voucherCodes: [
                appliedShippingVoucher?.code,
                appliedPlatformVoucher?.code,
                ...Object.values(appliedShopVouchers).map((v) => v.code),
            ].filter(Boolean) as string[],
            idempotencyKey: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        }

        if (directVariantId) {
            payload.directItem = {
                variantId: directVariantId,
                quantity: directQty,
            }
        } else if (selectedCartItemIds.length > 0) {
            payload.cartItemIds = selectedCartItemIds
        }

        try {
            const result = await checkoutMutation.mutateAsync(payload)
            if (result.paymentUrl) {
                toast.success('Đang chuyển hướng tới cổng thanh toán VNPay...')
                window.location.href = result.paymentUrl
                return
            }
            toast.success('Đặt hàng thành công!')
            if (result.orders && result.orders.length > 0) {
                const firstOrderId = result.orders[0]!.id
                router.push(ROUTE.CHECKOUT_SUCCESS(firstOrderId))
            } else {
                router.push(ROUTE.ORDERS)
            }
        } catch {
            // Lỗi đã được toast trong onError hook
        }
    }

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
                            <Link
                                href={ROUTE.HOME}
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                            >
                                <HomeIcon className="size-3.5 text-primary" />
                                <span>{t('breadcrumbHome')}</span>
                            </Link>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <Link href={ROUTE.CART} className="hover:text-foreground transition-colors">
                                {t('breadcrumbCart')}
                            </Link>
                            <ChevronRightIcon className="size-3 text-muted-foreground/60" />
                            <span className="font-medium text-foreground">{t('breadcrumbCheckout')}</span>
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
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading flex items-center gap-2.5">
                        <PackageIcon className="size-7 text-primary" />
                        {t('title')}
                    </h1>
                    <Link
                        href={ROUTE.CART}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeftIcon className="size-3.5" />
                        Quay lại giỏ hàng
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Cột trái: Địa chỉ, Kiện hàng, Phương thức thanh toán (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* ─────────────────────────────────────────────────────────────
                         * SECTION 1: ĐỊA CHỈ NHẬN HÀNG (Shopee-Style Border Strip)
                         * ───────────────────────────────────────────────────────────── */}
                        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                            {/* Decorative Post-Parcel Strip */}
                            <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_20px,#3b82f6_20px,#3b82f6_40px,#10b981_40px,#10b981_60px)]" />

                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary font-bold text-base">
                                        <MapPinIcon className="size-5" />
                                        <span>{t('addressTitle')}</span>
                                    </div>
                                    {activeAddress && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsNewAddressFormOpen(false)
                                                setIsAddressModalOpen(true)
                                            }}
                                            className="h-8 text-xs font-semibold rounded-lg"
                                        >
                                            {t('changeAddress')}
                                        </Button>
                                    )}
                                </div>

                                {activeAddress ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="font-extrabold text-foreground text-sm sm:text-base">
                                                    {activeAddress.fullName}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    ({activeAddress.phone})
                                                </span>
                                                {activeAddress.isDefault && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold"
                                                    >
                                                        {t('defaultBadge')}
                                                    </Badge>
                                                )}
                                                {activeAddress.label && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-semibold text-muted-foreground"
                                                    >
                                                        {activeAddress.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {[
                                                    activeAddress.addressLine1,
                                                    activeAddress.addressLine2,
                                                    activeAddress.wardName,
                                                    activeAddress.districtName,
                                                    activeAddress.provinceName,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-muted/40 p-4 border border-dashed border-border text-center space-y-3">
                                        <p className="text-xs sm:text-sm text-muted-foreground">{t('noAddress')}</p>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setIsNewAddressFormOpen(true)
                                                setIsAddressModalOpen(true)
                                            }}
                                            className="h-8 text-xs font-bold gap-1.5"
                                        >
                                            <PlusIcon className="size-3.5" />
                                            {t('addAddress')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─────────────────────────────────────────────────────────────
                         * SECTION 2: DANH SÁCH KIỆN HÀNG (THEO TỪNG GIAN HÀNG)
                         * ───────────────────────────────────────────────────────────── */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-5">
                            <div className="flex items-center gap-2 text-base font-bold text-foreground">
                                <PackageIcon className="size-5 text-primary" />
                                <span>{t('itemsTitle')}</span>
                            </div>

                            {directVariantId && isLoadingDirectProduct ? (
                                <div className="space-y-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <StoreIcon className="size-4 text-primary" />
                                        <Skeleton className="h-4 w-32 rounded-md" />
                                    </div>
                                    <div className="flex items-start gap-3.5 pt-2">
                                        <Skeleton className="size-16 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4 rounded-md" />
                                            <Skeleton className="h-3 w-1/3 rounded-md" />
                                        </div>
                                        <Skeleton className="h-4 w-20 rounded-md" />
                                    </div>
                                </div>
                            ) : checkoutItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Không có sản phẩm nào để thanh toán.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {checkoutItems.map((shop) => (
                                        <div
                                            key={shop.shopId}
                                            className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60"
                                        >
                                            {/* Shop Header */}
                                            <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <StoreIcon className="size-4 text-primary" />
                                                    <span className="text-xs sm:text-sm font-bold text-foreground">
                                                        {t('shopPrefix')} {shop.shopName}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold"
                                                    >
                                                        Chính hãng
                                                    </Badge>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {shop.items.length} mặt hàng
                                                </span>
                                            </div>

                                            {/* Danh sách items của shop */}
                                            <div className="divide-y divide-border/40 p-4 space-y-4">
                                                {shop.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-3.5 pt-3 first:pt-0"
                                                    >
                                                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                                                            {item.productImage ? (
                                                                <Image
                                                                    src={item.productImage}
                                                                    alt={item.productName}
                                                                    fill
                                                                    sizes="64px"
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-xl">
                                                                    📦
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground leading-snug">
                                                                {item.productName}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                                                <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                                                                    {item.variantLabel}
                                                                </span>
                                                                <span>x{item.quantity}</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-right shrink-0">
                                                            <span className="text-xs sm:text-sm font-extrabold text-foreground block">
                                                                {formatCurrencyVND(item.lineTotal)}
                                                            </span>
                                                            {item.quantity > 1 && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {formatCurrencyVND(item.unitPrice)} / cái
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Shipping Note & Method */}
                                            <div className="bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                                                    <TruckIcon className="size-4 shrink-0" />
                                                    <span>{t('standardShipping')}:</span>
                                                    <span className="font-extrabold">{t('freeShipping')}</span>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Dự kiến giao 2 - 4 ngày
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Lời nhắn cho người bán */}
                                    <div className="pt-2">
                                        <FloatInput
                                            id="customer-note"
                                            label={t('customerNote')}
                                            placeholder={t('customerNotePlaceholder')}
                                            value={customerNote}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                setCustomerNote(e.target.value)
                                            }
                                            maxLength={200}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─────────────────────────────────────────────────────────────
                         * SECTION 3: PHƯƠNG THỨC THANH TOÁN
                         * ───────────────────────────────────────────────────────────── */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-base font-bold text-foreground">
                                <CreditCardIcon className="size-5 text-primary" />
                                <span>{t('paymentTitle')}</span>
                            </div>

                            <RadioGroup
                                value={paymentMethod}
                                onValueChange={(v: 'COD' | 'VNPAY' | 'WALLET') => setPaymentMethod(v)}
                                className="space-y-3"
                            >
                                {/* Option 1: COD */}
                                <label
                                    htmlFor="pay-cod"
                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                        paymentMethod === 'COD'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border/70 hover:border-border hover:bg-muted/30'
                                    }`}
                                >
                                    <RadioGroupItem value="COD" id="pay-cod" className="mt-1" />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <BanknoteIcon className="size-4 text-emerald-600" />
                                            <span className="text-xs sm:text-sm font-bold text-foreground">
                                                {t('cod')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {t('codDesc')}
                                        </p>
                                    </div>
                                </label>

                                {/* Option 2: VNPay */}
                                <label
                                    htmlFor="pay-vnpay"
                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                        paymentMethod === 'VNPAY'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border/70 hover:border-border hover:bg-muted/30'
                                    }`}
                                >
                                    <RadioGroupItem value="VNPAY" id="pay-vnpay" className="mt-1" />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CreditCardIcon className="size-4 text-blue-600" />
                                            <span className="text-xs sm:text-sm font-bold text-foreground">
                                                {t('vnpay')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {t('vnpayDesc')}
                                        </p>
                                    </div>
                                </label>

                                {/* Option 3: Ví TimmyHub Pay */}
                                <label
                                    htmlFor="pay-wallet"
                                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                        paymentMethod === 'WALLET'
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border/70 hover:border-border hover:bg-muted/30'
                                    }`}
                                >
                                    <RadioGroupItem value="WALLET" id="pay-wallet" className="mt-1" />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <WalletIcon className="size-4 text-purple-600" />
                                            <span className="text-xs sm:text-sm font-bold text-foreground">
                                                {t('wallet')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {t('walletDesc')}
                                        </p>
                                    </div>
                                </label>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Cột phải: Sticky Tóm tắt đơn hàng (4 cols) */}
                    <div className="lg:col-span-4 sticky top-20 space-y-4">
                        {/* Thẻ áp dụng Voucher */}
                        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden bg-card">
                            <CardHeader className="bg-muted/30 py-3.5 px-5 border-b border-border/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TicketIcon className="size-4 text-primary" />
                                        <CardTitle className="text-sm font-extrabold text-foreground">
                                            {t('voucherTitle')}
                                        </CardTitle>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setVoucherModalInput(voucherCodeInput)
                                            setSelectedModalShippingCode(
                                                appliedShippingVoucher ? appliedShippingVoucher.code : null,
                                            )
                                            setSelectedModalPlatformCode(
                                                appliedPlatformVoucher ? appliedPlatformVoucher.code : null,
                                            )
                                            const shopCodes: Record<string, string> = {}
                                            for (const [sId, v] of Object.entries(appliedShopVouchers)) {
                                                shopCodes[sId] = v.code
                                            }
                                            setSelectedModalShopCodes(shopCodes)
                                            setIsVoucherModalOpen(true)
                                        }}
                                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                        variant="ghost"
                                    >
                                        {t('voucherSelectOrEnter')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-5 space-y-3">
                                {appliedShippingVoucher ||
                                appliedPlatformVoucher ||
                                Object.keys(appliedShopVouchers).length > 0 ? (
                                    <div className="space-y-2">
                                        {appliedShippingVoucher && (
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                        <TruckIcon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider truncate">
                                                                {appliedShippingVoucher.code}
                                                            </span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-0 py-0 px-1.5 font-bold"
                                                            >
                                                                Freeship -{formatCurrencyVND(shippingDiscount)}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground truncate">
                                                            {appliedShippingVoucher.description ||
                                                                'Miễn phí vận chuyển'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveShippingVoucher}
                                                    className="h-7 px-2 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0"
                                                >
                                                    {t('voucherRemove')}
                                                </Button>
                                            </div>
                                        )}
                                        {appliedPlatformVoucher && (
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="size-8 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                                                        <TagIcon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider truncate">
                                                                {appliedPlatformVoucher.code}
                                                            </span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] bg-purple-500/20 text-purple-700 dark:text-purple-400 border-0 py-0 px-1.5 font-bold"
                                                            >
                                                                Sàn TimmyHub -{formatCurrencyVND(platformDiscount)}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground truncate">
                                                            {appliedPlatformVoucher.description ||
                                                                appliedPlatformVoucher.campaignName ||
                                                                'Giảm giá sàn TimmyHub'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemovePlatformVoucher}
                                                    className="h-7 px-2 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0"
                                                >
                                                    {t('voucherRemove')}
                                                </Button>
                                            </div>
                                        )}
                                        {shopDiscountDetails.map(({ shopId, voucher: sv, discount: sDisc }) => (
                                            <div
                                                key={shopId}
                                                className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="size-8 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                        <StoreIcon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider truncate">
                                                                {sv.code}
                                                            </span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-400 border-0 py-0 px-1.5 font-bold"
                                                            >
                                                                Shop -{formatCurrencyVND(sDisc)}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground truncate">
                                                            {sv.description || 'Giảm giá Shop'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveShopVoucher(shopId)}
                                                    className="h-7 px-2 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0"
                                                >
                                                    {t('voucherRemove')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            type="text"
                                            placeholder={t('voucherPlaceholder')}
                                            value={voucherCodeInput}
                                            onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleApplyVoucher()
                                                }
                                            }}
                                            className="flex-1 h-9 px-3 rounded-lg border border-border/80 bg-background text-xs font-mono placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleApplyVoucher()}
                                            disabled={validateVoucherMutation.isPending || !voucherCodeInput.trim()}
                                            className="h-9 px-3.5 text-xs font-bold rounded-lg shrink-0 gap-1"
                                        >
                                            {validateVoucherMutation.isPending && (
                                                <Loader2Icon className="size-3 animate-spin" />
                                            )}
                                            {t('voucherApply')}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Thẻ tóm tắt đơn hàng */}
                        <Card className="rounded-2xl border border-border/80 shadow-md overflow-hidden bg-card">
                            <CardHeader className="bg-muted/30 pb-4 border-b border-border/60">
                                <CardTitle className="text-base font-extrabold text-foreground flex items-center justify-between">
                                    <span>{t('summaryTitle')}</span>
                                    <ShieldCheckIcon className="size-4 text-emerald-600" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-6 space-y-4">
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{t('itemsSubtotal')}</span>
                                        <span className="font-semibold text-foreground">
                                            {formatCurrencyVND(subtotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{t('shippingFee')}</span>
                                        <div>
                                            {shippingDiscount > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="line-through text-muted-foreground/60 text-[11px]">
                                                        {formatCurrencyVND(standardShippingFee)}
                                                    </span>
                                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {netShippingFee > 0
                                                            ? formatCurrencyVND(netShippingFee)
                                                            : t('freeShipping')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-foreground">
                                                    {formatCurrencyVND(standardShippingFee)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {shippingDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                            <span className="flex items-center gap-1">
                                                <TruckIcon className="size-3" />
                                                Giảm phí ship ({appliedShippingVoucher?.code}):
                                            </span>
                                            <span className="font-bold">-{formatCurrencyVND(shippingDiscount)}</span>
                                        </div>
                                    )}
                                    {platformDiscount > 0 && (
                                        <div className="flex justify-between text-purple-700 dark:text-purple-400">
                                            <span className="flex items-center gap-1">
                                                <TagIcon className="size-3" />
                                                Voucher TimmyHub ({appliedPlatformVoucher?.code}):
                                            </span>
                                            <span className="font-bold">-{formatCurrencyVND(platformDiscount)}</span>
                                        </div>
                                    )}
                                    {shopDiscountDetails.map(({ shopId, voucher: sv, discount: sDisc }) => (
                                        <div
                                            key={shopId}
                                            className="flex justify-between text-blue-700 dark:text-blue-400"
                                        >
                                            <span className="flex items-center gap-1">
                                                <StoreIcon className="size-3" />
                                                Voucher Shop ({sv.code}):
                                            </span>
                                            <span className="font-bold">-{formatCurrencyVND(sDisc)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-3 border-t border-border/60 flex items-baseline justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-foreground block">
                                            {t('totalPayment')}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            (Đã bao gồm VAT nếu có)
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                                        {formatCurrencyVND(totalAmount)}
                                    </span>
                                </div>

                                <Button
                                    size="lg"
                                    onClick={handlePlaceOrder}
                                    disabled={
                                        checkoutMutation.isPending || checkoutItems.length === 0 || !activeAddress
                                    }
                                    className="w-full h-12 text-sm font-black rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all"
                                >
                                    {checkoutMutation.isPending ? (
                                        <>
                                            <Loader2Icon className="size-4 animate-spin" />
                                            <span>{t('placingOrder')}</span>
                                        </>
                                    ) : (
                                        <span>{t('placeOrderBtn')}</span>
                                    )}
                                </Button>

                                <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-[11px] text-muted-foreground border border-border/50">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <CheckCircle2Icon className="size-3.5 text-primary" />
                                        <span>TimmyHub Cam Kết</span>
                                    </div>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>Được kiểm tra hàng trước khi nhận</li>
                                        <li>Đổi trả miễn phí trong vòng 7 ngày</li>
                                        <li>Bảo mật thông tin thanh toán 100%</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
             * DIALOG QUẢN LÝ / CHỌN SỔ ĐỊA CHỈ NHẬN HÀNG
             * ───────────────────────────────────────────────────────────── */}
            <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold flex items-center justify-between">
                            <span>{t('addressModalTitle')}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsNewAddressFormOpen(true)}
                                className="text-xs font-bold gap-1 rounded-lg"
                            >
                                <PlusIcon className="size-3" />
                                {t('addAddress')}
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Danh sách địa chỉ hiện tại */}
                    <div className="space-y-3 pt-2">
                        {addressList.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground">
                                Bạn chưa có địa chỉ nào được lưu.
                            </div>
                        ) : (
                            addressList.map((addr) => {
                                const isSelected =
                                    selectedAddressId === addr.id ||
                                    (!selectedAddressId && addr.id === activeAddress?.id)

                                return (
                                    <div
                                        key={addr.id}
                                        onClick={() => {
                                            setSelectedAddressId(addr.id)
                                            setIsAddressModalOpen(false)
                                        }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border/70 hover:border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <Input
                                            type="radio"
                                            name="select-addr"
                                            checked={isSelected}
                                            readOnly
                                            className="pointer-events-none mt-1 size-4 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-xs sm:text-sm text-foreground">
                                                    {addr.fullName}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    ({addr.phone})
                                                </span>
                                                {addr.isDefault && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold"
                                                    >
                                                        {t('defaultBadge')}
                                                    </Badge>
                                                )}
                                                {addr.label && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-semibold text-muted-foreground"
                                                    >
                                                        {addr.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    addr.addressLine1,
                                                    addr.addressLine2,
                                                    addr.wardName,
                                                    addr.districtName,
                                                    addr.provinceName,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dùng chung AddressFormDialog chuẩn */}
            <AddressFormDialog
                open={isNewAddressFormOpen}
                onOpenChange={setIsNewAddressFormOpen}
                onSuccess={(created) => {
                    setSelectedAddressId(created.id)
                    setIsNewAddressFormOpen(false)
                    setIsAddressModalOpen(false)
                }}
            />

            {/* ─────────────────────────────────────────────────────────────
             * DIALOG CHỌN HOẶC NHẬP MÃ GIẢM GIÁ (VOUCHER)
             * ───────────────────────────────────────────────────────────── */}
            <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header Modal */}
                    <DialogHeader className="p-5 pb-3 border-b border-border/60">
                        <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                            <TicketIcon className="size-5 text-primary" />
                            <span>{t('voucherModalTitle') || 'Chọn TimmyHub Voucher'}</span>
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            {t('voucherModalDesc') ||
                                'Chọn 1 mã giảm giá hoặc mã miễn phí vận chuyển tốt nhất cho đơn hàng của bạn'}
                        </p>
                    </DialogHeader>

                    {/* Thanh nhập voucher trực tiếp (Shopee-Style Claim/Apply Bar) */}
                    <div className="p-4 bg-muted/20 border-b border-border/60 flex gap-2">
                        <Input
                            type="text"
                            placeholder={t('voucherPlaceholder') || 'Nhập mã voucher tại đây...'}
                            value={voucherModalInput}
                            onChange={(e) => setVoucherModalInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleApplyVoucher(voucherModalInput)
                                }
                            }}
                            className="flex-1 h-9 px-3 rounded-lg border border-border/80 bg-background text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyVoucher(voucherModalInput)}
                            disabled={validateVoucherMutation.isPending || !voucherModalInput.trim()}
                            className="h-9 px-4 text-xs font-bold rounded-lg shrink-0 gap-1"
                        >
                            {validateVoucherMutation.isPending && <Loader2Icon className="size-3 animate-spin" />}
                            {t('voucherApply') || 'Áp dụng'}
                        </Button>
                    </div>

                    {/* Tabs phân loại Voucher kiểu Shopee */}
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-border/60 overflow-x-auto no-scrollbar">
                        {(
                            [
                                { key: 'ALL', label: t('voucherTabAll') || 'Tất cả', count: modalTabCounts.ALL },
                                {
                                    key: 'SHIPPING',
                                    label: t('voucherTabShipping') || 'Freeship',
                                    count: modalTabCounts.SHIPPING,
                                },
                                {
                                    key: 'DISCOUNT',
                                    label: t('voucherTabDiscount') || 'Giảm giá',
                                    count: modalTabCounts.DISCOUNT,
                                },
                                {
                                    key: 'SAVED',
                                    label: t('voucherTabWallet') || 'Ví voucher',
                                    count: modalTabCounts.SAVED,
                                },
                            ] as const
                        ).map((tab) => {
                            const isActive = voucherCategoryTab === tab.key
                            return (
                                <Button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setVoucherCategoryTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                    }`}
                                    variant="ghost"
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1 rounded-full text-[10px] ${
                                            isActive
                                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </Button>
                            )
                        })}
                    </div>

                    {/* Danh sách voucher cuộn */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {isLoadingVouchers ? (
                            <div className="space-y-3 py-2">
                                <Skeleton className="h-24 w-full rounded-2xl" />
                                <Skeleton className="h-24 w-full rounded-2xl" />
                                <Skeleton className="h-24 w-full rounded-2xl" />
                            </div>
                        ) : filteredModalVouchers.length === 0 ? (
                            <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                                <TicketIcon className="size-8 mx-auto text-muted-foreground/40" />
                                <p>{t('noVouchersAvailable') || 'Không có mã giảm giá nào phù hợp ở mục này.'}</p>
                            </div>
                        ) : (
                            <>
                                {/* 1. NHÓM VOUCHER THỎA MÃN ĐIỀU KIỆN (Shopee Style) */}
                                {eligibleVouchers.length > 0 && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                                <CheckCircle2Icon className="size-3.5" />
                                                {t('voucherEligibleTitle') || 'Mã có thể áp dụng'} (
                                                {eligibleVouchers.length})
                                            </span>
                                            <span className="text-[11px] text-muted-foreground font-normal">
                                                Đã đạt điều kiện đơn hàng
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {eligibleVouchers.map(({ voucher: v, isSaved, estimatedDiscount }) => {
                                                const isShipping = v.type === 'FREE_SHIPPING'
                                                const isSeller = Boolean(v.sellerId)
                                                const isSelected = isShipping
                                                    ? selectedModalShippingCode === v.code
                                                    : isSeller
                                                      ? selectedModalShopCodes[v.sellerId!] === v.code
                                                      : selectedModalPlatformCode === v.code

                                                const handleToggle = () => {
                                                    if (isShipping) {
                                                        setSelectedModalShippingCode((prev) =>
                                                            prev === v.code ? null : v.code,
                                                        )
                                                    } else if (isSeller) {
                                                        const sId = v.sellerId!
                                                        setSelectedModalShopCodes((prev) => {
                                                            const next = { ...prev }
                                                            if (next[sId] === v.code) {
                                                                delete next[sId]
                                                            } else {
                                                                next[sId] = v.code
                                                            }
                                                            return next
                                                        })
                                                    } else {
                                                        setSelectedModalPlatformCode((prev) =>
                                                            prev === v.code ? null : v.code,
                                                        )
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={v.id}
                                                        onClick={handleToggle}
                                                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40'
                                                                : 'border-border/70 hover:border-primary/50 hover:bg-muted/20 bg-card'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            {/* Icon nhận diện loại voucher */}
                                                            <div
                                                                className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                                                                    isShipping
                                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                        : isSeller
                                                                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                                                          : 'bg-primary/10 text-primary'
                                                                }`}
                                                            >
                                                                {isShipping ? (
                                                                    <TruckIcon className="size-5" />
                                                                ) : isSeller ? (
                                                                    <StoreIcon className="size-5" />
                                                                ) : (
                                                                    <TagIcon className="size-5" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider">
                                                                        {v.code}
                                                                    </span>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] font-bold bg-muted text-foreground border-0 py-0 px-1.5"
                                                                    >
                                                                        {isShipping
                                                                            ? 'Freeship'
                                                                            : isSeller
                                                                              ? 'Shop'
                                                                              : v.campaignName || 'TimmyHub'}
                                                                    </Badge>
                                                                    {isSaved && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[9px] font-bold bg-primary/10 text-primary border-primary/30 py-0 px-1.5"
                                                                        >
                                                                            Trong ví
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs font-bold text-foreground truncate">
                                                                    {v.description ||
                                                                        (isShipping
                                                                            ? `Miễn phí vận chuyển đến ${formatCurrencyVND(v.value || 30000)}`
                                                                            : `Giảm ${v.value}%${v.maxDiscount ? ` tối đa ${formatCurrencyVND(v.maxDiscount)}` : ''}`)}
                                                                </p>

                                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                                                                    <span>
                                                                        {t('voucherMinOrder', {
                                                                            min: formatCurrencyVND(
                                                                                v.minOrderValue || 0,
                                                                            ),
                                                                        })}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>
                                                                        {v.endDate
                                                                            ? t('voucherExpiry', {
                                                                                  date: new Date(
                                                                                      v.endDate,
                                                                                  ).toLocaleDateString('vi-VN'),
                                                                              })
                                                                            : ''}
                                                                    </span>
                                                                </div>

                                                                {estimatedDiscount > 0 && (
                                                                    <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                                                                        Tiết kiệm {formatCurrencyVND(estimatedDiscount)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Checkbox / Radio Selection */}
                                                        <div className="shrink-0 pl-2">
                                                            <div
                                                                className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                                                                    isSelected
                                                                        ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                                        : 'border-border/80 bg-background'
                                                                }`}
                                                            >
                                                                {isSelected && (
                                                                    <CheckIcon className="size-3.5 stroke-[3]" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Nhóm B: Không đủ điều kiện */}
                                {ineligibleVouchers.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            <AlertCircleIcon className="size-3.5 text-amber-500" />
                                            <span>
                                                {t('voucherIneligibleTitle')} ({ineligibleVouchers.length})
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {ineligibleVouchers.map(({ voucher: v, isSaved, remaining, minOrder }) => {
                                                const isShipping = v.type === 'FREE_SHIPPING'
                                                const isSeller = Boolean(v.sellerId)

                                                return (
                                                    <div
                                                        key={v.id}
                                                        className="p-3.5 rounded-2xl border border-border/50 bg-muted/20 opacity-60 flex items-center justify-between gap-3 cursor-not-allowed select-none"
                                                    >
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className="size-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                                                {isShipping ? (
                                                                    <TruckIcon className="size-5" />
                                                                ) : isSeller ? (
                                                                    <StoreIcon className="size-5" />
                                                                ) : (
                                                                    <TagIcon className="size-5" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-muted-foreground uppercase tracking-wider">
                                                                        {v.code}
                                                                    </span>
                                                                    {isSaved && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[9px] bg-muted/40 text-muted-foreground border-border/60 py-0 px-1"
                                                                        >
                                                                            Trong ví
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs font-semibold text-muted-foreground truncate">
                                                                    {v.description || v.code}
                                                                </p>

                                                                <p className="text-[10px] font-semibold text-rose-500">
                                                                    {t('voucherConditionNotMet')}: Đơn tối thiểu{' '}
                                                                    {formatCurrencyVND(minOrder)} (Mua thêm{' '}
                                                                    {formatCurrencyVND(remaining)})
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Disabled Checkbox */}
                                                        <div className="shrink-0 pl-2">
                                                            <div className="size-5 rounded-md border border-border/40 bg-muted/40" />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Modal: Hành động Đồng ý / Bỏ chọn (Shopee-Style Multi-Voucher Footer) */}
                    <div className="p-4 bg-muted/40 border-t border-border/60 flex items-center justify-between gap-3">
                        <div className="text-xs min-w-0">
                            {selectedModalShippingCode ||
                            selectedModalPlatformCode ||
                            Object.keys(selectedModalShopCodes).length > 0 ? (
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-muted-foreground font-medium">
                                            {t('voucherSelectedLabel')}
                                        </span>
                                        {selectedModalShippingCode && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] py-0"
                                            >
                                                Freeship: {selectedModalShippingCode}
                                            </Badge>
                                        )}
                                        {selectedModalPlatformCode && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-purple-500/15 text-purple-700 dark:text-purple-400 font-mono text-[11px] py-0"
                                            >
                                                Sàn: {selectedModalPlatformCode}
                                            </Badge>
                                        )}
                                        {Object.entries(selectedModalShopCodes).map(([sId, code]) => (
                                            <Badge
                                                key={sId}
                                                variant="secondary"
                                                className="bg-blue-500/15 text-blue-700 dark:text-blue-400 font-mono text-[11px] py-0"
                                            >
                                                Shop: {code}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setSelectedModalShippingCode(null)
                                            setSelectedModalPlatformCode(null)
                                            setSelectedModalShopCodes({})
                                        }}
                                        className="text-[11px] text-destructive hover:underline cursor-pointer block"
                                        variant="ghost"
                                    >
                                        {t('voucherDeselect') || 'Bỏ chọn tất cả'}
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">
                                    {t('voucherNotSelected') || 'Chưa chọn voucher nào'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsVoucherModalOpen(false)}
                                className="h-9 px-4 text-xs font-bold rounded-xl"
                            >
                                {t('voucherBackBtn') || 'Trở lại'}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={validateVoucherMutation.isPending}
                                onClick={() => {
                                    // Áp dụng selection từ modal
                                    const shipV = selectedModalShippingCode
                                        ? combinedVouchers.find((cv) => cv.voucher.code === selectedModalShippingCode)
                                              ?.voucher || null
                                        : null
                                    const platV = selectedModalPlatformCode
                                        ? combinedVouchers.find((cv) => cv.voucher.code === selectedModalPlatformCode)
                                              ?.voucher || null
                                        : null
                                    const shopMap: Record<string, VoucherItem> = {}
                                    for (const [sId, c] of Object.entries(selectedModalShopCodes)) {
                                        const found = combinedVouchers.find((cv) => cv.voucher.code === c)?.voucher
                                        if (found) {
                                            shopMap[sId] = found
                                        }
                                    }

                                    setAppliedShippingVoucher(shipV)
                                    setAppliedPlatformVoucher(platV)
                                    setAppliedShopVouchers(shopMap)
                                    setIsVoucherModalOpen(false)

                                    const totalCount = (shipV ? 1 : 0) + (platV ? 1 : 0) + Object.keys(shopMap).length
                                    if (totalCount > 1) {
                                        toast.success(`Đã áp dụng thành công ${totalCount} voucher!`)
                                    } else if (shipV) {
                                        toast.success(`Đã áp dụng mã Freeship ${shipV.code}`)
                                    } else if (platV) {
                                        toast.success(`Đã áp dụng mã giảm giá ${platV.code}`)
                                    } else if (Object.keys(shopMap).length > 0) {
                                        toast.success(`Đã áp dụng mã giảm giá Shop!`)
                                    } else {
                                        toast.info('Đã bỏ áp dụng voucher')
                                    }
                                }}
                                className="h-9 px-5 text-xs font-bold rounded-xl gap-1.5"
                            >
                                {validateVoucherMutation.isPending && <Loader2Icon className="size-3.5 animate-spin" />}
                                {t('voucherSelectBtn') || 'Đồng ý'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
