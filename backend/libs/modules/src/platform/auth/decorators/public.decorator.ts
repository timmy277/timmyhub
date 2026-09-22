import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

// Đánh dấu endpoint không cần xác thực — JwtAuthGuard bỏ qua khi thấy metadata này (ở handler hoặc cả class).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
