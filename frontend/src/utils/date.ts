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

export function formatDisplayDateTimeShort(date: Date | null | undefined): string {
    return date ? format(date, 'dd/MM/yyyy HH:mm') : ''
}

export function formatSubmitDate(date: Date | null | undefined): string {
    return date ? format(date, DATE_SUBMIT_FORMAT) : ''
}

export function parseDisplayDate(text: string): Date | null {
    if (!TYPED_DATE_PATTERN.test(text)) return null
    const parsed = parse(text, DATE_PARSE_FORMAT, new Date())
    return isValid(parsed) ? parsed : null
}

export function parseDisplayDateTime(text: string): Date | null {
    const cleaned = text.trim().replace(/:+$/, '')
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/)
    if (!match) return null
    const day = parseInt(match[1]!, 10)
    const month = parseInt(match[2]!, 10) - 1
    const year = parseInt(match[3]!, 10)
    const hours = match[4] ? parseInt(match[4], 10) : 0
    const minutes = match[5] ? parseInt(match[5], 10) : 0
    const seconds = match[6] ? parseInt(match[6], 10) : 0

    if (month < 0 || month > 11 || day < 1 || day > 31 || hours > 23 || minutes > 59 || seconds > 59) {
        return null
    }

    const d = new Date(year, month, day, hours, minutes, seconds)
    return isValid(d) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? d : null
}

