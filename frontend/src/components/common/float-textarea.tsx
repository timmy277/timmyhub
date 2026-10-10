'use client'

import { useId, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/utils'

import { LABEL_CUTOUT_CLASS } from './float-input'

export const floatTextareaVariants = cva(
    'peer block w-full resize-y text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-transparent focus:placeholder:text-muted-foreground',
    {
        variants: {
            variant: {
                outlined:
                    'rounded-lg border border-input bg-transparent focus:border-primary focus-visible:ring-3 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:focus:border-destructive aria-invalid:focus-visible:ring-destructive/20',
                filled: 'rounded-t-lg border-0 border-b-2 border-input bg-muted focus:border-primary aria-invalid:border-destructive',
                standard:
                    'border-0 border-b-2 border-input bg-transparent px-0 focus:border-primary aria-invalid:border-destructive',
            },
            size: {
                default: 'min-h-24 px-3 py-3 text-base',
                sm: 'min-h-20 px-2.5 py-2 text-sm',
            },
        },
        compoundVariants: [
            { variant: 'standard', size: 'default', className: 'px-0' },
            { variant: 'standard', size: 'sm', className: 'px-0' },
        ],
        defaultVariants: {
            variant: 'outlined',
            size: 'default',
        },
    },
)

// Khác `FLOAT_LABEL_CLASS` của FloatInput ở trạng thái nghỉ: textarea nhiều dòng nên label nằm ở dòng đầu
// (`top-3`) chứ không canh giữa hộp — canh giữa sẽ lơ lửng giữa khối cao 4 dòng, đọc rất lệch.
export const FLOAT_TEXTAREA_LABEL_CLASS = [
    'pointer-events-none absolute start-3 top-2 z-10 flex origin-[0] -translate-y-4 scale-75 items-center text-sm text-muted-foreground duration-200 motion-reduce:transition-none',
    'peer-placeholder-shown:top-3 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
    'peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-primary',
    'peer-aria-invalid:text-destructive',
    'peer-disabled:opacity-50',
].join(' ')

export interface FloatTextareaProps
    extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, VariantProps<typeof floatTextareaVariants> {
    label: string
    helperText?: string
    error?: string
    icon?: ReactNode
    labelClassName?: string
    ref?: Ref<HTMLTextAreaElement>
    reserveErrorSpace?: boolean
}

// Textarea có label nổi, cùng họ với FloatInput. Dùng `placeholder=" "` + `peer-placeholder-shown` nên không cần
// state để biết ô đã có giá trị hay chưa; chiều cao điều khiển bằng `rows` (mặc định 4).
export function FloatTextarea({
    className,
    labelClassName,
    label,
    helperText,
    error,
    icon,
    variant = 'outlined',
    size = 'default',
    id,
    disabled,
    rows = 4,
    ref,
    reserveErrorSpace,
    ...props
}: FloatTextareaProps) {
    // ===== Hooks =====
    const generatedId = useId()

    // ===== Derived =====
    const textareaId = id ?? generatedId
    const descriptionId = `${textareaId}-description`
    const description = error ?? helperText

    return (
        <div>
            <div className="relative">
                <textarea
                    id={textareaId}
                    ref={ref}
                    rows={rows}
                    aria-invalid={Boolean(error)}
                    aria-describedby={description ? descriptionId : undefined}
                    disabled={disabled}
                    className={cn(floatTextareaVariants({ variant, size }), className)}
                    {...props}
                    placeholder={props.placeholder || ' '}
                />
                <label
                    htmlFor={textareaId}
                    className={cn(
                        FLOAT_TEXTAREA_LABEL_CLASS,
                        variant === 'outlined' && LABEL_CUTOUT_CLASS,
                        labelClassName,
                    )}
                >
                    {icon && <span className="me-1.5 inline-flex size-4 shrink-0">{icon}</span>}
                    {label}
                </label>
            </div>

            {(description || reserveErrorSpace) && (
                <p
                    id={descriptionId}
                    className={cn(
                        'mt-1.5 text-left text-xs min-h-[1.25rem] leading-relaxed transition-colors',
                        error ? 'text-destructive' : 'text-muted-foreground',
                        !description && 'invisible select-none',
                    )}
                    role={error ? 'alert' : undefined}
                >
                    {description || '\u00A0'}
                </p>
            )}
        </div>
    )
}
