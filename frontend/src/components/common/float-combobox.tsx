'use client'

import { useId } from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import type { VariantProps } from 'class-variance-authority'
import { useTranslations } from 'next-intl'

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger } from '@/components/ui'
import { cn } from '@/utils'

import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'

// Shape `{ value, label }` là quy ước của Base UI: nó tự lấy `label` để hiện và `value` để submit form.
export interface FloatOption {
    value: string
    label: string
    disabled?: boolean
}

function findOption(options: readonly FloatOption[], value: string | null | undefined) {
    return options.find((option) => option.value === value) ?? null
}

// Dòng mô tả/lỗi dưới field — dùng chung cho FloatCombobox và FloatMultiSelect.
export function FloatFieldDescription({ id, error, helperText }: { id: string; error?: string; helperText?: string }) {
    const description = error ?? helperText
    if (!description) return null

    return (
        <p
            id={id}
            className={cn('mt-1.5 text-left text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
            role={error ? 'alert' : undefined}
        >
            {description}
        </p>
    )
}

export interface FloatComboboxProps {
    label: string
    options: readonly FloatOption[]
    // Có `value` là controlled (kể cả `null` = chưa chọn); bỏ trống để dùng `defaultValue`.
    value?: string | null
    defaultValue?: string | null
    onValueChange?: (value: string | null) => void
    name?: string
    id?: string
    error?: string
    helperText?: string
    emptyText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
    // Cùng thang kích thước với FloatInput (`sm` = h-10) để ô chọn đứng cạnh ô nhập trong thanh công cụ không lệch.
    size?: VariantProps<typeof floatInputVariants>['size']
}

// Ô chọn một giá trị có tìm kiếm, label nổi giống FloatInput. Giá trị ra/vào là chuỗi `option.value`
// để nối thẳng với react-hook-form `Controller`, không phải truyền object option qua lại.
export function FloatCombobox({
    label,
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    id,
    error,
    helperText,
    emptyText,
    disabled,
    className,
    labelClassName,
    size = 'default',
}: FloatComboboxProps) {
    // ===== Hooks =====
    const t = useTranslations('common')
    const generatedId = useId()

    // ===== Derived =====
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)
    // Nút mở danh sách nằm trong input nên phải co lại theo cỡ ô, không thì ở cỡ `sm` nó chiếm gần hết chiều cao.
    const isCompact = size === 'sm'

    // ===== Handlers =====
    const handleValueChange = (option: FloatOption | null) => onValueChange?.(option?.value ?? null)

    return (
        <div className={className}>
            <Combobox
                items={options}
                name={name}
                disabled={disabled}
                value={value === undefined ? undefined : findOption(options, value)}
                defaultValue={defaultValue === undefined ? undefined : findOption(options, defaultValue)}
                onValueChange={handleValueChange}
            >
                <div className="relative">
                    <ComboboxPrimitive.Input
                        id={inputId}
                        placeholder=" "
                        aria-invalid={Boolean(error)}
                        aria-describedby={hasDescription ? descriptionId : undefined}
                        className={cn(floatInputVariants({ variant: 'outlined', size }), isCompact ? 'pr-8' : 'pr-10')}
                    />
                    <label htmlFor={inputId} className={cn(FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, labelClassName)}>
                        {label}
                    </label>
                    <ComboboxTrigger
                        aria-label={label}
                        className={cn(
                            'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            isCompact ? 'right-1.5 size-5' : 'right-2 size-6',
                        )}
                    />
                </div>
                {/* Mặc định shadcn cho popup rộng hơn input 28px (chừa chỗ nút trigger của InputGroup); ở đây
                    trigger nằm trong input nên ép bằng đúng chiều rộng input, khớp FloatMultiSelect. */}
                <ComboboxContent className="min-w-(--anchor-width)">
                    <ComboboxEmpty>{emptyText ?? t('noResults')}</ComboboxEmpty>
                    <ComboboxList>
                        {(option: FloatOption) => (
                            <ComboboxItem key={option.value} value={option} disabled={option.disabled}>
                                {option.label}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
