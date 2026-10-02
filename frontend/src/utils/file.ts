// Tiện ích xử lý file — dùng chung, không để inline trong component.

/**
 * Định dạng dung lượng byte sang chuỗi đọc được (B / KB / MB / GB).
 * @param bytes  Số byte; `null`/`undefined`/`0` trả về `'N/A'`.
 */
export function formatBytes(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return 'N/A'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] as const
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Trả về tên đuôi mở rộng của file (không có dấu chấm), viết thường.
 * Ví dụ: `"image.PNG"` → `"png"`.
 */
export function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() ?? ''
}

/**
 * Sinh ID ngẫu nhiên cho hàng đợi upload (client-only, không phải UUID).
 */
export function generateUploadId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
