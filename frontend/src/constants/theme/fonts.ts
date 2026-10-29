// 8 Google Fonts nạp sẵn qua `next/font/google` (kỹ thuật multi-variable): mỗi font export một CSS
// variable riêng, tất cả được áp lên `<html>` một lần trong layout.tsx. Đổi Heading/Font trong menu chỉ
// re-point `--font-sans`/`--font-heading` sang biến đã nạp sẵn — không tải mạng lúc runtime, đúng lựa
// chọn "next/font/google, danh sách cố định" của người dùng. Song song với khối `[data-font="…"]` /
// `[data-font-heading="…"]` trong `src/app/theme-presets.css` (dùng cùng `id` và cùng tên biến CSS).
//
// TASK-PERF-005: chỉ font mặc định (`DEFAULT_THEME_CONFIG.bodyFont` = Public Sans) được preload. 7 font còn lại và
// Geist Mono để `preload: false` — trình duyệt chỉ tải file font khi CSS thật sự dùng tới (người dùng chọn font đó).
import {
    DM_Sans,
    Geist,
    Geist_Mono,
    Inter,
    Manrope,
    Plus_Jakarta_Sans,
    Public_Sans,
    Roboto_Flex,
    Sora,
} from 'next/font/google'

import type { FontOption } from '@/types'

export const publicSansFont = Public_Sans({
    subsets: ['latin'],
    variable: '--font-public-sans',
    display: 'swap',
})

export const interFont = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
    preload: false,
})

export const geistFont = Geist({
    subsets: ['latin'],
    variable: '--font-geist',
    display: 'swap',
    preload: false,
})

export const robotoFont = Roboto_Flex({
    subsets: ['latin'],
    variable: '--font-roboto',
    display: 'swap',
    preload: false,
})

export const plusJakartaSansFont = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-plus-jakarta-sans',
    display: 'swap',
    preload: false,
})

export const manropeFont = Manrope({
    subsets: ['latin'],
    variable: '--font-manrope',
    display: 'swap',
    preload: false,
})

export const soraFont = Sora({
    subsets: ['latin'],
    variable: '--font-sora',
    display: 'swap',
    preload: false,
})

export const dmSansFont = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
    preload: false,
})

// Font mono cho `font-mono` (globals.css map `--font-mono` → `--font-geist-mono`). Không nằm trong menu chọn font.
export const geistMonoFont = Geist_Mono({
    subsets: ['latin'],
    variable: '--font-geist-mono',
    display: 'swap',
    preload: false,
})

export const FONT_OPTIONS = [
    { id: 'publicSans', label: 'Public Sans', cssVariable: publicSansFont.style.fontFamily },
    { id: 'inter', label: 'Inter', cssVariable: interFont.style.fontFamily },
    { id: 'geist', label: 'Geist', cssVariable: geistFont.style.fontFamily },
    { id: 'roboto', label: 'Roboto', cssVariable: robotoFont.style.fontFamily },
    { id: 'plusJakartaSans', label: 'Plus Jakarta Sans', cssVariable: plusJakartaSansFont.style.fontFamily },
    { id: 'manrope', label: 'Manrope', cssVariable: manropeFont.style.fontFamily },
    { id: 'sora', label: 'Sora', cssVariable: soraFont.style.fontFamily },
    { id: 'dmSans', label: 'DM Sans', cssVariable: dmSansFont.style.fontFamily },
] as const satisfies readonly FontOption[]

export type FontId = (typeof FONT_OPTIONS)[number]['id']

// Tuple không rỗng giữ nguyên union literal để `z.enum` suy ra đúng `FontId`, không nới thành `string`.
export const FONT_IDS = FONT_OPTIONS.map((font) => font.id) as [FontId, ...FontId[]]

// Shape `{ value, label }` cho FloatCombobox chọn font trong ThemeCustomizer.
export const FONT_FIELD_OPTIONS = FONT_OPTIONS.map((font) => ({ value: font.id, label: font.label }))

export const FONT_VARIABLE_CLASS_NAMES = [
    publicSansFont.variable,
    interFont.variable,
    geistFont.variable,
    robotoFont.variable,
    plusJakartaSansFont.variable,
    manropeFont.variable,
    soraFont.variable,
    dmSansFont.variable,
    geistMonoFont.variable,
].join(' ')

// `id` -> tên biến CSS thật do next/font sinh ra (vd `--font-public-sans`), dùng để ghi vào
// `[data-font="…"]` / `[data-font-heading="…"]` trong theme-presets.css và trong get-code-dialog.
export const FONT_ID_TO_VARIABLE: Record<FontId, string> = {
    publicSans: '--font-public-sans',
    inter: '--font-inter',
    geist: '--font-geist',
    roboto: '--font-roboto',
    plusJakartaSans: '--font-plus-jakarta-sans',
    manrope: '--font-manrope',
    sora: '--font-sora',
    dmSans: '--font-dm-sans',
}
