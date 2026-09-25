import { useEffect, useState } from 'react'

// Trả về `value` sau khi nó đứng yên đủ `delayMs` — ô tìm kiếm gõ liên tục chỉ lọc/gọi API một lần (CLAUDE.md luật 24).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    // ===== State =====
    const [debounced, setDebounced] = useState(value)

    // ===== Effects =====
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs)
        return () => window.clearTimeout(timer)
    }, [value, delayMs])

    return debounced
}
