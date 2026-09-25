import { useMemo } from 'react'
import { usePathname } from 'next/navigation'

import { BREADCRUMB_ROUTES } from '@/constants'
import type { BreadcrumbEntry } from '@/types'

// Breadcrumb của trang hiện tại: ưu tiên bản khai báo trong BREADCRUMB_ROUTES, không có thì dựng từ URL.
export function useBreadcrumbs(): readonly BreadcrumbEntry[] {
    // ===== Hooks =====
    const pathname = usePathname()

    // ===== Derived =====
    return useMemo(() => {
        const declared = BREADCRUMB_ROUTES[pathname]
        if (declared) return declared

        const segments = pathname.split('/').filter(Boolean)
        return segments.map((segment, index) => ({
            title: decodeURIComponent(segment),
            url: `/${segments.slice(0, index + 1).join('/')}`,
        }))
    }, [pathname])
}
