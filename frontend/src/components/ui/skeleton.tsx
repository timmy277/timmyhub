import { cn } from '@/utils'

export interface SkeletonProps extends React.ComponentProps<'div'> {
    /**
     * Kiểu hiệu ứng:
     * - 'both': Kết hợp cả nhịp thở pulse và dải sóng shimmer quét ngang (mặc định như Ant Design, MUI wave, Mantine)
     * - 'pulse': Chỉ nhấp nháy nhịp thở êm ái
     * - 'shimmer': Chỉ quét dải sóng ánh sáng
     * - 'none': Khối nền tĩnh không chuyển động
     */
    variant?: 'both' | 'pulse' | 'shimmer' | 'none'
}

function Skeleton({ className, variant = 'both', ...props }: SkeletonProps) {
    return (
        <div
            data-slot="skeleton"
            data-variant={variant}
            className={cn(
                'rounded-md bg-muted/80',
                (variant === 'pulse' || variant === 'both') && 'animate-pulse',
                variant === 'none' && 'animate-none [animation:none] after:hidden',
                variant === 'pulse' && 'after:hidden',
                className,
            )}
            {...props}
        />
    )
}

export { Skeleton }
