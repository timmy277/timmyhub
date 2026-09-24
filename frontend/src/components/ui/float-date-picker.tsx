'use client'

import { useId, useState } from 'react'
import { format as formatDate, isValid, parse } from 'date-fns'
import { enUS, vi, type Locale as DateFnsLocale } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from 'cn'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/types'

import { Button } from './button'
import { Calendar } from './calendar'
import { FloatFieldDescription } from './float-combobox'
import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

const CALENDAR_LOCALES: Record<Locale, DateFnsLocale> = { vi, en: enUS }

// Hiển thị cố định ngày/tháng/năm bằng số ở mọi ngôn ngữ — cùng một định dạng thì gõ tay mới đọc ngược lại được.
const DISPLAY_FORMAT = 'dd/MM/yyyy'
// Chấp nhận gõ thiếu số 0 (`1/6/2026`), nhưng năm phải đủ 4 chữ số — tránh `1/6/2` thành năm 0002 khi đang gõ dở.
const TYPED_DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}$/

function toText(date: Date | null | undefined) {
    return date ? formatDate(date, DISPLAY_FORMAT) : ''
}

function parseTyped(text: string) {
    if (!TYPED_DATE_PATTERN.test(text)) return null
    const parsed = parse(text, 'd/M/yyyy', new Date())
    return isValid(parsed) ? parsed : null
}

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
    const t = useTranslations('common')
    const locale = useLocale() as Locale
    const generatedId = useId()
    const inputId = id ?? generatedId
    const descriptionId = `${inputId}-description`
    const hasDescription = Boolean(error ?? helperText)

    const [uncontrolledDate, setUncontrolledDate] = useState<Date | null>(defaultValue ?? null)
    const isControlled = value !== undefined
    const date = isControlled ? value : uncontrolledDate

    const [open, setOpen] = useState(false)
    const [month, setMonth] = useState<Date | undefined>(date ?? undefined)
    const [text, setText] = useState(() => toText(date))

    // Controlled value đổi từ bên ngoài (reset form…) → đồng bộ lại chữ trong ô, theo mẫu "điều chỉnh state khi render".
    const [syncedDate, setSyncedDate] = useState(date)
    if (syncedDate?.getTime() !== date?.getTime()) {
        setSyncedDate(date)
        setText(toText(date))
        if (date) setMonth(date)
    }

    const commit = (next: Date | null) => {
        setSyncedDate(next)
        if (!isControlled) setUncontrolledDate(next)
        onValueChange?.(next)
    }

    return (
        <div className={className}>
            <div className="relative">
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
                    onChange={(event) => {
                        const nextText = event.target.value
                        setText(nextText)
                        if (nextText.trim() === '') {
                            commit(null)
                            return
                        }
                        const parsed = parseTyped(nextText.trim())
                        if (parsed) {
                            commit(parsed)
                            setMonth(parsed)
                        }
                    }}
                    onBlur={() => setText(toText(date))}
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
                            aria-label={t('selectDate')}
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
                        >
                            <CalendarIcon className="size-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="end" alignOffset={-8} sideOffset={10}>
                        <Calendar
                            mode="single"
                            selected={date ?? undefined}
                            month={month}
                            onMonthChange={setMonth}
                            locale={CALENDAR_LOCALES[locale]}
                            onSelect={(selected) => {
                                const next = selected ?? null
                                commit(next)
                                setText(toText(next))
                                setOpen(false)
                            }}
                        />
                    </PopoverContent>
                </Popover>
                {name && <input type="hidden" name={name} value={date ? formatDate(date, 'yyyy-MM-dd') : ''} />}
            </div>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
