'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

// Hook chuẩn React 18/19 nhận biết client mount an toàn, không gây cascading renders hay hydration mismatch.
export function useMounted(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    )
}
