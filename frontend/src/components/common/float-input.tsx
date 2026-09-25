'use client'

import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui'
import { cn } from '@/utils'

export const floatInputVariants = cva(
    'peer block w-full appearance-none text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
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
                default: 'h-12 px-3 py-3 text-base',
                sm: 'h-10 px-2.5 py-2 text-sm',
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

// Nền của label phải trùng nền phía sau input để "cắt" viền khi label nổi lên — mặc định là nền trang,
// input đặt trên card thì truyền `labelClassName="bg-card peer-focus:bg-card peer-autofill:bg-card"`.
export const LABEL_CUTOUT_CLASS =
    'rounded bg-background px-1 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:bg-background peer-focus:px-1 peer-autofill:bg-background peer-autofill:px-1'

// Label nổi điều khiển bằng `peer` — dùng chung cho mọi field có input thật đứng ngay trước label
// (FloatInput, FloatCombobox). Input phải có `placeholder=" "` và class `peer`.
export const FLOAT_LABEL_CLASS = [
    'pointer-events-none absolute start-3 top-2 z-10 flex origin-[0] -translate-y-4 scale-75 items-center text-sm text-muted-foreground duration-200 motion-reduce:transition-none',
    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100',
    'peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-primary',
    'peer-autofill:top-2 peer-autofill:-translate-y-4 peer-autofill:scale-75',
    'peer-aria-invalid:text-destructive',
    'peer-disabled:opacity-50',
].join(' ')

export interface FloatInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof floatInputVariants> {
    label: string
    helperText?: string
    error?: string
    icon?: ReactNode
    labelClassName?: string
    ref?: Ref<HTMLInputElement>
}

// Input có label nổi (Material-style): label nằm giữa khi rỗng, thu nhỏ lên viền khi focus hoặc có giá trị.
// Dựa vào `placeholder=" "` + `peer-placeholder-shown` nên không cần state để biết input có giá trị hay không.
export function FloatInput({
    className,
    labelClassName,
    type,
    label,
    helperText,
    error,
    icon,
    variant = 'outlined',
    size = 'default',
    id,
    disabled,
    ref,
    ...props
}: FloatInputProps) {
    // ===== State =====
    const [showPassword, setShowPassword] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('common')
    const generatedId = useId()

    // ===== Derived =====
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const isPassword = type === 'password'
    const description = error ?? helperText

    // ===== Handlers =====
    const handleTogglePassword = () => setShowPassword((prev) => !prev)

    return (
        <div>
            <div className="relative">
                <input
                    id={inputId}
                    ref={ref}
                    type={isPassword && showPassword ? 'text' : type}
                    aria-invalid={Boolean(error)}
                    aria-describedby={description ? descriptionId : undefined}
                    disabled={disabled}
                    placeholder=" "
                    className={cn(
                        floatInputVariants({ variant, size }),
                        'autofill:[-webkit-text-fill-color:var(--foreground)] autofill:[box-shadow:0_0_0_1000px_var(--background)_inset]',
                        isPassword && 'pr-10',
                        className,
                    )}
                    {...props}
                />
                <label
                    htmlFor={inputId}
                    className={cn(FLOAT_LABEL_CLASS, variant === 'outlined' && LABEL_CUTOUT_CLASS, labelClassName)}
                >
                    {icon && <span className="me-1.5 inline-flex size-4 shrink-0">{icon}</span>}
                    {label}
                </label>

                {isPassword && (
                    // Vỏ định vị tách khỏi Button: `active:translate-y-px` của Button sẽ ghi đè `-translate-y-1/2`.
                    <span className="absolute top-1/2 right-2 flex -translate-y-1/2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t(showPassword ? 'hidePassword' : 'showPassword')}
                            aria-pressed={showPassword}
                            className="text-muted-foreground"
                            onClick={handleTogglePassword}
                            disabled={disabled}
                        >
                            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                        </Button>
                    </span>
                )}
            </div>

            {description && (
                <p
                    id={descriptionId}
                    className={cn('mt-1.5 text-left text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
                    role={error ? 'alert' : undefined}
                >
                    {description}
                </p>
            )}
        </div>
    )
}
