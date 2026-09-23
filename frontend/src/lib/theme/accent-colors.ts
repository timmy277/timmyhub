// "Theme" trong ảnh mẫu = màu accent/primary. `nova` là màu thương hiệu Minimals UI (#00a76f, theo
// ADR-0006) và là lựa chọn mặc định. 7 màu còn lại lấy shade -600 của Tailwind.
// Không phải mọi -600 đều đạt 4.5:1 trên chữ trắng (đo thật bằng Lighthouse): nova/sky/orange/teal/amber
// trượt (3.1–4.1:1) nên các màu này dùng chữ gần đen thay vì trắng — nova dùng #031a10 (tông xanh cùng
// hue, ~5.8:1), còn lại dùng #0a0a0a (~4.8–6.2:1) — giữ đúng luật 11 CLAUDE.md.
// Song song với khối `[data-accent="…"]` trong `src/app/theme-presets.css` — sửa ở đây phải sửa cả hai.
export interface AccentColor {
    id: string
    label: string
    swatch: string
    foreground: string
}

export const ACCENT_COLORS = [
    { id: 'nova', label: 'Nova', swatch: '#00a76f', foreground: '#031a10' },
    { id: 'sky', label: 'Sky', swatch: '#0284c7', foreground: '#0a0a0a' },
    { id: 'indigo', label: 'Indigo', swatch: '#4f46e5', foreground: '#ffffff' },
    { id: 'violet', label: 'Violet', swatch: '#7c3aed', foreground: '#ffffff' },
    { id: 'rose', label: 'Rose', swatch: '#e11d48', foreground: '#ffffff' },
    { id: 'orange', label: 'Orange', swatch: '#ea580c', foreground: '#0a0a0a' },
    { id: 'teal', label: 'Teal', swatch: '#0d9488', foreground: '#0a0a0a' },
    { id: 'amber', label: 'Amber', swatch: '#d97706', foreground: '#0a0a0a' },
] as const satisfies readonly AccentColor[]

export const ACCENT_COLOR_IDS = ACCENT_COLORS.map((color) => color.id) as [string, ...string[]]

export type AccentColorId = (typeof ACCENT_COLORS)[number]['id']
