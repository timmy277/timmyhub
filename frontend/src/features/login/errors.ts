// Lỗi đăng nhập phía FE: mang MÃ lỗi mà NextAuth (`signIn` → `result.code`) hoặc backend trả về, để form
// dịch thành thông điệp (catalog `api` cho mã của BE, catalog `login` cho mã chỉ có ở FE). Không mang chi
// tiết nào khác — mã có thể đi vào URL callback của NextAuth.
export class LoginError extends Error {
    // ===== Properties =====
    readonly code: string

    constructor(code: string) {
        super(code)
        this.name = 'LoginError'
        this.code = code
    }
}
