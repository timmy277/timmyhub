'use client'

import { useThemeAttributesSync } from '@/hooks'

// Component rỗng để root layout (Server Component) gắn được hook đồng bộ theme vào cây client.
export function ThemeAttributesSync() {
    useThemeAttributesSync()
    return null
}
