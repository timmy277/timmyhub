import { FONT_IDS, type FontId } from '@/constants'

export function isFontId(value: string | null | undefined): value is FontId {
    return FONT_IDS.includes(value as FontId)
}
