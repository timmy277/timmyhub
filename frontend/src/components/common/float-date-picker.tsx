'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CalendarIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, ScrollArea } from '@/components/ui'
import { CALENDAR_LOCALES } from '@/constants'
import {
    cn,
    formatDisplayDate,
    formatDisplayDateTime,
    formatSubmitDate,
    parseDisplayDate,
    parseDisplayDateTime,
} from '@/utils'

import { FloatFieldDescription } from './float-combobox'
import { FLOAT_LABEL_CLASS, LABEL_CUTOUT_CLASS, floatInputVariants } from './float-input'

export interface FloatDatePickerProps {
    label: string
    // Có `value` là controlled (kể cả `null` = chưa chọn); bỏ trống để dùng `defaultValue`.
    value?: Date | null
    defaultValue?: Date | null
    onValueChange?: (value: Date | null) => void
    // Bật chế độ chọn/nhập cả giờ:phút:giây (`dd/MM/yyyy HH:mm:ss`)
    showTime?: boolean
    // Có `name` thì render input ẩn mang ngày dạng `yyyy-MM-dd` (hoặc ISO nếu showTime) để submit form
    name?: string
    id?: string
    error?: string
    helperText?: string
    disabled?: boolean
    className?: string
    labelClassName?: string
}

interface TimeColumnProps {
    label: string
    max: number
    value: number
    onChange: (val: number) => void
    disabled?: boolean
}

