import { z } from 'zod'

import { apiMessageKey } from './i18n/translate'

// ===== Enums =====
export const VOUCHER_TYPE = {
    PERCENTAGE: 'PERCENTAGE',
    FIXED_AMOUNT: 'FIXED_AMOUNT',
    FREE_SHIPPING: 'FREE_SHIPPING',
} as const
export type VoucherTypeValue = (typeof VOUCHER_TYPE)[keyof typeof VOUCHER_TYPE]

export const CAMPAIGN_TYPE = {
    FLASH_SALE: 'FLASH_SALE',
    SEASONAL: 'SEASONAL',
    CATEGORY_BOOST: 'CATEGORY_BOOST',
} as const
export type CampaignTypeValue = (typeof CAMPAIGN_TYPE)[keyof typeof CAMPAIGN_TYPE]

export const CAMPAIGN_OWNER_TYPE = {
    PLATFORM: 'PLATFORM',
    SELLER: 'SELLER',
} as const
export type CampaignOwnerTypeValue = (typeof CAMPAIGN_OWNER_TYPE)[keyof typeof CAMPAIGN_OWNER_TYPE]

export const CAMPAIGN_PRODUCT_APPROVAL = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const
export type CampaignProductApprovalValue = (typeof CAMPAIGN_PRODUCT_APPROVAL)[keyof typeof CAMPAIGN_PRODUCT_APPROVAL]

export const USER_VOUCHER_STATUS = {
    SAVED: 'SAVED',
    USED: 'USED',
    EXPIRED: 'EXPIRED',
} as const
export type UserVoucherStatusValue = (typeof USER_VOUCHER_STATUS)[keyof typeof USER_VOUCHER_STATUS]

// ===== Voucher Schemas =====

export const CreateVoucherInputSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(3, apiMessageKey('validation.voucherCodeMin'))
            .max(30, apiMessageKey('validation.voucherCodeMax'))
            .regex(/^[A-Z0-9_-]+$/, apiMessageKey('validation.voucherCodePattern'))
            .transform((val) => val.toUpperCase()),
        type: z.enum([VOUCHER_TYPE.PERCENTAGE, VOUCHER_TYPE.FIXED_AMOUNT, VOUCHER_TYPE.FREE_SHIPPING]),
        value: z.coerce.number().positive(apiMessageKey('validation.voucherValuePositive')),
        minOrderValue: z.coerce.number().nonnegative().optional().nullable(),
        maxDiscount: z.coerce.number().positive().optional().nullable(),
        usageLimit: z.coerce.number().int().positive().optional().nullable(),
        perUserLimit: z.coerce.number().int().positive().default(1),
        isActive: z.boolean().default(true),
        startDate: z.string().min(1, apiMessageKey('validation.voucherStartDateRequired')),
        endDate: z.string().min(1, apiMessageKey('validation.voucherEndDateRequired')),
        description: z.string().trim().max(500).optional().nullable(),
        campaignId: z.string().trim().optional().nullable(),
        sellerId: z.string().trim().optional().nullable(),
        categoryIds: z.array(z.string()).default([]),
        productIds: z.array(z.string()).default([]),
        paymentMethods: z.array(z.string()).default([]),
        maxUsagePerDevice: z.coerce.number().int().positive().optional().nullable(),
    })
    .refine(
        (data) => {
            if (!data.startDate || !data.endDate) return true
            return new Date(data.endDate) > new Date(data.startDate)
        },
        {
            message: apiMessageKey('validation.voucherEndDateAfterStart'),
            path: ['endDate'],
        },
    )
export type CreateVoucherInput = z.infer<typeof CreateVoucherInputSchema>

