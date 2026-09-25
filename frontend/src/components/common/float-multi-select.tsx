'use client'

import { useId } from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from './button'
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from './combobox'
import { FloatFieldDescription, type FloatOption } from './float-combobox'

// Ô chips không có một input "rỗng/không rỗng" duy nhất để dùng `peer-placeholder-shown`, nên label nổi theo
// `group`: nổi khi đang focus hoặc đã có ít nhất một chip, nằm giữa khi rỗng và không focus.
const FLOATED = [
    'group-focus-within/float:top-2 group-focus-within/float:-translate-y-4 group-focus-within/float:scale-75 group-focus-within/float:bg-background group-focus-within/float:px-1 group-focus-within/float:text-primary',
    'group-has-[[data-slot=combobox-chip]]/float:top-2 group-has-[[data-slot=combobox-chip]]/float:-translate-y-4 group-has-[[data-slot=combobox-chip]]/float:scale-75 group-has-[[data-slot=combobox-chip]]/float:bg-background group-has-[[data-slot=combobox-chip]]/float:px-1',
].join(' ')

export interface FloatMultiSelectProps {
    label: string
    options: readonly FloatOption[]
    // Có `value` là controlled; bỏ trống để dùng `defaultValue`.
    value?: readonly string[]
    defaultValue?: readonly string[]
    onValueChange?: (value: string[]) => void
    name?: string
    id?: string
    error?: string
    helperText?: string
    emptyText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
}

const toOptions = (options: readonly FloatOption[], values: readonly string[] | undefined) =>
    values === undefined ? undefined : options.filter((option) => values.includes(option.value))

// Chọn nhiều giá trị có tìm kiếm, giá trị đã chọn hiện thành chip, label nổi giống FloatInput.
export function FloatMultiSelect({
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
}: FloatMultiSelectProps) {
    const t = useTranslations('common')
    const anchor = useComboboxAnchor()
    const generatedId = useId()
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    return (
        <div className={className}>
            <Combobox
                multiple
                items={options}
                name={name}
                disabled={disabled}
                value={toOptions(options, value)}
                defaultValue={toOptions(options, defaultValue)}
                onValueChange={(selected) => onValueChange?.(selected.map((option) => option.value))}
            >
                <ComboboxChips
                    ref={anchor}
                    className={cn(
                        'group/float relative min-h-12 gap-1.5 px-3 py-2.5 text-base focus-within:border-primary focus-within:ring-primary/30 has-data-[slot=combobox-chip]:px-2',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    <ComboboxValue>
                        {(selected: FloatOption[]) =>
                            selected.map((option) => (
                                <ComboboxChip key={option.value} showRemove={false} className="h-6 text-sm">
                                    {option.label}
                                    <ComboboxPrimitive.ChipRemove
                                        render={<Button variant="ghost" size="icon-xs" />}
                                        aria-label={t('removeItem', { item: option.label })}
                                        className="-mr-1 opacity-60 hover:opacity-100"
                                    >
                                        <XIcon className="pointer-events-none" />
                                    </ComboboxPrimitive.ChipRemove>
                                </ComboboxChip>
                            ))
                        }
                    </ComboboxValue>
                    <ComboboxChipsInput
                        id={inputId}
                        aria-invalid={Boolean(error)}
                        aria-describedby={hasDescription ? descriptionId : undefined}
                        className="bg-transparent text-foreground"
                    />
                    <label
                        htmlFor={inputId}
                        className={cn(
                            'pointer-events-none absolute start-3 top-1/2 z-10 flex origin-[0] -translate-y-1/2 items-center rounded text-sm text-muted-foreground duration-200 motion-reduce:transition-none',
                            'group-has-aria-invalid/float:text-destructive',
                            FLOATED,
                            labelClassName,
                        )}
                    >
                        {label}
                    </label>
                </ComboboxChips>
                <ComboboxContent anchor={anchor}>
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
