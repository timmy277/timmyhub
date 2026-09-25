// Cost bcrypt dùng chung cho AuthService (@timmyhub/modules) và seed người dùng mẫu (@timmyhub/prisma).
// Đặt ở contracts vì đây là package duy nhất cả hai cùng phụ thuộc mà không tạo vòng: @timmyhub/modules phụ thuộc
// @timmyhub/prisma, nên seed không import ngược từ modules được; @timmyhub/prisma cũng không phụ thuộc @timmyhub/common.
// Lệch hai giá trị không làm hỏng đăng nhập (bcrypt lưu cost trong hash) nhưng làm thời gian so sánh lệch nhau,
// phá tính ổn định thời gian phản hồi ở security.md §4.
export const BCRYPT_COST = 12
