import { z } from 'zod'

import { apiMessageKey } from './i18n/translate'
import type { UserRole } from './roles'

// Message của zod là khoá thông điệp (`api.*` phía FE), không phải câu — BE dịch ở ZodValidationPipe, FE dịch bằng
// next-intl. Tham số (vd `{minimum}`) lấy từ chính issue của zod.

// REQ-IDN-001: mật khẩu >= 8 ký tự, có chữ và số. Danh sách mật khẩu phổ biến kiểm ở service layer.
export const PASSWORD_MIN_LENGTH = 8

// Export để schema tạo người dùng của admin (user.schema.ts) dùng lại đúng chính sách mật khẩu — không chép tay.
export const PasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH, apiMessageKey('validation.passwordMin'))
    .regex(/[a-zA-Z]/, apiMessageKey('validation.passwordLetter'))
    .regex(/[0-9]/, apiMessageKey('validation.passwordDigit'))

export const EmailSchema = z.string().email(apiMessageKey('validation.emailInvalid'))
const RefreshTokenSchema = z.string().min(1, apiMessageKey('validation.required'))

export const RegisterSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
    firstName: z.string().min(1, apiMessageKey('validation.firstNameRequired')),
    lastName: z.string().min(1, apiMessageKey('validation.lastNameRequired')),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
    email: EmailSchema,
    password: z.string().min(1, apiMessageKey('validation.passwordRequired')),
    deviceName: z.string().optional(),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const RefreshSchema = z.object({
    refreshToken: RefreshTokenSchema,
})
export type RefreshInput = z.infer<typeof RefreshSchema>

export const LogoutSchema = z.object({
    refreshToken: RefreshTokenSchema,
})
export type LogoutInput = z.infer<typeof LogoutSchema>

export type AuthTokens = {
    accessToken: string
    refreshToken: string
}

export type AuthResult = AuthTokens & {
    user: {
        id: string
        email: string
        roles: UserRole[]
        displayName?: string | null
        avatar?: string | null
    }
}
