'use client'

import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { CalendarIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { DateRange } from 'react-day-picker'

import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { CALENDAR_LOCALES } from '@/constants'
import { useIsMobile } from '@/hooks'
import { cn, formatDisplayRange, formatSubmitDate, isSameRange, parseDisplayRange } from '@/utils'

import { FloatFieldDescription } from './float-combobox'
import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'

export type { DateRange } from 'react-day-picker'

export interface FloatDateRangePickerProps {
    label: string
    // Có `value` là controlled (kể cả `null` = chưa chọn); bỏ trống để dùng `defaultValue`.
    value?: DateRange | null
    defaultValue?: DateRange | null
    onValueChange?: (value: DateRange | null) => void
    // Có `name` thì render hai input ẩn `${name}From` và `${name}To` mang ngày dạng `yyyy-MM-dd` để submit form.
    name?: string
    id?: string
    error?: string
    helperText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
}

// Ô khoảng ngày có label nổi, dựng theo mẫu "Date Range Picker" của shadcn (Calendar `mode="range"` trong Popover),
// cùng cách gõ tay như FloatDatePicker: `dd/mm/yyyy - dd/mm/yyyy`. Lịch giữ mở trong lúc chọn để chọn đủ hai đầu —
// click đầu tiên của react-day-picker trả `from === to`, không phân biệt được "đã chọn xong" để tự đóng.
export function FloatDateRangePicker({
    label,
    value,
    defaultValue,
    onValueChange,
    name,
    id,
    error,
    helperText,
    disabled,
    className,
    labelClassName,
}: FloatDateRangePickerProps) {
    // ===== State =====
    const [uncontrolledRange, setUncontrolledRange] = useState<DateRange | null>(defaultValue ?? null)
    const isControlled = value !== undefined
    const range = isControlled ? value : uncontrolledRange
    const [open, setOpen] = useState(false)
    const [month, setMonth] = useState<Date | undefined>(range?.from)
    const [text, setText] = useState(() => formatDisplayRange(range))
    const [syncedRange, setSyncedRange] = useState(range)

    // ===== Hooks =====
    const t = useTranslations('common')
    const locale = useLocale()
    const isMobile = useIsMobile()
    const generatedId = useId()

    // ===== Derived =====
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    // Controlled value đổi từ bên ngoài (reset form…) → đồng bộ lại chữ trong ô, theo mẫu "điều chỉnh state khi render".
    if (!isSameRange(syncedRange, range)) {
        setSyncedRange(range)
        setText(formatDisplayRange(range))
        if (range?.from) setMonth(range.from)
    }

    // ===== Handlers =====
    const commit = (next: DateRange | null) => {
        setSyncedRange(next)
        if (!isControlled) setUncontrolledRange(next)
        onValueChange?.(next)
    }

    const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextText = event.target.value
        setText(nextText)
        if (nextText.trim() === '') {
            commit(null)
            return
        }
        const parsed = parseDisplayRange(nextText.trim())
        if (parsed) {
            commit(parsed)
            setMonth(parsed.from)
        }
    }

    const handleBlur = () => setText(formatDisplayRange(range))

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
        }
    }

    const handleCalendarSelect = (selected: DateRange | undefined) => {
        const next = selected?.from ? selected : null
        commit(next)
        setText(formatDisplayRange(next))
    }

    return (
        <div className={className}>
            <div className="relative">
                {/* `<input>` trần có chủ đích: cùng lớp `floatInputVariants` với FloatInput, nhưng cần điều khiển
                    chữ/parse riêng nên không bọc lại FloatInput. */}
                <input
                    id={inputId}
                    value={text}
                    // Gợi ý định dạng chỉ hiện khi focus — lúc rỗng mà không focus, vị trí đó là của label nổi.
                    placeholder={t('dateRangeFormatHint')}
                    autoComplete="off"
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={hasDescription ? descriptionId : undefined}
                    className={cn(
                        floatInputVariants({ variant: 'outlined', size: 'default' }),
                        'pr-11 placeholder:text-transparent focus:placeholder:text-muted-foreground',
                    )}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                <label htmlFor={inputId} className={cn(FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, labelClassName)}>
                    {label}
                </label>
                {/* Định vị bằng span bọc ngoài — Button có `translate-y-px` khi nhấn, sẽ đè `-translate-y-1/2`. */}
                <span className="absolute top-1/2 right-2.5 flex -translate-y-1/2">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={disabled}
                                aria-label={t('selectDateRange')}
                                className="text-muted-foreground"
                            >
                                <CalendarIcon className="size-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="end"
                            alignOffset={-8}
                            sideOffset={10}
                        >
                            <Calendar
                                mode="range"
                                // Màn hẹp chỉ đủ chỗ một tháng; màn rộng hiện hai tháng liền nhau như mẫu shadcn.
                                numberOfMonths={isMobile ? 1 : 2}
                                selected={range ?? undefined}
                                month={month}
                                onMonthChange={setMonth}
                                locale={CALENDAR_LOCALES[locale]}
                                onSelect={handleCalendarSelect}
                            />
                        </PopoverContent>
                    </Popover>
                </span>
                {name && (
                    <>
                        <input type="hidden" name={`${name}From`} value={formatSubmitDate(range?.from)} />
                        <input type="hidden" name={`${name}To`} value={formatSubmitDate(range?.to)} />
                    </>
                )}
            </div>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
