import type { ThemeConfig } from '@/schemas'

export const THEME_CONFIG_STORAGE_KEY = 'timmyhub-theme-config'

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
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
