'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeftIcon,
    BanknoteIcon,
    CheckCircle2Icon,
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
import type { AddressDetail, CartDetail, CheckoutInput, ValidateVoucherResult } from '@timmyhub/contracts'

import { FloatInput } from '@/components'
import {
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

    const shippingFee = 0 // Miễn phí vận chuyển

    // 5. Trạng thái Voucher / Mã giảm giá
    const [voucherCodeInput, setVoucherCodeInput] = useState('')
    const [appliedVoucher, setAppliedVoucher] = useState<ValidateVoucherResult['voucher'] | null>(null)
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
    const [voucherModalInput, setVoucherModalInput] = useState('')

    const validateVoucherMutation = useValidateVoucher()
    const { data: availableVouchers = [], isLoading: isLoadingVouchers } = useAvailableVouchers(subtotal)

    // Tính toán số tiền được giảm từ voucher
    const voucherDiscount = useMemo(() => {
        if (!appliedVoucher) return 0
        if (appliedVoucher.minOrderValue && subtotal < appliedVoucher.minOrderValue) return 0

        let disc = 0
        if (appliedVoucher.type === 'PERCENTAGE') {
            disc = Math.floor((subtotal * appliedVoucher.value) / 100)
            if (appliedVoucher.maxDiscount && disc > appliedVoucher.maxDiscount) {
                disc = appliedVoucher.maxDiscount
            }
        } else if (appliedVoucher.type === 'FIXED_AMOUNT') {
            disc = Math.min(subtotal, appliedVoucher.value)
        } else if (appliedVoucher.type === 'FREE_SHIPPING') {
            disc = shippingFee
        }
        return Math.max(0, disc)
    }, [appliedVoucher, subtotal, shippingFee])

    const totalAmount = Math.max(0, subtotal + shippingFee - voucherDiscount)

    // Áp dụng voucher
    const handleApplyVoucher = async (codeToApply?: string) => {
        const code = (codeToApply || voucherCodeInput).trim().toUpperCase()
        if (!code) {
            toast.error(t('voucherPlaceholder') || 'Vui lòng nhập mã giảm giá')
            return
        }

        try {
            const result = await validateVoucherMutation.mutateAsync({
                code,
                subtotal,
            })

            if (result.valid && result.voucher) {
                setAppliedVoucher(result.voucher)
                setVoucherCodeInput(result.voucher.code)
                setVoucherModalInput(result.voucher.code)
                setIsVoucherModalOpen(false)
                toast.success('Áp dụng mã giảm giá thành công!')
            } else {
                toast.error('Mã giảm giá không hợp lệ')
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Không thể áp dụng mã giảm giá'
            toast.error(errMsg)
        }
    }

    // Gỡ voucher đã áp dụng
    const handleRemoveVoucher = () => {
        setAppliedVoucher(null)
        setVoucherCodeInput('')
        setVoucherModalInput('')
        toast.info('Đã hủy áp dụng mã giảm giá')
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
            voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
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
                                                        {shop.shopName}
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
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVoucherModalInput(voucherCodeInput)
                                            setIsVoucherModalOpen(true)
                                        }}
                                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        {t('voucherSelectOrEnter')}
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-5 space-y-3">
                                {appliedVoucher ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <TagIcon className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider truncate">
                                                        {appliedVoucher.code}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-0 py-0 px-1.5 font-bold"
                                                    >
                                                        -{formatCurrencyVND(voucherDiscount)}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {appliedVoucher.description ||
                                                        appliedVoucher.campaignName ||
                                                        'Voucher TimmyHub'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleRemoveVoucher}
                                            className="h-7 px-2 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0"
                                        >
                                            {t('voucherRemove')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
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
                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                            {t('freeShipping')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{t('voucherDiscount')}</span>
                                        <span
                                            className={
                                                voucherDiscount > 0
                                                    ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                                    : 'font-semibold text-muted-foreground'
                                            }
                                        >
                                            {voucherDiscount > 0 ? `-${formatCurrencyVND(voucherDiscount)}` : '-0₫'}
                                        </span>
                                    </div>
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
                                        <input
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
                <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 border-b border-border/60">
                        <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                            <TicketIcon className="size-5 text-primary" />
                            <span>{t('voucherModalTitle')}</span>
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">{t('voucherModalDesc')}</p>
                    </DialogHeader>

                    {/* Thanh nhập voucher trực tiếp trong popup */}
                    <div className="p-4 bg-muted/20 border-b border-border/60 flex gap-2">
                        <input
                            type="text"
                            placeholder={t('voucherPlaceholder')}
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
                            {t('voucherApply')}
                        </Button>
                    </div>

                    {/* Danh sách voucher khả dụng */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {t('voucherAvailableList')}
                        </div>

                        {isLoadingVouchers ? (
                            <div className="space-y-2.5 py-2">
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ) : availableVouchers.length === 0 ? (
                            <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                                <TicketIcon className="size-8 mx-auto text-muted-foreground/40" />
                                <p>{t('noVouchersAvailable')}</p>
                            </div>
                        ) : (
                            availableVouchers.map((v) => {
                                const isCurrent = appliedVoucher?.id === v.id
                                const minOrder = Number(v.minOrderValue) || 0
                                const isEligible = subtotal >= minOrder

                                let discountBadge = ''
                                if (v.type === 'PERCENTAGE') {
                                    discountBadge = `Giảm ${v.value}%${v.maxDiscount ? ` (Tối đa ${formatCurrencyVND(v.maxDiscount)})` : ''}`
                                } else if (v.type === 'FIXED_AMOUNT') {
                                    discountBadge = `Giảm ${formatCurrencyVND(v.value)}`
                                } else if (v.type === 'FREE_SHIPPING') {
                                    discountBadge = `Miễn phí vận chuyển`
                                }

                                return (
                                    <div
                                        key={v.id}
                                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                            isCurrent
                                                ? 'border-emerald-500 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/30'
                                                : isEligible
                                                  ? 'border-border/70 hover:border-primary/50 hover:bg-muted/20 bg-card'
                                                  : 'border-border/40 bg-muted/10 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div
                                                className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                    isEligible
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <TagIcon className="size-5" />
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-black text-xs text-foreground uppercase tracking-wider">
                                                        {v.code}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] font-bold bg-primary/15 text-primary border-0 py-0 px-1.5"
                                                    >
                                                        {discountBadge}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-semibold text-foreground/90 truncate">
                                                    {v.description || v.campaignName || v.code}
                                                </p>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                                    <span>
                                                        {t('voucherMinOrder', {
                                                            min: formatCurrencyVND(minOrder),
                                                        })}
                                                    </span>
                                                    {v.endDate && (
                                                        <span>
                                                            {t('voucherExpiry', {
                                                                date: new Date(v.endDate).toLocaleDateString('vi-VN'),
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                                {!isEligible && (
                                                    <p className="text-[10px] font-medium text-rose-500">
                                                        {t('voucherConditionNotMet')} (cần thêm{' '}
                                                        {formatCurrencyVND(minOrder - subtotal)})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 pl-2">
                                            {isCurrent ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs py-1 px-2.5"
                                                >
                                                    {t('voucherApplied')}
                                                </Badge>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={!isEligible || validateVoucherMutation.isPending}
                                                    onClick={() => handleApplyVoucher(v.code)}
                                                    className="h-8 px-3 text-xs font-bold rounded-lg"
                                                >
                                                    {t('voucherApply')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
