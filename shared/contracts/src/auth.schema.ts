import { z } from 'zod'

// REQ-IDN-001: mật khẩu >= 8 ký tự, có chữ và số. Danh sách mật khẩu phổ biến kiểm ở service layer.
const PasswordSchema = z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[a-zA-Z]/, 'Mật khẩu phải có ít nhất một chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất một số')

export const RegisterSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: PasswordSchema,
    firstName: z.string().min(1, 'Họ không được để trống'),
    lastName: z.string().min(1, 'Tên không được để trống'),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
    deviceName: z.string().optional(),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const RefreshSchema = z.object({
    refreshToken: z.string().min(1, 'refreshToken không được để trống'),
})
export type RefreshInput = z.infer<typeof RefreshSchema>

export const LogoutSchema = z.object({
    refreshToken: z.string().min(1, 'refreshToken không được để trống'),
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
        roles: string[]
    }
}
