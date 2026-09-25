import { useSyncExternalStore } from 'react'

import { MOBILE_BREAKPOINT_PX } from '@/constants'

// Tên file giữ nguyên `use-mobile` vì `components/ui/sidebar.tsx` (shadcn) import thẳng đường dẫn này.
// Dùng useSyncExternalStore thay cho useEffect + setState của bản shadcn: không có lần render thừa sau mount
// và đọc thẳng `matchMedia` thay vì so `innerWidth` mỗi lần đổi.
// Không cần `'use client'`: hook chỉ chạy trong component client gọi nó, bản thân file không phải ranh giới client.
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`

function subscribe(onChange: () => void) {
    const mql = window.matchMedia(MOBILE_QUERY)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
    return false
}

export function useIsMobile() {
    // ===== Hooks =====
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
