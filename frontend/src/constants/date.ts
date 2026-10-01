import { enUS, vi, type Locale as DateFnsLocale } from 'date-fns/locale'

import type { Locale } from '@timmyhub/contracts'

// Locale date-fns cho Calendar (react-day-picker) theo ngôn ngữ giao diện.
export const CALENDAR_LOCALES: Record<Locale, DateFnsLocale> = { vi, en: enUS }

// Hiển thị cố định ngày/tháng/năm bằng số ở mọi ngôn ngữ — cùng một định dạng thì gõ tay mới đọc ngược lại được.
export const DATE_DISPLAY_FORMAT = 'dd/MM/yyyy'

// Mốc thời gian đầy đủ cho các màn quản trị: ngày + giờ:phút:giây. Nhiều bản ghi trong cùng một ngày nên chỉ có ngày là
// không đủ phân biệt thứ tự; dùng chung một định dạng để mọi module hiển thị giống hệt nhau.
export const DATE_TIME_DISPLAY_FORMAT = 'dd/MM/yyyy HH:mm:ss'

// Mẫu `date-fns` đọc chuỗi người dùng gõ — chấp nhận thiếu số 0 ở ngày/tháng.
export const DATE_PARSE_FORMAT = 'd/M/yyyy'

// Định dạng gửi lên backend qua input ẩn — không phụ thuộc ngôn ngữ.
export const DATE_SUBMIT_FORMAT = 'yyyy-MM-dd'

// Chấp nhận gõ thiếu số 0 (`1/6/2026`), nhưng năm phải đủ 4 chữ số — tránh `1/6/2` thành năm 0002 khi đang gõ dở.
export const TYPED_DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}$/

// Chấp nhận `-` hoặc `–` làm dấu nối giữa hai ngày, khoảng trắng hai bên tuỳ ý.
export const DATE_RANGE_SEPARATOR_PATTERN = /\s*[-–]\s*/

// Dấu nối khi hiển thị khoảng ngày — khớp gợi ý `common.dateRangeFormatHint`.
export const DATE_RANGE_DISPLAY_SEPARATOR = ' - '
