// 4 bộ màu cho biểu đồ (--chart-1..5). `neutral` khớp đúng giá trị đang có sẵn trong globals.css
// (giữ nguyên hành vi mặc định khi chưa đổi gì). 3 bộ còn lại là palette thay thế, đều đạt phân biệt
// tốt giữa các nét liền kề. Song song với khối `[data-chart="…"]` trong `src/app/theme-presets.css`.
export interface ChartColorPalette {
    id: string
    label: string
    swatch: string
    colors: readonly [string, string, string, string, string]
}

export const CHART_COLOR_PALETTES = [
    {
        id: 'neutral',
        label: 'Neutral',
        swatch: '#737373',
        colors: ['#dedede', '#a3a3a3', '#828282', '#5e5e5e', '#3f3f3f'],
    },
    {
        id: 'vivid',
        label: 'Vivid',
        swatch: '#6366f1',
        colors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'],
    },
    {
        id: 'ocean',
        label: 'Ocean',
        swatch: '#0284c7',
        colors: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
    },
    {
        id: 'sunset',
        label: 'Sunset',
        swatch: '#f97316',
        colors: ['#fbbf24', '#fb923c', '#f97316', '#ea580c', '#c2410c'],
    },
] as const satisfies readonly ChartColorPalette[]

export const CHART_COLOR_IDS = CHART_COLOR_PALETTES.map((palette) => palette.id) as [string, ...string[]]

export type ChartColorId = (typeof CHART_COLOR_PALETTES)[number]['id']
