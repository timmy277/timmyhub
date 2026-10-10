/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam (VND).
 * Ví dụ: 5990000 -> "5.990.000 ₫" (ký hiệu tiền tệ luôn ở phía sau số tiền)
 */
export function formatCurrencyVND(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '0 ₫'
    const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d-]/g, ''))
    if (Number.isNaN(num)) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(num)
}

/**
 * Định dạng số tiền chỉ lấy phần số có dấu chấm ngăn cách hàng nghìn.
 * Ví dụ: 5990000 -> "5.990.000"
 */
export function formatNumberVND(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '0'
    const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d-]/g, ''))
    if (Number.isNaN(num)) return '0'
    return new Intl.NumberFormat('vi-VN').format(num)
}
