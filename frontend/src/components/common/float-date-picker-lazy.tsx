'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui'

import type { FloatDatePickerProps } from './float-date-picker'

export type { FloatDatePickerProps }

// Lazy load FloatDatePicker — react-day-picker (~50KB) chỉ tải khi component thực sự render.
// Trước đây `export *` từ `@/components/common` barrel kéo react-day-picker vào mọi page dù không dùng.
export const FloatDatePicker = dynamic<FloatDatePickerProps>(
    () => import('./float-date-picker').then((m) => m.FloatDatePicker),
    {
        ssr: false,
        loading: () => <Skeleton className="h-11 w-full" />,
    },
)
