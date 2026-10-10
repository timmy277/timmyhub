import { z } from 'zod'

// ===== Enums & Error Codes =====
export const CART_INVALID_REASON = {
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    EXCEEDS_STOCK: 'EXCEEDS_STOCK',
    PRODUCT_DEACTIVATED: 'PRODUCT_DEACTIVATED',
    PRODUCT_NOT_APPROVED: 'PRODUCT_NOT_APPROVED',
    PRICE_CHANGED: 'PRICE_CHANGED',
    CANNOT_BUY_OWN_PRODUCT: 'CANNOT_BUY_OWN_PRODUCT',
} as const

export type CartInvalidReason = (typeof CART_INVALID_REASON)[keyof typeof CART_INVALID_REASON]

// ===== Schemas =====

// Thêm sản phẩm vào giỏ hàng (FEAT-CRT-002, REQ-CRT-002)
export const AddToCartInputSchema = z.object({
    variantId: z.string().trim().min(1, 'validation.variantRequired'),
    quantity: z.number().int().min(1, 'validation.quantityMin').max(99, 'validation.quantityMax').default(1),
})
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>

// Sửa số lượng sản phẩm trong giỏ (REQ-CRT-004)
export const UpdateCartItemInputSchema = z.object({
    quantity: z.number().int().min(1, 'validation.quantityMin').max(99, 'validation.quantityMax'),
})
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInputSchema>

// Chi tiết 1 item trong giỏ
export interface CartItemDetail {
    id: string
    cartId: string
    productId: string
    variantId: string
    quantity: number
    productName: string
    productSlug: string
    productImage?: string | null
    variantSku?: string | null
    variantOptions?: Record<string, string>
    price: string
    stock: number
    shopId: string
    shopName: string
    isValid: boolean
    invalidReason?: string | null
}

// Nhóm item theo gian hàng (REQ-CRT-008)
export interface CartShopGroup {
    shopId: string
    shopName: string
    items: CartItemDetail[]
    subtotal: string
}

// Toàn bộ giỏ hàng của user
export interface CartDetail {
    id: string
    userId: string
    totalItems: number
    totalUniqueItems: number
    totalAmount: string
    shopGroups: CartShopGroup[]
    items: CartItemDetail[]
}
