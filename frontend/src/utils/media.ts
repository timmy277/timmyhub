/**
 * Chuyển đường dẫn tương đối `/uploads/...` (local dev fallback khi không có S3/Supabase)
 * thành URL tuyệt đối trỏ về backend để next/image optimizer có thể fetch ảnh.
 *
 * - Client-side: dùng `NEXT_PUBLIC_API_URL` (available trong browser)
 * - Server-side (next/image optimizer): NEXT_PUBLIC_ vars không inject vào server runtime,
 *   nên hardcode `http://localhost:3001` — đây là dev-only fallback, không ảnh hưởng production.
 * - URL tuyệt đối (Supabase/S3/CDN) được trả về nguyên vẹn.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('/uploads/')) {
        // NEXT_PUBLIC_API_URL được inject lúc build — available cả client lẫn server-side
        // trong Next.js (khác với biến thuần server-side như process.env.SECRET).
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
        return `${base}${url}`
    }
    return url
}
