'use client'

import { useId, useState } from 'react'
import { format as formatDate } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from 'cn'
import { useLocale, useTranslations } from 'next-intl'
import type { DateRange } from 'react-day-picker'

import { useIsMobile } from '@/hooks'
import type { Locale } from '@/types'

import { Button } from './button'
import { Calendar } from './calendar'
import { FloatFieldDescription } from './float-combobox'
import { CALENDAR_LOCALES, DATE_SUBMIT_FORMAT, formatDisplayDate, parseDisplayDate } from './float-date-picker'
import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type { DateRange } from 'react-day-picker'

// Chấp nhận `-` hoặc `–` làm dấu nối giữa hai ngày, khoảng trắng hai bên tuỳ ý.
const RANGE_SEPARATOR = /\s*[-–]\s*/

function formatDisplayRange(range: DateRange | null | undefined) {
    if (!range?.from) return ''
    return range.to
        ? `${formatDisplayDate(range.from)} - ${formatDisplayDate(range.to)}`
        : formatDisplayDate(range.from)
}

// Gõ một ngày → mới có ngày bắt đầu; gõ đủ hai ngày → khoảng hoàn chỉnh, gõ ngược thứ tự thì tự đảo lại.
// Trả `null` khi chuỗi chưa đọc được (đang gõ dở) — lúc đó giữ nguyên giá trị cũ.
function parseDisplayRange(text: string): DateRange | null {
    const parts = text.split(RANGE_SEPARATOR).filter(Boolean)
    if (parts.length === 0 || parts.length > 2) return null
    const from = parseDisplayDate(parts[0])
    if (!from) return null
    if (parts.length === 1) return { from, to: undefined }
    const to = parseDisplayDate(parts[1])
    if (!to) return null
    return from.getTime() <= to.getTime() ? { from, to } : { from: to, to: from }
}

function isSameRange(a: DateRange | null | undefined, b: DateRange | null | undefined) {
    return a?.from?.getTime() === b?.from?.getTime() && a?.to?.getTime() === b?.to?.getTime()
}

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
    const t = useTranslations('common')
    const locale = useLocale() as Locale
    const isMobile = useIsMobile()
    const generatedId = useId()
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    const [uncontrolledRange, setUncontrolledRange] = useState<DateRange | null>(defaultValue ?? null)
    const isControlled = value !== undefined
    const range = isControlled ? value : uncontrolledRange

    const [open, setOpen] = useState(false)
    const [month, setMonth] = useState<Date | undefined>(range?.from)
    const [text, setText] = useState(() => formatDisplayRange(range))

    // Controlled value đổi từ bên ngoài (reset form…) → đồng bộ lại chữ trong ô, theo mẫu "điều chỉnh state khi render".
    const [syncedRange, setSyncedRange] = useState(range)
    if (!isSameRange(syncedRange, range)) {
        setSyncedRange(range)
        setText(formatDisplayRange(range))
        if (range?.from) setMonth(range.from)
    }

    const commit = (next: DateRange | null) => {
        setSyncedRange(next)
        if (!isControlled) setUncontrolledRange(next)
        onValueChange?.(next)
    }

    return (
        <div className={className}>
            <div className="relative">
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
                    onChange={(event) => {
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
                    }}
                    onBlur={() => setText(formatDisplayRange(range))}
                    onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            setOpen(true)
                        }
                    }}
                />
                <label htmlFor={inputId} className={cn(FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, labelClassName)}>
                    {label}
                </label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={disabled}
                            aria-label={t('selectDateRange')}
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
                        >
                            <CalendarIcon className="size-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                        <Calendar
                            mode="range"
                            // Màn hẹp chỉ đủ chỗ một tháng; màn rộng hiện hai tháng liền nhau như mẫu shadcn.
                            numberOfMonths={isMobile ? 1 : 2}
                            selected={range ?? undefined}
                            month={month}
                            onMonthChange={setMonth}
                            locale={CALENDAR_LOCALES[locale]}
                            onSelect={(selected) => {
                                const next = selected?.from ? selected : null
                                commit(next)
                                setText(formatDisplayRange(next))
                            }}
                        />
                    </PopoverContent>
                </Popover>
                {name && (
                    <>
                        <input
                            type="hidden"
                            name={`${name}From`}
                            value={range?.from ? formatDate(range.from, DATE_SUBMIT_FORMAT) : ''}
                        />
                        <input
                            type="hidden"
                            name={`${name}To`}
                            value={range?.to ? formatDate(range.to, DATE_SUBMIT_FORMAT) : ''}
                        />
                    </>
                )}
            </div>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
