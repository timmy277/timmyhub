import { z } from 'zod'

import { ACCENT_COLOR_IDS } from './accent-colors'
import { BASE_COLOR_IDS } from './base-colors'
import { CHART_COLOR_IDS } from './chart-colors'
import { FONT_IDS } from './fonts'
import { STYLE_IDS } from './styles'

export const ThemeConfigSchema = z.object({
    style: z.enum(STYLE_IDS),
    baseColor: z.enum(BASE_COLOR_IDS),
    accentColor: z.enum(ACCENT_COLOR_IDS),
    chartColor: z.enum(CHART_COLOR_IDS),
    headingFont: z.enum(FONT_IDS),
    bodyFont: z.enum(FONT_IDS),
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
    style: 'nova',
    baseColor: 'neutral',
    accentColor: 'nova',
    chartColor: 'neutral',
    headingFont: 'publicSans',
    bodyFont: 'publicSans',
}
