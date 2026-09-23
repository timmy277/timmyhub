// Thực nghiệm cho thấy `shadcn apply <preset> --only theme` sinh CSS **giống hệt nhau** ở cả 8 style
// tên gốc (nova/vega/maia/lyra/mira/luma/sera/rhea) — nghĩa là trục "Style" của shadcn không đổi token
// màu, mà chọn *component source template* khác nhau từ registry (không phù hợp với triết lý "code copy
// một lần, tự bảo trì" của ADR-0006). Ở đây ta định nghĩa lại trục "Style" của riêng mình: chỉ đổi
// `--radius`, dùng lại 8 cái tên trên để giữ đúng giao diện chọn lựa như ảnh mẫu. Song song với khối
// `[data-style="…"]` trong `src/app/theme-presets.css`.
import type { StylePreset } from '@/types'

export const STYLE_PRESETS = [
    { id: 'nova', label: 'Nova', radiusRem: 0.625 },
    { id: 'vega', label: 'Vega', radiusRem: 1 },
    { id: 'maia', label: 'Maia', radiusRem: 0.375 },
    { id: 'lyra', label: 'Lyra', radiusRem: 1.5 },
    { id: 'mira', label: 'Mira', radiusRem: 0.25 },
    { id: 'luma', label: 'Luma', radiusRem: 0.75 },
    { id: 'sera', label: 'Sera', radiusRem: 0.5 },
    { id: 'rhea', label: 'Rhea', radiusRem: 1.125 },
] as const satisfies readonly StylePreset[]

export const STYLE_IDS = STYLE_PRESETS.map((style) => style.id) as [string, ...string[]]

export type StyleId = (typeof STYLE_PRESETS)[number]['id']
