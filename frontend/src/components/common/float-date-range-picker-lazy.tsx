'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui'

// Lazy load FloatDateRangePicker — react-day-picker (~50KB) chỉ tải khi component thực sự render.
export const FloatDateRangePicker = dynamic(
    () => import('./float-date-range-picker').then((m) => m.FloatDateRangePicker),
    {
        ssr: false,
        loading: () => <Skeleton className="h-11 w-full" />,
    },
)
