export type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

// Số ô trang ở giữa (trừ trang đầu, trang cuối và hai dấu "…") khi phải rút gọn.
const MIDDLE_SLOT_COUNT = 3

// Dải ô trang kiểu Mantine Pagination (siblings 1, boundaries 1): 1 … 4 5 6 … 10. Trang đánh số từ 0 như API AG Grid;
// luôn giữ trang đầu, trang cuối và hai trang kề trang hiện tại. `maxVisible` là số ô tối đa trước khi rút gọn.
export function getPageItems(current: number, total: number, maxVisible: number): PageItem[] {
    if (total <= maxVisible) return Array.from({ length: total }, (_, index) => index)

    const start = Math.max(1, Math.min(current - 1, total - 2 - MIDDLE_SLOT_COUNT))
    const end = Math.min(total - 2, Math.max(current + 1, 1 + MIDDLE_SLOT_COUNT))
    const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index)

    return [
        0,
        ...(start > 1 ? (['ellipsis-start'] as const) : []),
        ...middle,
        ...(end < total - 2 ? (['ellipsis-end'] as const) : []),
        total - 1,
    ]
}
