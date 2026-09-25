'use client'

import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { CalendarIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { CALENDAR_LOCALES } from '@/constants'
import { cn, formatDisplayDate, formatSubmitDate, parseDisplayDate } from '@/utils'

import { FloatFieldDescription } from './float-combobox'
import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'

export interface FloatDatePickerProps {
    label: string
    // Có `value` là controlled (kể cả `null` = chưa chọn); bỏ trống để dùng `defaultValue`.
    value?: Date | null
    defaultValue?: Date | null
    onValueChange?: (value: Date | null) => void
    // Có `name` thì render input ẩn mang ngày dạng `yyyy-MM-dd` để submit form — không gửi chuỗi đã định dạng theo ngôn ngữ.
    name?: string
    id?: string
    error?: string
    helperText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
}

// Ô ngày có label nổi, dựng theo mẫu "Date Picker — Input" của shadcn: gõ ngày trực tiếp hoặc chọn từ lịch
// (nút lịch hoặc phím mũi tên xuống). Rời ô thì chữ được chuẩn hoá về ngày đang chọn.
export function FloatDatePicker({
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
}: FloatDatePickerProps) {
    // ===== State =====
    const [uncontrolledDate, setUncontrolledDate] = useState<Date | null>(defaultValue ?? null)
    const isControlled = value !== undefined
    const date = isControlled ? value : uncontrolledDate
    const [open, setOpen] = useState(false)
    const [month, setMonth] = useState<Date | undefined>(date ?? undefined)
    const [text, setText] = useState(() => formatDisplayDate(date))
    const [syncedDate, setSyncedDate] = useState(date)

    // ===== Hooks =====
    const t = useTranslations('common')
    const locale = useLocale()
    const generatedId = useId()

    // ===== Derived =====
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    // Controlled value đổi từ bên ngoài (reset form…) → đồng bộ lại chữ trong ô, theo mẫu "điều chỉnh state khi render".
    if (syncedDate?.getTime() !== date?.getTime()) {
        setSyncedDate(date)
        setText(formatDisplayDate(date))
        if (date) setMonth(date)
    }

    // ===== Handlers =====
    const commit = (next: Date | null) => {
        setSyncedDate(next)
        if (!isControlled) setUncontrolledDate(next)
        onValueChange?.(next)
    }

    const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextText = event.target.value
        setText(nextText)
        if (nextText.trim() === '') {
            commit(null)
            return
        }
        const parsed = parseDisplayDate(nextText.trim())
        if (parsed) {
            commit(parsed)
            setMonth(parsed)
        }
    }

    const handleBlur = () => setText(formatDisplayDate(date))

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
        }
    }

    const handleCalendarSelect = (selected: Date | undefined) => {
        const next = selected ?? null
        commit(next)
        setText(formatDisplayDate(next))
        setOpen(false)
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
                    placeholder={t('dateFormatHint')}
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
                                aria-label={t('selectDate')}
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
                                mode="single"
                                selected={date ?? undefined}
                                month={month}
                                onMonthChange={setMonth}
                                locale={CALENDAR_LOCALES[locale]}
                                onSelect={handleCalendarSelect}
                            />
                        </PopoverContent>
                    </Popover>
                </span>
                {name && <input type="hidden" name={name} value={formatSubmitDate(date)} />}
            </div>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
