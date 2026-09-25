import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
    ACCENT_COLOR_IDS,
    BASE_COLOR_IDS,
    CHART_COLOR_IDS,
    DEFAULT_THEME_CONFIG,
    FONT_IDS,
    STYLE_IDS,
    THEME_CONFIG_STORAGE_KEY,
} from '@/constants'
import type { ThemeConfig } from '@/schemas'
import { pickRandom } from '@/utils'

interface ThemeConfigState {
    config: ThemeConfig
    hasHydrated: boolean
    setStyle: (style: ThemeConfig['style']) => void
    setBaseColor: (baseColor: ThemeConfig['baseColor']) => void
    setAccentColor: (accentColor: ThemeConfig['accentColor']) => void
    setChartColor: (chartColor: ThemeConfig['chartColor']) => void
    setHeadingFont: (headingFont: ThemeConfig['headingFont']) => void
    setBodyFont: (bodyFont: ThemeConfig['bodyFont']) => void
    shuffle: () => void
    reset: () => void
}

export const useThemeConfigStore = create<ThemeConfigState>()(
    persist(
        (set) => ({
            config: DEFAULT_THEME_CONFIG,
            hasHydrated: false,
            setStyle: (style) => set((state) => ({ config: { ...state.config, style } })),
            setBaseColor: (baseColor) => set((state) => ({ config: { ...state.config, baseColor } })),
            setAccentColor: (accentColor) => set((state) => ({ config: { ...state.config, accentColor } })),
            setChartColor: (chartColor) => set((state) => ({ config: { ...state.config, chartColor } })),
            setHeadingFont: (headingFont) => set((state) => ({ config: { ...state.config, headingFont } })),
            setBodyFont: (bodyFont) => set((state) => ({ config: { ...state.config, bodyFont } })),
            shuffle: () =>
                set(() => ({
                    config: {
                        style: pickRandom(STYLE_IDS),
                        baseColor: pickRandom(BASE_COLOR_IDS),
                        accentColor: pickRandom(ACCENT_COLOR_IDS),
                        chartColor: pickRandom(CHART_COLOR_IDS),
                        headingFont: pickRandom(FONT_IDS),
                        bodyFont: pickRandom(FONT_IDS),
                    },
                })),
            reset: () => set(() => ({ config: DEFAULT_THEME_CONFIG })),
        }),
        {
            name: THEME_CONFIG_STORAGE_KEY,
            partialize: (state) => ({ config: state.config }),
        },
    ),
)

// Đăng ký callback rehydrate CHỈ trong browser (không phải module scope) — `.persist` chạy trong SSR/
// module-evaluation trên server có thể chưa sẵn sàng, và ta chỉ cần biết trạng thái này ở client.
if (typeof window !== 'undefined') {
    useThemeConfigStore.persist.onFinishHydration(() => {
        useThemeConfigStore.setState({ hasHydrated: true })
    })
    if (useThemeConfigStore.persist.hasHydrated()) {
        useThemeConfigStore.setState({ hasHydrated: true })
    }
}
