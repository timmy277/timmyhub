export interface AccentColor {
    id: string
    label: string
    swatch: string
    foreground: string
}

export interface BaseColorPalette {
    id: string
    label: string
    swatch: string
    light: {
        background: string
        foreground: string
        card: string
        border: string
        input: string
        muted: string
        mutedForeground: string
        secondary: string
        secondaryForeground: string
        accent: string
        accentForeground: string
    }
    dark: {
        background: string
        foreground: string
        card: string
        border: string
        input: string
        muted: string
        mutedForeground: string
        secondary: string
        secondaryForeground: string
        accent: string
        accentForeground: string
    }
}

export interface ChartColorPalette {
    id: string
    label: string
    swatch: string
    colors: readonly [string, string, string, string, string]
}

export interface StylePreset {
    id: string
    label: string
    radiusRem: number
}

export interface FontOption {
    id: string
    label: string
    cssVariable: string
}
