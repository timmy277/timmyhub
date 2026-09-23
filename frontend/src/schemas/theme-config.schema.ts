import { z } from 'zod'

import { ACCENT_COLOR_IDS, BASE_COLOR_IDS, CHART_COLOR_IDS, FONT_IDS, STYLE_IDS } from '@/constants'

export const ThemeConfigSchema = z.object({
    style: z.enum(STYLE_IDS),
    baseColor: z.enum(BASE_COLOR_IDS),
    accentColor: z.enum(ACCENT_COLOR_IDS),
    chartColor: z.enum(CHART_COLOR_IDS),
    headingFont: z.enum(FONT_IDS),
    bodyFont: z.enum(FONT_IDS),
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>