function TimeColumn({ label, max, value, onChange, disabled }: TimeColumnProps) {
    const activeRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'center' })
    }, [value])

    const items = useMemo(() => Array.from({ length: max }, (_, i) => i), [max])

    return (
        <div className="flex flex-col items-center w-14 shrink-0">
            <div className="py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 w-full text-center bg-muted/40 select-none">
                {label}
            </div>
            <ScrollArea className="h-[275px] w-full px-1 py-1">
                <div className="flex flex-col gap-0.5 pb-20">
                    {items.map((num) => {
                        const isSelected = num === value
                        return (
                            <Button
                                key={num}
                                ref={isSelected ? activeRef : undefined}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(num)}
                                className={cn(
                                    'h-7 w-full rounded-md text-xs font-mono font-medium transition-colors text-center cursor-pointer',
                                    isSelected
                                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                        : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground',
                                )}
                                variant="ghost"
                            >
                                {String(num).padStart(2, '0')}
                            </Button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

// Ô ngày có label nổi, dựng theo mẫu "Date Picker — Input" của shadcn: gõ ngày trực tiếp hoặc chọn từ lịch
// (nút lịch hoặc phím mũi tên xuống). Hỗ trợ chọn/nhập cả giờ phút giây qua prop `showTime`.
export function FloatDatePicker({
    label,
    value,
    defaultValue,
    onValueChange,
    showTime = false,
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

    const formatDateText = useCallback(
        (d: Date | null | undefined) => {
            if (!d) return ''
            return showTime ? formatDisplayDateTime(d) : formatDisplayDate(d)
        },
        [showTime],
    )

    const [text, setText] = useState(() => formatDateText(date))
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
        setText(formatDateText(date))
        if (date) setMonth(date)
    }

    const inputRef = useRef<HTMLInputElement>(null)

    const getTemplate = useCallback(() => {
        return showTime ? 'dd/mm/yyyy 00:00:00' : 'dd/mm/yyyy'
    }, [showTime])

    // ===== Handlers =====
    const commit = (next: Date | null) => {
        setSyncedDate(next)
        if (!isControlled) setUncontrolledDate(next)
        onValueChange?.(next)
    }

    const handleFocus = () => {
        if (!text || text.trim() === '') {
            const template = getTemplate()
            setText(template)
            requestAnimationFrame(() => inputRef.current?.setSelectionRange(0, 0))
        }
    }

    const handleBlur = () => {
        if (!date) {
            setText('')
            return
        }
        setText(formatDateText(date))
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
            return
        }

        const input = inputRef.current
        if (!input) return

        const template = getTemplate()
        const currentVal = text || template
        const selStart = input.selectionStart ?? 0
        const selEnd = input.selectionEnd ?? 0

        // Phím Backspace: xóa từng số một, dấu '/' và ':' không thể bị xóa
        if (event.key === 'Backspace') {
            event.preventDefault()

            // Nếu user bôi đen toàn bộ text và bấm Backspace
            if (selStart === 0 && selEnd >= currentVal.length) {
                setText(template)
                commit(null)
                requestAnimationFrame(() => input.setSelectionRange(0, 0))
                return
            }

            const chars = currentVal.padEnd(template.length, ' ').split('')
            const templateChars = template.split('')

            // Nếu user bôi đen một đoạn text (selection range)
            if (selStart !== selEnd) {
                for (let i = selStart; i < selEnd; i++) {
                    if (chars[i] !== '/' && chars[i] !== ':' && chars[i] !== ' ') {
                        chars[i] = templateChars[i] ?? ' '
                    }
                }
                const nextText = chars.join('')
                setText(nextText)
                const isComplete = !/[dmy]/.test(nextText.slice(0, 10))
                const parsed = isComplete
                    ? showTime
                        ? parseDisplayDateTime(nextText)
                        : parseDisplayDate(nextText)
                    : null
                if (parsed) {
                    commit(parsed)
                    setMonth(parsed)
                } else {
                    commit(null)
                }
                requestAnimationFrame(() => input.setSelectionRange(selStart, selStart))
                return
            }

            // Xóa từng số một: xác định vị trí ký tự cần xóa
            let targetIdx = selStart - 1

            // Nếu targetIdx rơi trúng dấu ngăn cách ('/', ':', ' ') -> nhảy qua dấu ngăn cách
            if (targetIdx === 2 || targetIdx === 5 || targetIdx === 10 || targetIdx === 13 || targetIdx === 16) {
                targetIdx -= 1
            }

            if (targetIdx < 0) return

            // Thay thế bằng ký tự placeholder tương ứng ('0' cho giờ/phút/giây, 'y' cho năm, 'm' cho tháng, 'd' cho ngày)
            chars[targetIdx] = templateChars[targetIdx] ?? ' '

            // Đảm bảo dấu ngăn cách luôn nguyên vẹn
            chars[2] = '/'
            chars[5] = '/'
            if (showTime) {
                chars[10] = ' '
                chars[13] = ':'
                chars[16] = ':'
            }

            const nextText = chars.join('')
            setText(nextText)

            const isComplete = !/[dmy]/.test(nextText.slice(0, 10))
            const parsed = isComplete ? (showTime ? parseDisplayDateTime(nextText) : parseDisplayDate(nextText)) : null
            if (parsed) {
                commit(parsed)
                setMonth(parsed)
            } else {
                commit(null)
            }

            requestAnimationFrame(() => input.setSelectionRange(targetIdx, targetIdx))
            return
        }

        // Phím Delete (xóa xuôi từng số)
        if (event.key === 'Delete') {
            event.preventDefault()

            const chars = currentVal.padEnd(template.length, ' ').split('')
            const templateChars = template.split('')

            let targetIdx = selStart
            if (targetIdx === 2 || targetIdx === 5 || targetIdx === 10 || targetIdx === 13 || targetIdx === 16) {
                targetIdx += 1
            }

            const maxLen = showTime ? 19 : 10
            if (targetIdx >= maxLen) return

            chars[targetIdx] = templateChars[targetIdx] ?? ' '

            chars[2] = '/'
            chars[5] = '/'
            if (showTime) {
                chars[10] = ' '
                chars[13] = ':'
                chars[16] = ':'
            }

            const nextText = chars.join('')
            setText(nextText)

            const isComplete = !/[dmy]/.test(nextText.slice(0, 10))
            const parsed = isComplete ? (showTime ? parseDisplayDateTime(nextText) : parseDisplayDate(nextText)) : null
            if (parsed) {
                commit(parsed)
                setMonth(parsed)
            } else {
                commit(null)
            }

            const nextPos = targetIdx + 1
            requestAnimationFrame(() => input.setSelectionRange(nextPos, nextPos))
            return
        }

        // Nhập các chữ số 0 - 9
        if (/^\d$/.test(event.key)) {
            event.preventDefault()

            const chars = currentVal.padEnd(template.length, ' ').split('')
            let pos = selStart

            // Bỏ qua dấu ngăn cách nếu con trỏ đang rơi trúng
            if (pos === 2 || pos === 5) pos += 1
            if (showTime) {
                if (pos === 10) pos += 1
                if (pos === 13 || pos === 16) pos += 1
            }

            const maxLen = showTime ? 19 : 10
            if (pos >= maxLen) return

            chars[pos] = event.key
            let nextPos = pos + 1

            // Tự động nhảy qua dấu ngăn cách tiếp theo
            if (nextPos === 2 || nextPos === 5) nextPos += 1
            if (showTime) {
                if (nextPos === 10) nextPos += 1
                if (nextPos === 13 || nextPos === 16) nextPos += 1
            }

            chars[2] = '/'
            chars[5] = '/'
            if (showTime) {
                chars[10] = ' '
                chars[13] = ':'
                chars[16] = ':'
            }

            const nextText = chars.join('')
            setText(nextText)

            const parsed = showTime ? parseDisplayDateTime(nextText) : parseDisplayDate(nextText)
            if (parsed) {
                commit(parsed)
                setMonth(parsed)
            }

            requestAnimationFrame(() => input.setSelectionRange(nextPos, nextPos))
            return
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text')
        const digits = pasted.replace(/\D/g, '')
        if (!digits) return

        const template = getTemplate()
        const chars = template.split('')
        const slots = showTime ? [0, 1, 3, 4, 6, 7, 8, 9, 11, 12, 14, 15, 17, 18] : [0, 1, 3, 4, 6, 7, 8, 9]
        for (let i = 0; i < digits.length && i < slots.length; i++) {
            chars[slots[i]!] = digits[i]!
        }
        const nextText = chars.join('')
        setText(nextText)
        const parsed = showTime ? parseDisplayDateTime(nextText) : parseDisplayDate(nextText)
        if (parsed) {
            commit(parsed)
            setMonth(parsed)
        }
    }

    const handleCalendarSelect = (selected: Date | undefined) => {
        if (!selected) {
            commit(null)
            setText('')
            if (!showTime) setOpen(false)
            return
        }
        const next = new Date(selected)
        if (showTime) {
            if (date) {
                next.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0)
            } else {
                next.setHours(0, 0, 0, 0)
            }
            commit(next)
            setText(formatDateText(next))
            // Giữ popover mở để người dùng có thể chỉnh giờ nếu muốn
        } else {
            commit(next)
            setText(formatDateText(next))
            setOpen(false)
        }
    }

    const handleHourChange = (newHour: number) => {
        const base = date ? new Date(date) : new Date()
        base.setHours(newHour)
        commit(base)
        setText(formatDateText(base))
        if (!date) setMonth(base)
    }

    const handleMinuteChange = (newMinute: number) => {
        const base = date ? new Date(date) : new Date()
        base.setMinutes(newMinute)
        commit(base)
        setText(formatDateText(base))
        if (!date) setMonth(base)
    }

    const handleSecondChange = (newSecond: number) => {
        const base = date ? new Date(date) : new Date()
        base.setSeconds(newSecond)
        commit(base)
        setText(formatDateText(base))
        if (!date) setMonth(base)
    }

    return (
        <div className={className}>
            <div className="relative">
                {/* `<input>` trần có chủ đích: cùng lớp `floatInputVariants` với FloatInput, nhưng cần điều khiển
                    chữ/parse riêng nên không bọc lại FloatInput. */}
                <input
                    ref={inputRef}
                    id={inputId}
                    value={text}
                    placeholder={showTime ? t('dateTimeFormatHint') : t('dateFormatHint')}
                    autoComplete="off"
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={hasDescription ? descriptionId : undefined}
                    className={cn(
                        floatInputVariants({ variant: 'outlined', size: 'default' }),
                        'pr-11 placeholder:text-transparent focus:placeholder:text-muted-foreground',
                    )}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onChange={() => {}}
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
                            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
                                <Calendar
                                    mode="single"
                                    selected={date ?? undefined}
                                    month={month}
                                    onMonthChange={setMonth}
                                    locale={CALENDAR_LOCALES[locale]}
                                    onSelect={handleCalendarSelect}
                                />
                                {showTime && (
                                    <div className="flex divide-x divide-border/60 bg-muted/10 h-[220px] sm:h-[315px]">
                                        <TimeColumn
                                            label="HH"
                                            max={24}
                                            value={date ? date.getHours() : 0}
                                            onChange={handleHourChange}
                                            disabled={disabled}
                                        />
                                        <TimeColumn
                                            label="MM"
                                            max={60}
                                            value={date ? date.getMinutes() : 0}
                                            onChange={handleMinuteChange}
                                            disabled={disabled}
                                        />
                                        <TimeColumn
                                            label="SS"
                                            max={60}
                                            value={date ? date.getSeconds() : 0}
                                            onChange={handleSecondChange}
                                            disabled={disabled}
                                        />
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </span>
                {name && (
                    <input
                        type="hidden"
                        name={name}
                        value={showTime ? (date?.toISOString() ?? '') : formatSubmitDate(date)}
                    />
                )}
            </div>
            <FloatFieldDescription id={descriptionId} error={error} helperText={helperText} />
        </div>
    )
}
