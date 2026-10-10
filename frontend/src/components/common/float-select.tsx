'use client'

import React, { useId, useState } from 'react'
import type { VariantProps } from 'class-variance-authority'

import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui'
import { cn } from '@/utils'

import { FloatFieldDescription } from './float-combobox'
import { floatInputVariants } from './float-input'

export interface FloatSelectProps {
    label: string
    value?: string | null
    defaultValue?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    error?: string
    helperText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
    triggerClassName?: string
    size?: VariantProps<typeof floatInputVariants>['size']
    id?: string
    name?: string
    reserveErrorSpace?: boolean
    children: React.ReactNode
}

// Select có label nổi (Material-style), cùng họ với FloatInput và FloatCombobox.
// Đảm bảo chiều cao, viền và vị trí label đồng bộ hoàn toàn khi đứng cạnh ô nhập liệu.
export function FloatSelect({
    label,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    error,
    helperText,
    disabled,
    className,
    labelClassName,
    triggerClassName,
    size = 'default',
    id,
    name,
    reserveErrorSpace,
    children,
}: FloatSelectProps) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    const [isOpen, setIsOpen] = useState(false)
    const [internalValue, setInternalValue] = useState(defaultValue ?? '')

    const resolvedValue = value !== undefined ? (value ?? '') : internalValue
    const hasValue = Boolean(resolvedValue && resolvedValue.trim().length > 0)
    const isFloated = hasValue || isOpen

    const handleValueChange = (val: string) => {
        if (value === undefined) {
            setInternalValue(val)
        }
        onValueChange?.(val)
    }

    return (
        <div className={cn('relative', className)}>
            <Select
                value={resolvedValue}
                onValueChange={handleValueChange}
                open={isOpen}
                onOpenChange={setIsOpen}
                disabled={disabled}
                name={name}
            >
                <div className="relative">
                    <SelectTrigger
                        id={inputId}
                        aria-invalid={Boolean(error)}
                        aria-describedby={hasDescription ? descriptionId : undefined}
                        disabled={disabled}
                        className={cn(
                            floatInputVariants({ variant: 'outlined', size }),
                            'flex w-full items-center justify-between text-left font-normal cursor-pointer select-none',
                            size === 'sm' ? 'h-10 text-xs px-2.5' : 'h-12 text-sm px-3',
                            error && 'border-destructive focus-visible:ring-destructive/20',
                            triggerClassName,
                        )}
                    >
                        <span className={cn('block truncate', !hasValue && !isOpen && 'opacity-0')}>
                            <SelectValue placeholder={placeholder} />
                        </span>
                    </SelectTrigger>

                    <label
                        htmlFor={inputId}
                        className={cn(
                            'pointer-events-none absolute start-3 z-10 flex origin-[0] items-center text-sm duration-200 motion-reduce:transition-none select-none',
                            isFloated
                                ? 'top-2 -translate-y-4 scale-75 rounded bg-background px-1'
                                : 'top-1/2 -translate-y-1/2 scale-100 bg-transparent px-0 text-muted-foreground',
                            isOpen && isFloated && 'text-primary',
                            error && 'text-destructive',
                            disabled && 'opacity-50',
                            labelClassName,
                        )}
                    >
                        {label}
                    </label>
                </div>

                <SelectContent>{children}</SelectContent>
            </Select>

            <FloatFieldDescription
                id={descriptionId}
                error={error}
                helperText={helperText}
                reserveErrorSpace={reserveErrorSpace}
            />
        </div>
    )
}
