'use client'

import { useRouter } from 'next/navigation'

import { ErrorState } from '@/components'

interface UserPanelErrorProps {
    description: string
}

// Bọc `ErrorState` cho các panel do Server Component render. Nút "thử lại" của `ErrorState` nhận một hàm, mà hàm thì
// không truyền được qua ranh giới server → client, nên thao tác làm mới phải nằm trong một client component.
// `router.refresh()` dựng lại Server Component với dữ liệu mới.
export function UserPanelError({ description }: UserPanelErrorProps) {
    // ===== Hooks =====
    const router = useRouter()

    // ===== Handlers =====
    const handleRetry = () => router.refresh()

    return <ErrorState description={description} onRetry={handleRetry} />
}
