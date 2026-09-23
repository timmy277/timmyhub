// 8 Google Fonts nạp sẵn qua `next/font/google` (kỹ thuật multi-variable): mỗi font export một CSS
// variable riêng, tất cả được áp lên `<html>` một lần trong layout.tsx. Đổi Heading/Font trong menu chỉ
// re-point `--font-sans`/`--font-heading` sang biến đã nạp sẵn — không tải mạng lúc runtime, đúng lựa
// chọn "next/font/google, danh sách cố định" của người dùng. Song song với khối `[data-font="…"]` /
// `[data-font-heading="…"]` trong `src/app/theme-presets.css` (dùng cùng `id` và cùng tên biến CSS).
import { DM_Sans, Geist, Inter, Manrope, Plus_Jakarta_Sans, Public_Sans, Roboto, Sora } from 'next/font/google'

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
})

export const geistFont = Geist({
    subsets: ['latin'],
    variable: '--font-geist',
    display: 'swap',
})

export const robotoFont = Roboto({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-roboto',
    display: 'swap',
})

export const plusJakartaSansFont = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-plus-jakarta-sans',
    display: 'swap',
})

export const manropeFont = Manrope({
    subsets: ['latin'],
    variable: '--font-manrope',
    display: 'swap',
})

export const soraFont = Sora({
    subsets: ['latin'],
    variable: '--font-sora',
    display: 'swap',
})

export const dmSansFont = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
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

export const FONT_IDS = FONT_OPTIONS.map((font) => font.id) as [string, ...string[]]

export type FontId = (typeof FONT_OPTIONS)[number]['id']

export const FONT_VARIABLE_CLASS_NAMES = [
    publicSansFont.variable,
    interFont.variable,
    geistFont.variable,
    robotoFont.variable,
    plusJakartaSansFont.variable,
    manropeFont.variable,
    soraFont.variable,
    dmSansFont.variable,
].join(' ')

// `id` -> tên biến CSS thật do next/font sinh ra (vd `--font-public-sans`), dùng để ghi vào
// `[data-font="…"]` / `[data-font-heading="…"]` trong theme-presets.css và trong get-code-dialog.
export const FONT_ID_TO_VARIABLE: Record<string, string> = {
    publicSans: '--font-public-sans',
    inter: '--font-inter',
    geist: '--font-geist',
    roboto: '--font-roboto',
    plusJakartaSans: '--font-plus-jakarta-sans',
    manrope: '--font-manrope',
    sora: '--font-sora',
    dmSans: '--font-dm-sans',
}
