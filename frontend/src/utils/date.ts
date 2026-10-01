import { format, isValid, parse, parseISO } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import {
    DATE_DISPLAY_FORMAT,
    DATE_PARSE_FORMAT,
    DATE_RANGE_DISPLAY_SEPARATOR,
    DATE_RANGE_SEPARATOR_PATTERN,
    DATE_SUBMIT_FORMAT,
    DATE_TIME_DISPLAY_FORMAT,
    TYPED_DATE_PATTERN,
} from '@/constants'

// Hàm thuần đọc/ghi ngày cho FloatDatePicker, FloatDateRangePicker và cột ngày của bảng — mọi nơi hiển thị và đọc ngày
// giống hệt nhau.

export function formatDisplayDate(date: Date | null | undefined): string {
    return date ? format(date, DATE_DISPLAY_FORMAT) : ''
}

// Mốc ngày + giờ:phút:giây cho các màn quản trị (bảng, khối chi tiết). Ô nhập ngày vẫn dùng `formatDisplayDate` vì ở đó
// chỉ có ngày; còn một mốc thời gian đọc từ backend thì luôn hiện đủ giờ phút giây để phân biệt được thứ tự.
export function formatDisplayDateTime(date: Date | null | undefined): string {
    return date ? format(date, DATE_TIME_DISPLAY_FORMAT) : ''
}

// Chuỗi ISO (hoặc `Date`) từ backend → ngày + giờ:phút:giây. Nhận thẳng giá trị của trường (`createdAt`, `lastLoginAt`…)
// để mọi module gọi cùng một hàm thay vì tự `parseISO` rồi `format` theo cách riêng. Giá trị rỗng/không đọc được trả
// chuỗi rỗng, nơi gọi tự quyết định câu thay thế ("chưa từng", "chưa cập nhật"…).
export function formatTimestamp(value: string | Date | null | undefined): string {
    if (!value) return ''
    const date = typeof value === 'string' ? parseISO(value) : value
    return isValid(date) ? formatDisplayDateTime(date) : ''
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
