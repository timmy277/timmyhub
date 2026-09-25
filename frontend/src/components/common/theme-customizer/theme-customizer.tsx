'use client'

import { RotateCcwIcon, ShuffleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, Separator, Skeleton } from '@/components/ui'
import {
    ACCENT_COLORS,
    BASE_COLOR_PALETTES,
    CHART_COLOR_PALETTES,
    FONT_FIELD_OPTIONS,
    STYLE_PRESETS,
    STYLE_PREVIEW_RADIUS_SCALE,
} from '@/constants'
import { useThemeConfigStore } from '@/stores'
import { cn, isFontId } from '@/utils'

import { FloatCombobox } from '../float-combobox'
import { ColorSwatchButton } from './color-swatch-button'

// Panel tuỳ chỉnh giao diện (Style/Base Color/Theme/Chart Color/Heading/Font/Shuffle), dựng từ
// components/ui/* theo ranh giới ADR-0006. 7 trạng thái: mặc định (render bình thường) · đang tải
// (skeleton khi store chưa rehydrate) · rỗng (N/A — không còn input tự do) · lỗi (N/A — mọi lựa chọn
// đều từ danh sách cố định, không thể sai) · không có quyền (N/A — tính năng public, không có RBAC
// gate) · vô hiệu hoá (toàn panel thay bằng skeleton khi đang hydrate) · thành công (tick hiển thị
// trên swatch/style đang chọn).
export function ThemeCustomizer() {
    // ===== Hooks =====
    const t = useTranslations('theme')
    const config = useThemeConfigStore((state) => state.config)
    const hasHydrated = useThemeConfigStore((state) => state.hasHydrated)
    const setStyle = useThemeConfigStore((state) => state.setStyle)
    const setBaseColor = useThemeConfigStore((state) => state.setBaseColor)
    const setAccentColor = useThemeConfigStore((state) => state.setAccentColor)
    const setChartColor = useThemeConfigStore((state) => state.setChartColor)
    const setHeadingFont = useThemeConfigStore((state) => state.setHeadingFont)
    const setBodyFont = useThemeConfigStore((state) => state.setBodyFont)
    const shuffle = useThemeConfigStore((state) => state.shuffle)
    const reset = useThemeConfigStore((state) => state.reset)

    // ===== Handlers =====
    const handleHeadingFontChange = (value: string | null) => {
        if (isFontId(value)) setHeadingFont(value)
    }

    const handleBodyFontChange = (value: string | null) => {
        if (isFontId(value)) setBodyFont(value)
    }

    if (!hasHydrated) {
        return (
            <div className="flex flex-col gap-4 p-4" aria-busy="true" aria-label={t('loading')}>
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                    {BASE_COLOR_PALETTES.map((base) => (
                        <Skeleton key={base.id} className="size-6 rounded-full" />
                    ))}
                </div>
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                    {ACCENT_COLORS.map((accent) => (
                        <Skeleton key={accent.id} className="size-6 rounded-full" />
                    ))}
                </div>
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 p-4">
            <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">{t('style')}</span>
                <div className="flex flex-wrap gap-2">
                    {STYLE_PRESETS.map((style) => {
                        const selected = config.style === style.id
                        return (
                            <Button
                                key={style.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-pressed={selected}
                                onClick={() => setStyle(style.id)}
                                className={cn(
                                    'text-xs',
                                    selected && 'border-primary bg-primary/10 text-primary hover:bg-primary/15',
                                )}
                                // Bo góc lấy từ chính preset để nút xem trước được style đó — giá trị động theo dữ
                                // liệu nên phải inline, không có class Tailwind tương ứng.
                                style={{ borderRadius: `${style.radiusRem * STYLE_PREVIEW_RADIUS_SCALE}rem` }}
                            >
                                {style.label}
                            </Button>
                        )
                    })}
                </div>
            </section>

            <Separator />

            <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">{t('baseColor')}</span>
                <div className="flex flex-wrap gap-2">
                    {BASE_COLOR_PALETTES.map((base) => (
                        <ColorSwatchButton
                            key={base.id}
                            color={base.swatch}
                            label={base.label}
                            selected={config.baseColor === base.id}
                            onSelect={() => setBaseColor(base.id)}
                        />
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">{t('accentColor')}</span>
                <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((accent) => (
                        <ColorSwatchButton
                            key={accent.id}
                            color={accent.swatch}
                            label={accent.label}
                            selected={config.accentColor === accent.id}
                            onSelect={() => setAccentColor(accent.id)}
                        />
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">{t('chartColor')}</span>
                <div className="flex flex-wrap gap-2">
                    {CHART_COLOR_PALETTES.map((chart) => (
                        <ColorSwatchButton
                            key={chart.id}
                            color={chart.swatch}
                            label={chart.label}
                            selected={config.chartColor === chart.id}
                            onSelect={() => setChartColor(chart.id)}
                        />
                    ))}
                </div>
            </section>

            <Separator />

            {/* Nền label nổi phải trùng nền Popover chứa panel để "cắt" viền đúng. */}
            <section className="grid grid-cols-2 gap-3">
                <FloatCombobox
                    label={t('headingFont')}
                    options={FONT_FIELD_OPTIONS}
                    value={config.headingFont}
                    onValueChange={handleHeadingFontChange}
                    labelClassName="bg-popover peer-focus:bg-popover peer-autofill:bg-popover"
                />
                <FloatCombobox
                    label={t('font')}
                    options={FONT_FIELD_OPTIONS}
                    value={config.bodyFont}
                    onValueChange={handleBodyFontChange}
                    labelClassName="bg-popover peer-focus:bg-popover peer-autofill:bg-popover"
                />
            </section>

            <Separator />

            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={shuffle}>
                    <ShuffleIcon data-icon="inline-start" />
                    {t('shuffle')}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={reset}>
                    <RotateCcwIcon data-icon="inline-start" />
                    {t('reset')}
                </Button>
            </div>
        </div>
    )
}
