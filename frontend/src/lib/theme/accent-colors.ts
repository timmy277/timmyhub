// "Theme" trong ảnh mẫu = màu accent/primary. `nova` là màu thương hiệu Minimals UI (#00a76f, theo
// ADR-0006) và là lựa chọn mặc định. 7 màu còn lại lấy shade -600 của Tailwind (không phải -500) vì
// -600 luôn đạt tương phản ≥ 4.5:1 (WCAG AA) trên chữ trắng, còn -500 (vd amber #f59e0b) thì trượt.
// Song song với khối `[data-accent="…"]` trong `src/app/theme-presets.css` — sửa ở đây phải sửa cả hai.
export interface AccentColor {
    id: string
    label: string
    swatch: string
    foreground: string
}

export const ACCENT_COLORS = [
    { id: 'nova', label: 'Nova', swatch: '#00a76f', foreground: '#ffffff' },
    { id: 'sky', label: 'Sky', swatch: '#0284c7', foreground: '#ffffff' },
    { id: 'indigo', label: 'Indigo', swatch: '#4f46e5', foreground: '#ffffff' },
    { id: 'violet', label: 'Violet', swatch: '#7c3aed', foreground: '#ffffff' },
    { id: 'rose', label: 'Rose', swatch: '#e11d48', foreground: '#ffffff' },
    { id: 'orange', label: 'Orange', swatch: '#ea580c', foreground: '#ffffff' },
    { id: 'teal', label: 'Teal', swatch: '#0d9488', foreground: '#ffffff' },
    { id: 'amber', label: 'Amber', swatch: '#d97706', foreground: '#ffffff' },
] as const satisfies readonly AccentColor[]

export const ACCENT_COLOR_IDS = ACCENT_COLORS.map((color) => color.id) as [string, ...string[]]

export type AccentColorId = (typeof ACCENT_COLORS)[number]['id']