// Tự động gài mặt nạ nhập liệu (Input Masking) theo chuẩn UX các thư viện chuyên nghiệp:
// - Ngày: tự chèn `/` sau 2 số ngày và 2 số tháng (dd/MM/yyyy).
// - Giờ: nếu `showTime=true`, tự động gõ cả giây (dd/MM/yyyy HH:mm:ss).
// - Khi xóa: nếu xóa hết text thì lùi về `0/` chứ không để trống trơn; nếu xóa phần giờ thì reset về `00:00:00`.
export function applyDateInputMask(raw: string, prev: string, showTime = false): string {
    // 1. Nếu xóa hết sạch hoặc chỉ còn ký tự đặc biệt -> giữ cấu trúc bắt đầu '0/'
    if (raw.trim() === '' || raw === '/' || raw === '0') {
        return '0/'
    }

    // 2. Nếu người dùng đang xoá lùi (Backspace / Delete)
    if (raw.length < prev.length) {
        // Nếu xóa phần giờ về sau mốc ngày: reset giờ về 00:00:00 chứ không xóa mất giờ
        if (showTime) {
            const datePartMatch = raw.match(/^(\d{2}\/\d{2}\/\d{4})\s*$/)
            if (datePartMatch) {
                return `${datePartMatch[1]} 00:00:00`
            }
        }

        // Nếu xóa ngày lùi về chỉ còn 0 hoặc rỗng trước dấu '/'
        if (raw === '0/' || raw === '/') {
            return '0/'
        }

        return raw
    }

    // 3. Nếu đang ở trạng thái '0/' và người dùng gõ số tiếp theo
    if (prev === '0/' && /^\d$/.test(raw.replace(/[0/]/g, ''))) {
        const typedDigit = raw.replace(/[0/]/g, '')
        return `${typedDigit}/`
    }

    // 4. Nếu người dùng gõ phím '/' thủ công sau 1 chữ số ngày/tháng (ví dụ "5/" -> "05/")
    if (raw.endsWith('/') && !prev.endsWith('/')) {
        const parts = raw.split('/')
        const lastPart = parts[parts.length - 2]
        if (lastPart && lastPart.length === 1 && /^\d$/.test(lastPart)) {
            parts[parts.length - 2] = `0${lastPart}`
            return parts.join('/')
        }
    }

    // 5. Nếu người dùng gõ phím ':' thủ công sau 1 chữ số giờ (ví dụ " 8:" -> " 08:")
    if (showTime && raw.endsWith(':') && !prev.endsWith(':')) {
        const timePart = raw.slice(raw.lastIndexOf(' ') + 1)
        const hourPart = timePart.slice(0, -1)
        if (hourPart.length === 1 && /^\d$/.test(hourPart)) {
            return `${raw.slice(0, raw.lastIndexOf(' ') + 1)}0${hourPart}:`
        }
    }

    const maxDigits = showTime ? 14 : 8
    const digits = raw.replace(/\D/g, '').slice(0, maxDigits)

    if (digits.length === 0) return '0/'

    // 1-2 chữ số: ngày
    if (digits.length < 2) {
        return digits
    }
    if (digits.length === 2) {
        return `${digits}/`
    }

    // 3-4 chữ số: tháng
    const day = digits.slice(0, 2)
    if (digits.length < 4) {
        return `${day}/${digits.slice(2)}`
    }
    if (digits.length === 4) {
        return `${day}/${digits.slice(2, 4)}/`
    }

    // 5-8 chữ số: năm
    const month = digits.slice(2, 4)
    if (digits.length < 8) {
        return `${day}/${month}/${digits.slice(4)}`
    }
    const year = digits.slice(4, 8)
    if (digits.length === 8) {
        return showTime ? `${day}/${month}/${year} ` : `${day}/${month}/${year}`
    }

    if (!showTime) {
        return `${day}/${month}/${year}`
    }

    // 9-10 chữ số: giờ
    if (digits.length < 10) {
        return `${day}/${month}/${year} ${digits.slice(8)}`
    }
    const hours = digits.slice(8, 10)
    if (digits.length === 10) {
        return `${day}/${month}/${year} ${hours}:`
    }

    // 11-12 chữ số: phút
    if (digits.length < 12) {
        return `${day}/${month}/${year} ${hours}:${digits.slice(10)}`
    }
    const minutes = digits.slice(10, 12)
    if (digits.length === 12) {
        return `${day}/${month}/${year} ${hours}:${minutes}:`
    }

    // 13-14 chữ số: giây
    const seconds = digits.slice(12, 14)
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
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

export function formatRelativeTime(value: string | Date | null | undefined, locale: 'vi' | 'en' = 'vi'): string {
    if (!value) return ''
    const date = typeof value === 'string' ? parseISO(value) : value
    if (!isValid(date)) return ''

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return locale === 'en' ? 'just now' : 'vừa xong'
    if (diffMin < 60) return locale === 'en' ? `${diffMin}m` : `${diffMin}p`
    if (diffHour < 24) return `${diffHour}h`
    if (diffDay < 7) return locale === 'en' ? `${diffDay}d` : `${diffDay} ngày`
    return format(date, locale === 'en' ? 'MM/dd' : 'dd/MM')
}

// Định dạng thời gian kiểu Messenger (Facebook) cho khung chat
export function formatMessengerTimestamp(value: string | Date | null | undefined, locale: 'vi' | 'en' = 'vi'): string {
    if (!value) return ''
    const date = typeof value === 'string' ? parseISO(value) : value
    if (!isValid(date)) return ''

    const now = new Date()
    const isSameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()

    const isSameYear = date.getFullYear() === now.getFullYear()
    const timeStr = format(date, 'HH:mm')

    if (isSameDay) {
        return timeStr
    }
    if (isYesterday) {
        return locale === 'vi' ? `Hôm qua ${timeStr}` : `Yesterday ${timeStr}`
    }
    if (isSameYear) {
        return format(date, 'dd/MM, HH:mm')
    }
    return format(date, 'dd/MM/yyyy, HH:mm')
}

// Kiểm tra hiển thị mốc thời gian giữa 2 tin nhắn (chênh lệch > 20 phút hoặc khác ngày)
export function shouldShowMessageDivider(
    currentDateVal: string | Date | null | undefined,
    prevDateVal: string | Date | null | undefined
): boolean {
    if (!currentDateVal) return false
    if (!prevDateVal) return true

    const cur = typeof currentDateVal === 'string' ? parseISO(currentDateVal) : currentDateVal
    const prev = typeof prevDateVal === 'string' ? parseISO(prevDateVal) : prevDateVal
    if (!isValid(cur) || !isValid(prev)) return false

    if (cur.toDateString() !== prev.toDateString()) return true
    return Math.abs(cur.getTime() - prev.getTime()) > 20 * 60 * 1000
}

