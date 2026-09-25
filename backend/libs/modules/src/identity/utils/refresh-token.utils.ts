import { createHash, randomBytes } from 'node:crypto'

import { REFRESH_TOKEN_BYTES } from '../identity.constants'

// DB chỉ lưu SHA-256 của refresh token — lộ bảng refresh_tokens cũng không dùng lại được token.
export function hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
}

// REQ-IDN-003: refresh token là chuỗi ngẫu nhiên 256 bit, không phải JWT.
export function generateRawRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}
