'use client'

import { useRouter } from 'next/navigation'

import { ErrorState } from '@/components'

interface RbacPanelErrorProps {
    description: string
}

// Bọc `ErrorState` cho panel do Server Component render: nút "thử lại" của `ErrorState` nhận một hàm, mà hàm không
// truyền được qua ranh giới server → client, nên thao tác làm mới phải nằm trong client component. Cùng khuôn với
// `UserPanelError`.
export function RbacPanelError({ description }: RbacPanelErrorProps) {
    // ===== Hooks =====
    const router = useRouter()

    // ===== Handlers =====
    const handleRetry = () => router.refresh()

    return <ErrorState description={description} onRetry={handleRetry} />
}
