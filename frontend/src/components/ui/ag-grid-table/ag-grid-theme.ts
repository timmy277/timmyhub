import { themeQuartz } from 'ag-grid-community'

// AG Grid không kế thừa Tailwind (ADR-0006) — map thẳng từng tham số sang CSS variable của design system.
// Vì chỉ trỏ tới `var(--…)`, lưới tự đổi theo dark mode, màu chủ đạo, radius và font mà theme customizer chọn,
// không cần dựng lại theme hay dùng `colorSchemeDark`.
export const agGridTheme = themeQuartz.withParams({
    accentColor: 'var(--primary)',
    backgroundColor: 'var(--card)',
    foregroundColor: 'var(--foreground)',
    textColor: 'var(--foreground)',
    subtleTextColor: 'var(--muted-foreground)',
    borderColor: 'var(--border)',
    chromeBackgroundColor: 'color-mix(in oklab, var(--muted) 70%, var(--card))',
    headerBackgroundColor: 'color-mix(in oklab, var(--muted) 70%, var(--card))',
    headerTextColor: 'var(--foreground)',
    headerFontWeight: 600,
    rowHoverColor: 'color-mix(in oklab, var(--primary) 6%, transparent)',
    selectedRowBackgroundColor: 'color-mix(in oklab, var(--primary) 12%, transparent)',
    oddRowBackgroundColor: 'color-mix(in oklab, var(--muted) 30%, transparent)',
    inputFocusBorder: { color: 'var(--primary)' },
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    borderRadius: 'calc(var(--radius) * 0.6)',
    wrapperBorderRadius: 'var(--radius)',
    browserColorScheme: 'inherit',
})
