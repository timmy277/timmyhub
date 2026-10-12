import { z } from 'zod'

// ===== Schema Hồ sơ cá nhân =====
export const ProfileFormSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(1, 'account.validation.firstNameRequired')
        .max(100, 'account.validation.firstNameRequired'),
    lastName: z
        .string()
        .trim()
        .min(1, 'account.validation.lastNameRequired')
        .max(100, 'account.validation.lastNameRequired'),
    displayName: z.string().trim().max(100, 'account.validation.displayNameMax').optional(),
    phone: z
        .string()
        .trim()
        .regex(/^0\d{9}$/, 'account.validation.phoneInvalid')
        .or(z.literal(''))
        .optional(),
    avatar: z.string().nullable().optional(),
})

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>

// ===== Schema Đổi mật khẩu =====
export const ChangePasswordFormSchema = z
    .object({
        currentPassword: z.string().min(1, 'account.validation.currentPasswordRequired'),
        newPassword: z
            .string()
            .min(8, 'account.validation.newPasswordMin')
            .regex(/[a-zA-Z]/, 'account.validation.newPasswordLetter')
            .regex(/[0-9]/, 'account.validation.newPasswordNumber'),
        confirmPassword: z.string().min(1, 'account.validation.confirmPasswordRequired'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'account.validation.passwordsDoNotMatch',
        path: ['confirmPassword'],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        message: 'account.validation.newPasswordDifferent',
        path: ['newPassword'],
    })

export type ChangePasswordFormValues = z.infer<typeof ChangePasswordFormSchema>

// ===== Schema Sổ địa chỉ =====
export const AddressFormSchema = z.object({
    fullName: z.string().trim().min(2, 'account.validation.fullNameRequired'),
    phone: z
        .string()
        .trim()
        .regex(/^0\d{9}$/, 'account.validation.phoneInvalid'),
    provinceName: z.string().trim().min(1, 'account.validation.provinceRequired'),
    districtName: z.string().trim().min(1, 'account.validation.districtRequired'),
    wardName: z.string().trim().min(1, 'account.validation.wardRequired'),
    addressLine1: z.string().trim().min(5, 'account.validation.addressLineRequired'),
    isDefault: z.boolean(),
})

export type AddressFormValues = z.infer<typeof AddressFormSchema>

// ===== Schema Cài đặt thông báo =====
export const NotificationPreferencesSchema = z.object({
    orderInApp: z.boolean(),
    orderEmail: z.boolean(),
    promoInApp: z.boolean(),
    promoEmail: z.boolean(),
    securityEmail: z.boolean(),
    chatInApp: z.boolean(),
})

export type NotificationPreferencesValues = z.infer<typeof NotificationPreferencesSchema>

export const NewsletterSubscriptionSchema = z.object({
    email: z.string().trim().email('validation.emailInvalid'),
})

export type NewsletterSubscriptionValues = z.infer<typeof NewsletterSubscriptionSchema>
