'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/utils'

const ratingVariants = cva('inline-flex items-center gap-1 select-none', {
    variants: {
        size: {
            sm: '[&_svg]:size-3.5 gap-0.5',
            default: '[&_svg]:size-4 gap-1',
            md: '[&_svg]:size-5 gap-1.5',
            lg: '[&_svg]:size-7 gap-2',
            xl: '[&_svg]:size-9 sm:[&_svg]:size-10 gap-2 sm:gap-3',
        },
    },
    defaultVariants: {
        size: 'default',
    },
})

export interface RatingProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>, VariantProps<typeof ratingVariants> {
    value?: number
    defaultValue?: number
    max?: number
    readOnly?: boolean
    disabled?: boolean
    onChange?: (value: number) => void
    onHoverChange?: (value: number | null) => void
    allowClear?: boolean
}

export const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
    (
        {
            className,
            size = 'default',
            value: controlledValue,
            defaultValue = 0,
            max = 5,
            readOnly = false,
            disabled = false,
            onChange,
            onHoverChange,
            ...props
        },
        ref,
    ) => {
        const [internalValue, setInternalValue] = React.useState(defaultValue)
        const [hoverValue, setHoverValue] = React.useState<number | null>(null)

        const isControlled = controlledValue !== undefined
        const currentValue = isControlled ? controlledValue : internalValue
        const activeValue = hoverValue !== null ? hoverValue : currentValue

        const handleMouseEnter = (starIndex: number) => {
            if (readOnly || disabled) return
            setHoverValue(starIndex)
            onHoverChange?.(starIndex)
        }

        const handleMouseLeave = () => {
            if (readOnly || disabled) return
            setHoverValue(null)
            onHoverChange?.(null)
        }

        const handleClick = (starIndex: number) => {
            if (readOnly || disabled) return
            if (!isControlled) {
                setInternalValue(starIndex)
            }
            onChange?.(starIndex)
        }

        return (
            <div
                ref={ref}
                data-slot="rating"
                role={readOnly ? 'img' : 'radiogroup'}
                aria-label={`Đánh giá: ${currentValue} trên ${max} sao`}
                className={cn(ratingVariants({ size, className }))}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                {Array.from({ length: max }, (_, index) => {
                    const starNumber = index + 1
                    const isFilled = starNumber <= activeValue

                    if (readOnly || disabled) {
                        return (
                            <span
                                key={starNumber}
                                data-slot="rating-star"
                                aria-hidden="true"
                                className={cn(
                                    'transition-colors',
                                    isFilled
                                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_1px_4px_rgba(251,191,36,0.35)]'
                                        : 'text-muted-foreground/30 fill-transparent',
                                )}
                            >
                                <Star />
                            </span>
                        )
                    }

                    return (
                        <button
                            key={starNumber}
                            type="button"
                            role="radio"
                            aria-checked={currentValue === starNumber}
                            aria-label={`${starNumber} sao`}
                            disabled={disabled}
                            onMouseEnter={() => handleMouseEnter(starNumber)}
                            onClick={() => handleClick(starNumber)}
                            className={cn(
                                'rounded-full p-0.5 transition-all duration-200 outline-none',
                                'hover:scale-120 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-500/50',
                                'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                            )}
                        >
                            <Star
                                className={cn(
                                    'transition-all duration-200',
                                    isFilled
                                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.45)]'
                                        : 'text-muted-foreground/30 fill-transparent hover:text-amber-300',
                                )}
                            />
                        </button>
                    )
                })}
            </div>
        )
    },
)

Rating.displayName = 'Rating'
