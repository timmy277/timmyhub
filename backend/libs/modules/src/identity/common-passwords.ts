// Danh sách rút gọn theo REQ-IDN-001 kịch bản 2 (chặn mật khẩu phổ biến). Đây KHÔNG phải danh sách
// đầy đủ 10.000 mật khẩu — cần nạp bộ dữ liệu thật (ví dụ SecLists) trước khi lên production.
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
    'password',
    'password1',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty123',
    'abc12345',
    'letmein1',
    'welcome1',
    'admin123',
    'iloveyou1',
    '11111111',
    'password123',
])

export function isCommonPassword(plain: string): boolean {
    return COMMON_PASSWORDS.has(plain.toLowerCase())
}
