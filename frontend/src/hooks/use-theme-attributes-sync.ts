'use client'

import { useEffect } from 'react'

import { useThemeConfigStore } from '@/stores'

// Đồng bộ ThemeConfig hiện tại (từ store) ra data-* trên <html> mỗi khi đổi — CSS thật nằm trong
// theme-presets.css (attribute selector), hook này chỉ toggle attribute, không tính toán màu.
// Lần đầu paint không phụ thuộc effect này: THEME_INIT_SCRIPT trong layout.tsx đã set trước rồi.
export function useThemeAttributesSync() {
    const config = useThemeConfigStore((state) => state.config)
    const hasHydrated = useThemeConfigStore((state) => state.hasHydrated)

    useEffect(() => {
        if (!hasHydrated) return
        const root = document.documentElement
        root.setAttribute('data-style', config.style)
        root.setAttribute('data-base-color', config.baseColor)
        root.setAttribute('data-accent', config.accentColor)
        root.setAttribute('data-chart', config.chartColor)
        root.setAttribute('data-font-heading', config.headingFont)
        root.setAttribute('data-font', config.bodyFont)
    }, [config, hasHydrated])
}
