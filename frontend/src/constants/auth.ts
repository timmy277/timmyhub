// Hằng số phiên đăng nhập — token KHÔNG persist ở client (localStorage/cookie thường), chỉ sống trong
// cookie HttpOnly mã hoá của NextAuth (REQ-IDN-022).

// TTL access token phía BE (identity.constants.ts: ACCESS_TOKEN_TTL = '15m'). FE chỉ dùng để lên lịch
// refresh phiên trước hạn — đổi BE thì đổi cả đây.
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000

// Trễ trước khi token hết hạn thì chủ động refresh phiên (30 giây).
export const TOKEN_REFRESH_MARGIN_MS = 30 * 1000

// Tuổi tối đa của phiên NextAuth — khớp TTL refresh token 30 ngày ở backend (REQ-IDN-003).
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

// Tên cookie phiên của Auth.js v5 — salt giải mã JWT phải khớp đúng tên cookie này (xem actions logout).
export const AUTH_SESSION_COOKIE_NAME = 'authjs.session-token'
export const AUTH_SESSION_COOKIE_NAME_SECURE = '__Secure-authjs.session-token'

// Mã lỗi chỉ có ở phía FE (backend không trả mã này): không gọi được backend — khác hẳn "sai thông tin
// đăng nhập", nên UI phải báo khác (`login.loginUnavailable`).
export const BACKEND_UNAVAILABLE_CODE = 'BACKEND_UNAVAILABLE'
