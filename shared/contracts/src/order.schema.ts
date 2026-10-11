import { z } from 'zod'

// ===== Enums =====
export const ORDER_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PROCESSING: 'PROCESSING',
    PACKED: 'PACKED',
    SHIPPING: 'SHIPPING',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    RETURN_REQUESTED: 'RETURN_REQUESTED',
    RETURNED: 'RETURNED',
    REFUNDED: 'REFUNDED',
} as const
export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const PAYMENT_METHOD = {
    COD: 'COD',
    VNPAY: 'VNPAY',
    WALLET: 'WALLET',
} as const
export type PaymentMethodType = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

// ===== Sổ địa chỉ giao hàng (Addresses) =====
export const CreateAddressInputSchema = z.object({
    fullName: z.string().trim().min(2, 'validation.fullNameMin').max(100, 'validation.fullNameMax'),
    phone: z
        .string()
        .trim()
        .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'validation.phoneInvalid'),
    provinceCode: z.string().trim().min(1, 'validation.provinceRequired'),
    provinceName: z.string().trim().min(1, 'validation.provinceRequired'),
    districtCode: z.string().trim().min(1, 'validation.districtRequired'),
    districtName: z.string().trim().min(1, 'validation.districtRequired'),
    wardCode: z.string().trim().min(1, 'validation.wardRequired'),
    wardName: z.string().trim().min(1, 'validation.wardRequired'),
    addressLine1: z.string().trim().min(3, 'validation.addressLineRequired').max(255),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    label: z.string().trim().max(50).optional().nullable(),
    isDefault: z.boolean().optional().default(false),
})
export type CreateAddressInput = z.infer<typeof CreateAddressInputSchema>

export const UpdateAddressInputSchema = CreateAddressInputSchema.partial()
export type UpdateAddressInput = z.infer<typeof UpdateAddressInputSchema>

export interface AddressDetail {
    id: string
    userId: string
    label?: string | null
    fullName: string
    phone: string
    addressLine1: string
    addressLine2?: string | null
    provinceCode: string
    districtCode: string
    wardCode: string
    provinceName: string
    districtName: string
    wardName: string
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

// ===== Checkout & Orders =====
export const CheckoutItemInputSchema = z.object({
    variantId: z.string().trim().min(1, 'validation.variantRequired'),
    quantity: z.number().int().min(1, 'validation.quantityMin').max(99, 'validation.quantityMax'),
})
export type CheckoutItemInput = z.infer<typeof CheckoutItemInputSchema>

export const CheckoutInputSchema = z.object({
    addressId: z.string().trim().optional(),
    newAddress: CreateAddressInputSchema.optional(),
    paymentMethod: z.enum(['COD', 'VNPAY', 'WALLET']).default('COD'),
    cartItemIds: z.array(z.string().trim()).optional(),
    directItem: CheckoutItemInputSchema.optional(),
    customerNote: z.string().trim().max(500).optional(),
    voucherCode: z.string().trim().optional(),
    voucherCodes: z.array(z.string().trim()).optional(),
    idempotencyKey: z.string().trim().optional(),
})
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>

export interface OrderItemDetail {
    id: string
    productId: string
    variantId: string
    productName: string
    variantLabel: string
    sku: string
    imageUrl: string
    unitPrice: string
    quantity: number
    lineTotal: string
    isReviewed: boolean
}

export const CancelOrderInputSchema = z.object({
    reason: z.string().trim().max(300).optional(),
})
export type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>

export const UpdateOrderStatusInputSchema = z.object({
    status: z.enum([
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'SHIPPING',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
        'RETURN_REQUESTED',
        'RETURNED',
        'REFUNDED',
    ]),
    note: z.string().trim().max(300).optional(),
})
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>

export interface OrderStatusHistoryDetail {
    id: string
    fromStatus?: string | null
    toStatus: string
    reason?: string | null
    actorRole?: string | null
    createdAt: string
}

export interface OrderVoucherDetail {
    id: string
    code: string
    type: string
    discount: string
    description?: string | null
}

export interface OrderDetail {
    id: string
    buyerId: string
    sellerId: string
    shopName?: string | undefined
    shopSlug?: string | undefined
    status: OrderStatusType
    totalAmount: string
    currency: string
    voucherId?: string | null
    voucherDiscount?: string | null
    voucherCode?: string | null
    vouchers?: OrderVoucherDetail[] | undefined
    shippingFee: string
    paymentStatus: string
    paymentMethod: PaymentMethodType
    addressId: string
    shippingFullName: string
    shippingPhone: string
    shippingAddress: string
    customerNote?: string | null
    cancelReason?: string | null
    createdAt: string
    updatedAt: string
    items: OrderItemDetail[]
    statusHistory?: OrderStatusHistoryDetail[] | undefined
}

export interface CheckoutResult {
    orders: OrderDetail[]
    totalAmount: string
    paymentMethod: PaymentMethodType
    paymentUrl?: string | null
}
