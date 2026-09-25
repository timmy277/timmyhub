import type { AccentColorId } from './accent-colors'
import type { BaseColorId } from './base-colors'
import type { ChartColorId } from './chart-colors'
import type { FontId } from './fonts'
import type { StyleId } from './styles'

export const THEME_CONFIG_STORAGE_KEY = 'timmyhub-theme-config'

// Kiểu khai báo từ các id cùng thư mục thay vì import `ThemeConfig` từ `@/schemas` — schema đã import `*_IDS` từ
// `@/constants`, import ngược lại sẽ tạo vòng constants ↔ schemas. Store gán giá trị này vào `config: ThemeConfig`
// nên lệch kiểu với schema vẫn bị typecheck bắt.
export const DEFAULT_THEME_CONFIG: {
    style: StyleId
    baseColor: BaseColorId
    accentColor: AccentColorId
    chartColor: ChartColorId
    headingFont: FontId
    bodyFont: FontId
} = {
    style: 'nova',
    baseColor: 'neutral',
    accentColor: 'nova',
    chartColor: 'neutral',
    headingFont: 'publicSans',
    bodyFont: 'publicSans',
}

// Script chặn FOUC: chạy trước lần paint đầu, đọc ThemeConfig đã persist (zustand, khoá
// THEME_CONFIG_STORAGE_KEY) rồi set data-* lên <html>. Sau khi hydrate, useThemeAttributesSync tiếp quản.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = window.localStorage.getItem('${THEME_CONFIG_STORAGE_KEY}')
    if (!raw) return
    var parsed = JSON.parse(raw)
    var config = parsed && parsed.state && parsed.state.config
    if (!config) return
    var root = document.documentElement
    if (config.style) root.setAttribute('data-style', config.style)
    if (config.baseColor) root.setAttribute('data-base-color', config.baseColor)
    if (config.accentColor) root.setAttribute('data-accent', config.accentColor)
    if (config.chartColor) root.setAttribute('data-chart', config.chartColor)
    if (config.headingFont) root.setAttribute('data-font-heading', config.headingFont)
    if (config.bodyFont) root.setAttribute('data-font', config.bodyFont)
  } catch (e) {}
})()
`