export const UpdateVoucherInputSchema = z
    .object({
        code: z
            .string()
            .trim()
            .min(3, apiMessageKey('validation.voucherCodeMin'))
            .max(30, apiMessageKey('validation.voucherCodeMax'))
            .regex(/^[A-Z0-9_-]+$/, apiMessageKey('validation.voucherCodePattern'))
            .transform((val) => val.toUpperCase())
            .optional(),
        type: z.enum([VOUCHER_TYPE.PERCENTAGE, VOUCHER_TYPE.FIXED_AMOUNT, VOUCHER_TYPE.FREE_SHIPPING]).optional(),
        value: z.coerce.number().positive(apiMessageKey('validation.voucherValuePositive')).optional(),
        minOrderValue: z.coerce.number().nonnegative().optional().nullable(),
        maxDiscount: z.coerce.number().positive().optional().nullable(),
        usageLimit: z.coerce.number().int().positive().optional().nullable(),
        perUserLimit: z.coerce.number().int().positive().optional(),
        isActive: z.boolean().optional(),
        startDate: z.string().min(1, apiMessageKey('validation.voucherStartDateRequired')).optional(),
        endDate: z.string().min(1, apiMessageKey('validation.voucherEndDateRequired')).optional(),
        description: z.string().trim().max(500).optional().nullable(),
        campaignId: z.string().trim().optional().nullable(),
        sellerId: z.string().trim().optional().nullable(),
        categoryIds: z.array(z.string()).optional(),
        productIds: z.array(z.string()).optional(),
        paymentMethods: z.array(z.string()).optional(),
        maxUsagePerDevice: z.coerce.number().int().positive().optional().nullable(),
    })
    .refine(
        (data) => {
            if (!data.startDate || !data.endDate) return true
            return new Date(data.endDate) > new Date(data.startDate)
        },
        {
            message: apiMessageKey('validation.voucherEndDateAfterStart'),
            path: ['endDate'],
        },
    )
export type UpdateVoucherInput = z.infer<typeof UpdateVoucherInputSchema>

export const VoucherListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    q: z.string().trim().optional(),
    type: z.enum([VOUCHER_TYPE.PERCENTAGE, VOUCHER_TYPE.FIXED_AMOUNT, VOUCHER_TYPE.FREE_SHIPPING]).optional(),
    isActive: z
        .preprocess((val) => {
            if (val === 'true' || val === true) return true
            if (val === 'false' || val === false) return false
            return undefined
        }, z.boolean().optional())
        .optional(),
    scope: z.enum(['ALL', 'PLATFORM', 'SELLER']).optional().default('ALL'),
    sellerId: z.string().trim().optional(),
    campaignId: z.string().trim().optional(),
})
export type VoucherListQuery = z.infer<typeof VoucherListQuerySchema>

export interface VoucherItem {
    id: string
    code: string
    type: VoucherTypeValue
    value: number
    minOrderValue?: number | null | undefined
    maxDiscount?: number | null | undefined
    usageLimit?: number | null | undefined
    usedCount: number
    perUserLimit: number
    isActive: boolean
    startDate: string
    endDate: string
    description?: string | null | undefined
    sellerId?: string | null | undefined
    campaignId?: string | null | undefined
    campaignName?: string | null | undefined
    categoryIds: string[]
    productIds: string[]
    paymentMethods: string[]
    createdAt: string
    updatedAt: string
}

export interface VoucherDetail extends VoucherItem {
    campaign?:
        | {
              id: string
              name: string
              type: string
              startDate: string
              endDate: string
              isActive: boolean
          }
        | null
        | undefined
    totalOrdersDiscounted?: number | undefined
    totalDiscountAmount?: number | undefined
}

export interface UserVoucherItem {
    id: string
    userId: string
    voucherId: string
    savedAt: string
    status: 'SAVED' | 'USED' | 'EXPIRED'
    voucher: VoucherItem
}

// ===== Promotion Campaign Schemas =====

export const CreatePromotionCampaignInputSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(3, apiMessageKey('validation.campaignNameMin'))
            .max(150, apiMessageKey('validation.campaignNameMax')),
        description: z.string().trim().max(1000).optional().nullable(),
        type: z.enum([CAMPAIGN_TYPE.FLASH_SALE, CAMPAIGN_TYPE.SEASONAL, CAMPAIGN_TYPE.CATEGORY_BOOST]),
        ownerType: z
            .enum([CAMPAIGN_OWNER_TYPE.PLATFORM, CAMPAIGN_OWNER_TYPE.SELLER])
            .default(CAMPAIGN_OWNER_TYPE.PLATFORM),
        ownerId: z.string().trim().optional().nullable(),
        startDate: z.string().min(1, apiMessageKey('validation.campaignStartDateRequired')),
        endDate: z.string().min(1, apiMessageKey('validation.campaignEndDateRequired')),
        isActive: z.boolean().default(true),
        requiresApproval: z.boolean().default(false),
        banner: z
            .string()
            .trim()
            .url(apiMessageKey('validation.imageUrlInvalid'))
            .optional()
            .nullable()
            .or(z.literal('')),
        icon: z.string().trim().optional().nullable(),
        backgroundColor: z.string().trim().optional().nullable(),
        titleColor: z.string().trim().optional().nullable(),
        badgeText: z.string().trim().max(50).optional().nullable(),
    })
    .refine(
        (data) => {
            if (!data.startDate || !data.endDate) return true
            return new Date(data.endDate) > new Date(data.startDate)
        },
        {
            message: apiMessageKey('validation.campaignEndDateAfterStart'),
            path: ['endDate'],
        },
    )
