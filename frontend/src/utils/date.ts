import { format, isValid, parse } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import {
    DATE_DISPLAY_FORMAT,
    DATE_PARSE_FORMAT,
    DATE_RANGE_DISPLAY_SEPARATOR,
    DATE_RANGE_SEPARATOR_PATTERN,
    DATE_SUBMIT_FORMAT,
    TYPED_DATE_PATTERN,
} from '@/constants'

// Hàm thuần đọc/ghi ngày cho FloatDatePicker, FloatDateRangePicker và cột ngày của bảng — mọi nơi hiển thị và đọc ngày
// giống hệt nhau.

export function formatDisplayDate(date: Date | null | undefined): string {
    return date ? format(date, DATE_DISPLAY_FORMAT) : ''
}

export function formatSubmitDate(date: Date | null | undefined): string {
    return date ? format(date, DATE_SUBMIT_FORMAT) : ''
}

export function parseDisplayDate(text: string): Date | null {
    if (!TYPED_DATE_PATTERN.test(text)) return null
    const parsed = parse(text, DATE_PARSE_FORMAT, new Date())
    return isValid(parsed) ? parsed : null
}

export function formatDisplayRange(range: DateRange | null | undefined): string {
    if (!range?.from) return ''
    return range.to
        ? `${formatDisplayDate(range.from)}${DATE_RANGE_DISPLAY_SEPARATOR}${formatDisplayDate(range.to)}`
        : formatDisplayDate(range.from)
}

// Gõ một ngày → mới có ngày bắt đầu; gõ đủ hai ngày → khoảng hoàn chỉnh, gõ ngược thứ tự thì tự đảo lại.
// Trả `null` khi chuỗi chưa đọc được (đang gõ dở) — lúc đó giữ nguyên giá trị cũ.
export function parseDisplayRange(text: string): DateRange | null {
    const parts = text.split(DATE_RANGE_SEPARATOR_PATTERN).filter(Boolean)
    if (parts.length === 0 || parts.length > 2) return null
    const from = parseDisplayDate(parts[0])
    if (!from) return null
    if (parts.length === 1) return { from, to: undefined }
    const to = parseDisplayDate(parts[1])
    if (!to) return null
    return from.getTime() <= to.getTime() ? { from, to } : { from: to, to: from }
}

export function isSameRange(a: DateRange | null | undefined, b: DateRange | null | undefined): boolean {
    return a?.from?.getTime() === b?.from?.getTime() && a?.to?.getTime() === b?.to?.getTime()
}
