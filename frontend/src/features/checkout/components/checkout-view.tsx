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
    TruckIcon,
    WalletIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { AddressDetail, CartDetail, CheckoutInput, CreateAddressInput } from '@timmyhub/contracts'

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
    Skeleton,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useAddresses, useCart, useCheckout, useCreateAddress, usePublicProductDetail } from '@/hooks'
import { formatCurrencyVND } from '@/utils'

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
    const { data: addresses = [] } = useAddresses()

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

    // Form thêm địa chỉ mới
    const [newAddressForm, setNewAddressForm] = useState<CreateAddressInput>({
        fullName: '',
        phone: '',
        provinceCode: '79',
        provinceName: 'TP. Hồ Chí Minh',
        districtCode: '760',
        districtName: 'Quận 1',
        wardCode: '26734',
        wardName: 'Phường Bến Nghé',
        addressLine1: '',
        addressLine2: '',
        label: 'Nhà riêng',
        isDefault: true,
    })

    const createAddressMutation = useCreateAddress()

    // Địa chỉ hiện tại đang chọn (ưu tiên địa chỉ người dùng click chọn -> địa chỉ mặc định -> địa chỉ đầu tiên)
    const activeAddress = useMemo(() => {
        const addressList = addresses.length > 0 ? addresses : initialAddresses
        if (selectedAddressId) {
            const found = addressList.find((a) => a.id === selectedAddressId)
            if (found) return found
        }
        const defaultAddr = addressList.find((a) => a.isDefault)
        return defaultAddr || addressList[0] || null
    }, [addresses, initialAddresses, selectedAddressId])

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

    // Tính tổng tiền thanh toán
    const subtotal = useMemo(() => {
        return checkoutItems.reduce((acc, shop) => {
            const shopTotal = shop.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0)
            return acc + shopTotal
        }, 0)
    }, [checkoutItems])

    const shippingFee = 0 // Miễn phí vận chuyển
    const totalAmount = subtotal + shippingFee

    // 5. Đặt hàng Mutation
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

    // Xử lý submit form tạo địa chỉ mới
    const handleCreateAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newAddressForm.fullName.trim() || !newAddressForm.phone.trim() || !newAddressForm.addressLine1.trim()) {
            toast.error('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng')
            return
        }

        try {
            const created = await createAddressMutation.mutateAsync(newAddressForm)
            setSelectedAddressId(created.id)
            setIsNewAddressFormOpen(false)
            setIsAddressModalOpen(false)
        } catch {
            // Error đã toast
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
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddressModalOpen(true)}
                                        className="h-8 text-xs font-semibold rounded-lg"
                                    >
                                        {activeAddress ? t('changeAddress') : t('addAddress')}
                                    </Button>
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
                                        <Label
                                            htmlFor="customer-note"
                                            className="text-xs font-semibold text-muted-foreground mb-1.5 block"
                                        >
                                            {t('customerNote')}
                                        </Label>
                                        <Input
                                            id="customer-note"
                                            placeholder={t('customerNotePlaceholder')}
                                            value={customerNote}
                                            onChange={(e) => setCustomerNote(e.target.value)}
                                            maxLength={200}
                                            className="h-10 text-xs rounded-xl"
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
                    <div className="lg:col-span-4 sticky top-20 space-y-5">
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
                                        <span className="font-semibold text-muted-foreground">-0₫</span>
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
                            <span>{isNewAddressFormOpen ? t('newAddressModalTitle') : t('addressModalTitle')}</span>
                            {!isNewAddressFormOpen && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsNewAddressFormOpen(true)}
                                    className="text-xs font-bold gap-1 rounded-lg"
                                >
                                    <PlusIcon className="size-3" />
                                    {t('addAddress')}
                                </Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {isNewAddressFormOpen ? (
                        /* Form thêm địa chỉ mới */
                        <form onSubmit={handleCreateAddressSubmit} className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('fullName')}</Label>
                                    <Input
                                        value={newAddressForm.fullName}
                                        onChange={(e) => setNewAddressForm((p) => ({ ...p, fullName: e.target.value }))}
                                        placeholder="Nguyễn Văn A"
                                        required
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('phone')}</Label>
                                    <Input
                                        value={newAddressForm.phone}
                                        onChange={(e) => setNewAddressForm((p) => ({ ...p, phone: e.target.value }))}
                                        placeholder="0912345678"
                                        required
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('province')}</Label>
                                    <Input
                                        value={newAddressForm.provinceName}
                                        onChange={(e) =>
                                            setNewAddressForm((p) => ({ ...p, provinceName: e.target.value }))
                                        }
                                        required
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('district')}</Label>
                                    <Input
                                        value={newAddressForm.districtName}
                                        onChange={(e) =>
                                            setNewAddressForm((p) => ({ ...p, districtName: e.target.value }))
                                        }
                                        required
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('ward')}</Label>
                                    <Input
                                        value={newAddressForm.wardName}
                                        onChange={(e) => setNewAddressForm((p) => ({ ...p, wardName: e.target.value }))}
                                        required
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('addressLine1')}</Label>
                                <Input
                                    value={newAddressForm.addressLine1}
                                    onChange={(e) => setNewAddressForm((p) => ({ ...p, addressLine1: e.target.value }))}
                                    placeholder="123 Đường Lê Lợi, Toà nhà Bitexco"
                                    required
                                    className="h-9 text-xs rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('addressLabel')}</Label>
                                    <Input
                                        value={newAddressForm.label || ''}
                                        onChange={(e) => setNewAddressForm((p) => ({ ...p, label: e.target.value }))}
                                        placeholder="Nhà riêng / Văn phòng"
                                        className="h-9 text-xs rounded-lg"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="set-default-check"
                                        checked={Boolean(newAddressForm.isDefault)}
                                        onChange={(e) =>
                                            setNewAddressForm((p) => ({ ...p, isDefault: e.target.checked }))
                                        }
                                        className="size-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="set-default-check" className="text-xs font-semibold cursor-pointer">
                                        {t('setDefault')}
                                    </Label>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsNewAddressFormOpen(false)}
                                    className="h-9 text-xs rounded-lg"
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={createAddressMutation.isPending}
                                    className="h-9 text-xs font-bold rounded-lg"
                                >
                                    {createAddressMutation.isPending ? 'Đang lưu...' : t('save')}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        /* Danh sách địa chỉ hiện tại */
                        <div className="space-y-3 pt-2">
                            {addresses.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    Bạn chưa có địa chỉ nào được lưu.
                                </div>
                            ) : (
                                addresses.map((addr) => {
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
                                                onChange={() => {
                                                    setSelectedAddressId(addr.id)
                                                    setIsAddressModalOpen(false)
                                                }}
                                                className="mt-1 size-4 text-primary focus:ring-primary"
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
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