export type CreatePromotionCampaignInput = z.infer<typeof CreatePromotionCampaignInputSchema>

export const UpdatePromotionCampaignInputSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(3, apiMessageKey('validation.campaignNameMin'))
            .max(150, apiMessageKey('validation.campaignNameMax'))
            .optional(),
        description: z.string().trim().max(1000).optional().nullable(),
        type: z.enum([CAMPAIGN_TYPE.FLASH_SALE, CAMPAIGN_TYPE.SEASONAL, CAMPAIGN_TYPE.CATEGORY_BOOST]).optional(),
        ownerType: z.enum([CAMPAIGN_OWNER_TYPE.PLATFORM, CAMPAIGN_OWNER_TYPE.SELLER]).optional(),
        ownerId: z.string().trim().optional().nullable(),
        startDate: z.string().min(1, apiMessageKey('validation.campaignStartDateRequired')).optional(),
        endDate: z.string().min(1, apiMessageKey('validation.campaignEndDateRequired')).optional(),
        isActive: z.boolean().optional(),
        requiresApproval: z.boolean().optional(),
        banner: z
            .string()
            .trim()
            .url(apiMessageKey('validation.imageUrlInvalid'))
            .optional()
            .nullable()
            .or(z.literal('')),
        icon: z.string().trim().optional().nullable(),
        backgroundColor: z.string().trim().optional().nullable(),
        titleColor: z.string().trim().optional().nullable(),
        badgeText: z.string().trim().max(50).optional().nullable(),
    })
    .refine(
        (data) => {
            if (!data.startDate || !data.endDate) return true
            return new Date(data.endDate) > new Date(data.startDate)
        },
        {
            message: apiMessageKey('validation.campaignEndDateAfterStart'),
            path: ['endDate'],
        },
    )
export type UpdatePromotionCampaignInput = z.infer<typeof UpdatePromotionCampaignInputSchema>

export const PromotionCampaignListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    q: z.string().trim().optional(),
    type: z.enum([CAMPAIGN_TYPE.FLASH_SALE, CAMPAIGN_TYPE.SEASONAL, CAMPAIGN_TYPE.CATEGORY_BOOST]).optional(),
    isActive: z
        .preprocess((val) => {
            if (val === 'true' || val === true) return true
            if (val === 'false' || val === false) return false
            return undefined
        }, z.boolean().optional())
        .optional(),
    ownerType: z.enum([CAMPAIGN_OWNER_TYPE.PLATFORM, CAMPAIGN_OWNER_TYPE.SELLER]).optional(),
})
export type PromotionCampaignListQuery = z.infer<typeof PromotionCampaignListQuerySchema>

export interface CampaignProductItem {
    id: string
    campaignId: string
    variantId: string
    campaignPrice?: number | null | undefined
    discountPercent?: number | null | undefined
    maxQuantity?: number | null | undefined
    soldQuantity: number
    approvalStatus: CampaignProductApprovalValue
    productName?: string | undefined
    variantSku?: string | undefined
    originalPrice?: number | undefined
    imageUrl?: string | undefined
}

export interface PromotionCampaignItem {
    id: string
    name: string
    description?: string | null | undefined
    type: CampaignTypeValue
    ownerType: CampaignOwnerTypeValue
    ownerId?: string | null | undefined
    startDate: string
    endDate: string
    isActive: boolean
    requiresApproval: boolean
    banner?: string | null | undefined
    icon?: string | null | undefined
    backgroundColor?: string | null | undefined
    titleColor?: string | null | undefined
    badgeText?: string | null | undefined
    createdBy?: string | null | undefined
    createdAt: string
    updatedAt: string
    productCount?: number | undefined
    voucherCount?: number | undefined
}

export interface PromotionCampaignDetail extends PromotionCampaignItem {
    campaignProducts: CampaignProductItem[]
    vouchers: VoucherItem[]
}

export const ValidateVoucherInputSchema = z.object({
    code: z.string().trim().min(1),
    subtotal: z.number().nonnegative(),
    shopIds: z.array(z.string().trim()).optional(),
    paymentMethod: z.string().trim().optional(),
})
export type ValidateVoucherInput = z.infer<typeof ValidateVoucherInputSchema>

export interface ValidateVoucherResult {
    valid: boolean
    voucher: {
        id: string
        code: string
        type: VoucherTypeValue
        value: number
        minOrderValue?: number | null
        maxDiscount?: number | null
        description?: string | null
        campaignName?: string | null
        sellerId?: string | null
    }
    discountAmount: number
    finalTotal: number
}
