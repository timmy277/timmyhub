import { z } from 'zod'

export const WishlistItemDtoSchema = z.object({
    id: z.string(),
    productId: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    images: z.array(z.string()),
    minPrice: z.number(),
    maxPrice: z.number(),
    ratingAvg: z.number(),
    ratingCount: z.number(),
    inStock: z.boolean(),
    createdAt: z.string(),
})

export type WishlistItemDto = z.infer<typeof WishlistItemDtoSchema>

export const WishlistListResponseSchema = z.object({
    items: z.array(WishlistItemDtoSchema),
    total: z.number(),
})

export type WishlistListResponseDto = z.infer<typeof WishlistListResponseSchema>

export const ToggleWishlistResponseSchema = z.object({
    inWishlist: z.boolean(),
    productId: z.string(),
})

export type ToggleWishlistResponseDto = z.infer<typeof ToggleWishlistResponseSchema>
