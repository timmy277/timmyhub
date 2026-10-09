'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui'

// Lazy load FloatDatePicker — react-day-picker (~50KB) chỉ tải khi component thực sự render.
// Trước đây `export *` từ `@/components/common` barrel kéo react-day-picker vào mọi page dù không dùng.
export const FloatDatePicker = dynamic(() => import('./float-date-picker').then((m) => m.FloatDatePicker), {
    ssr: false,
    loading: () => <Skeleton className="h-11 w-full" />,
})
