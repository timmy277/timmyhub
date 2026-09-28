// Chốt chặn open-redirect cho `callbackUrl` (REQ-IDN-033) — mọi chỗ điều hướng sau đăng nhập dùng chung hàm
// này, không nơi nào tự so tiền tố chuỗi.
//
// Vì sao phải resolve bằng URL chuẩn: trình duyệt coi `\` như `/`, nên `/\evil.com` và `\/evil.com` đều được
// hiểu là `//evil.com` (protocol-relative) và trỏ ra origin khác. Cách so `startsWith('/') && !startsWith('//')`
// cho hai giá trị đó lọt qua.

const SAFE_BASE_ORIGIN = 'http://localhost'

// Nhận `callbackUrl` thô từ query string, trả về đường dẫn tương đối an toàn trên cùng origin; mọi giá trị
// tuyệt đối/scheme khác/không parse được đều rơi về `fallback`.
export function resolveSafeCallbackUrl(value: string | null | undefined, fallback: string): string {
    if (!value) return fallback

    let resolved: URL
    try {
        resolved = new URL(value, SAFE_BASE_ORIGIN)
    } catch {
        return fallback
    }

    // Origin khác base ⇒ URL tuyệt đối hoặc protocol-relative (`//evil.com`, `/\evil.com`, `javascript:`…).
    if (resolved.origin !== SAFE_BASE_ORIGIN) return fallback

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
