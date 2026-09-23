'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { RotateCcwIcon, ShuffleIcon } from 'lucide-react'

import {
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Skeleton,
    LocaleSwitcher,
} from '@/components'
import { ACCENT_COLORS, BASE_COLOR_PALETTES, CHART_COLOR_PALETTES, FONT_OPTIONS, STYLE_PRESETS } from '@/constants'
import { useThemeConfigStore } from '@/stores'
import { cn } from '@/utils'
import { ColorSwatchButton } from './color-swatch-button'

// Panel tuỳ chỉnh giao diện (Style/Base Color/Theme/Chart Color/Heading/Font/Shuffle), dựng từ
// components/ui/* theo ranh giới ADR-0006. 7 trạng thái: mặc định (render bình thường) · đang tải
// (skeleton khi store chưa rehydrate) · rỗng (N/A — không còn input tự do) · lỗi (N/A — mọi lựa chọn
// đều từ danh sách cố định, không thể sai) · không có quyền (N/A — tính năng public, không có RBAC
// gate) · vô hiệu hoá (toàn panel thay bằng skeleton khi đang hydrate) · thành công (tick hiển thị
// trên swatch/style đang chọn).
export function ThemeCustomizer() {
    const t = useTranslations('theme')
    const headingSelectId = useId()
    const fontSelectId = useId()

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

    if (!hasHydrated) {
        return (
            <div className="flex flex-col gap-4 p-4" aria-busy="true" aria-label={t('loading')}>
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="size-6 rounded-full" />
                    ))}
                </div>
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="size-6 rounded-full" />
                    ))}
                </div>
                <Skeleton className="h-9 w-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 p-4">
            <LocaleSwitcher />

            <Separator />

            <section className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">{t('style')}</span>
                <div className="flex flex-wrap gap-2">
                    {STYLE_PRESETS.map((style) => (
                        <button
                            key={style.id}
                            type="button"
                            aria-pressed={config.style === style.id}
                            onClick={() => setStyle(style.id)}
                            className={cn(
                                'flex h-8 items-center justify-center border border-border px-3 text-xs font-medium',
                                'transition-colors duration-150 ease-out hover:bg-muted',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                config.style === style.id && 'border-primary bg-primary/10 text-primary',
                            )}
                            style={{ borderRadius: `${style.radiusRem * 0.6}rem` }}
                        >
                            {style.label}
                        </button>
                    ))}
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

            <section className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor={headingSelectId}>{t('headingFont')}</Label>
                    <Select value={config.headingFont} onValueChange={setHeadingFont}>
                        <SelectTrigger id={headingSelectId} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_OPTIONS.map((font) => (
                                <SelectItem key={font.id} value={font.id}>
                                    {font.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor={fontSelectId}>{t('font')}</Label>
                    <Select value={config.bodyFont} onValueChange={setBodyFont}>
                        <SelectTrigger id={fontSelectId} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_OPTIONS.map((font) => (
                                <SelectItem key={font.id} value={font.id}>
                                    {font.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </section>

            <Separator />

            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={shuffle}>
                    <ShuffleIcon />
                    {t('shuffle')}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={reset}>
                    <RotateCcwIcon />
                    {t('reset')}
                </Button>
            </div>
        </div>
    )
}
