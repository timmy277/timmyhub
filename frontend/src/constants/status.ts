import type { BadgeVariant } from '@/types'

// Sắc thái trạng thái cho `StatusBadge` — const object + type cùng tên như `UserRole` ở contracts (luật #23).
// Chưa có sắc thái "cảnh báo" vì design system chưa có token `--warning`.
export const StatusTone = {
    SUCCESS: 'SUCCESS',
    DANGER: 'DANGER',
    NEUTRAL: 'NEUTRAL',
} as const
export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone]

// Badge viền trung tính cho mọi sắc thái — màu nằm ở chấm tròn để chữ vẫn đạt tương phản 4.5:1 trên nền card.
export const STATUS_TONE_BADGE_VARIANT = {
    [StatusTone.SUCCESS]: 'outline',
    [StatusTone.DANGER]: 'outline',
    [StatusTone.NEUTRAL]: 'outline',
} as const satisfies Record<StatusTone, BadgeVariant>

export const STATUS_TONE_DOT_CLASS = {
    [StatusTone.SUCCESS]: 'bg-primary',
    [StatusTone.DANGER]: 'bg-destructive',
    [StatusTone.NEUTRAL]: 'bg-muted-foreground',
} as const satisfies Record<StatusTone, string>
