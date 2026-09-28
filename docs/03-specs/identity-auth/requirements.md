---
title: Requirements — identity-auth
status: draft
owner: Backend Lead
updated: 2026-09-19
related: [docs/00-overview/feature-inventory.md, docs/01-architecture/service-catalog.md, docs/01-architecture/event-catalog.md, docs/01-architecture/security.md, docs/01-architecture/adr/ADR-0005-nextauth.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/02-domain/schemas/identity-service.prisma.md, docs/03-specs/identity-auth/design.md]
---

# Requirements — identity-auth (`IDN`)

Phạm vi: đăng ký, đăng nhập, phiên (access + refresh token), thiết bị, quên/đổi mật khẩu, SSO Google/Facebook,
xác minh email, khoá tài khoản, 2FA cho admin, và các quy ước phiên phía frontend (NextAuth, cookie, `callbackUrl`).
Sở hữu bởi module `identity` trong `backend/apps/api` (§ `docs/01-architecture/service-catalog.md`, đọc như bản đồ
module theo [ADR-0015](../../01-architecture/adr/ADR-0015-modular-monolith.md)), ngoại trừ FEAT-IDN-012/013/019 thuộc
module `platform`/`frontend` nhưng được đặc tả ở đây vì cùng một luồng nghiệp vụ xác thực.

Mẫu EARS dùng: Ubiquitous · Event-driven · State-driven · Optional · Unwanted (xem `.claude/skills/spec-domain/SKILL.md`).

---

## 1. Đăng ký tài khoản

### REQ-IDN-001 — Đăng ký bằng email + mật khẩu

**Nguồn:** `FEAT-IDN-001`
**Ưu tiên:** P0

KHI khách vãng lai gửi `email` + `password` hợp lệ tới đăng ký, HỆ THỐNG PHẢI băm mật khẩu bằng `bcrypt` (cost ≥ 12),
tạo `User` với `roles = [USER]`, `isEmailVerified = false`, tạo `Profile` rỗng, và phát `EVT-user.registered`
trong cùng transaction (outbox).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email chưa tồn tại, mật khẩu ≥ 8 ký tự có chữ và số | Gửi `POST /v1/auth/register` | Tạo `User` + `Profile`, trả `201`, phát `user.registered`, gửi mail xác minh |
| 2 | Mật khẩu nằm trong danh sách 10.000 mật khẩu phổ biến | Gửi đăng ký | Trả `422 WEAK_PASSWORD`, không tạo `User` |
| 3 | Đăng ký hợp lệ | Gửi lại đúng `POST /v1/auth/register` cùng `Idempotency-Key` trong 24 giờ | Trả lại cùng kết quả `201` đã tạo trước đó, không tạo `User` thứ hai |

### REQ-IDN-002 — Chặn đăng ký trùng danh tính (Unwanted)

**Nguồn:** `FEAT-IDN-001`
**Ưu tiên:** P0

NẾU `email` đã tồn tại trong phần schema module `identity` (kể cả tài khoản chỉ có `googleId`/`facebookId`, chưa có `passwordHash`),
THÌ HỆ THỐNG PHẢI từ chối tạo tài khoản mới với `409 EMAIL_ALREADY_REGISTERED` và **không** tiết lộ tài khoản đó
được tạo bằng phương thức nào.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email đã có `passwordHash` | Đăng ký lại cùng email | `409 EMAIL_ALREADY_REGISTERED` |
| 2 | Email đã có nhưng chỉ đăng nhập qua Google (chưa có mật khẩu) | Đăng ký lại cùng email bằng mật khẩu | `409 EMAIL_ALREADY_REGISTERED`, gợi ý "đặt mật khẩu" qua luồng quên mật khẩu — không tự tạo `passwordHash` ở đây |

---

## 2. Đăng nhập & phiên

### REQ-IDN-003 — Đăng nhập bằng email + mật khẩu

**Nguồn:** `FEAT-IDN-002`
**Ưu tiên:** P0

KHI người dùng gửi `email` + `password` đúng và tài khoản đang hoạt động, HỆ THỐNG PHẢI cấp một cặp access token
(JWT RS256, TTL 15 phút, không chứa `permissions[]`) và refresh token (chuỗi ngẫu nhiên 256 bit, TTL 30 ngày), gắn
với một `Device` (tạo mới nếu `deviceId`/`userAgent` chưa từng thấy), cập nhật `lastLoginAt`/`lastLoginIp`, và reset
`failedLoginCount` về 0.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email + mật khẩu đúng, tài khoản `isActive = true`, không bị khoá | `POST /v1/auth/login` | `200`, trả `{ user, roles, accessToken, refreshToken }`, ghi `Device` + `RefreshToken` |
| 2 | Đăng nhập từ thiết bị đã có `deviceId` | `POST /v1/auth/login` | Tái dùng `Device` hiện có, chỉ cập nhật `lastActiveAt` |
| 3 | Đăng nhập thành công sau khi từng đăng nhập sai | `POST /v1/auth/login` | `failedLoginCount` về `0` |

### REQ-IDN-004 — Từ chối đăng nhập sai / tài khoản bất thường (Unwanted)

**Nguồn:** `FEAT-IDN-002`, `FEAT-IDN-017`
**Ưu tiên:** P0

NẾU thông tin đăng nhập sai, tài khoản `isActive = false`, `isBanned = true`, hoặc `lockedUntil` còn trong tương lai,
THÌ HỆ THỐNG PHẢI từ chối với `401 INVALID_CREDENTIALS` cho mọi trường hợp sai thông tin (không phân biệt "email
không tồn tại" hay "sai mật khẩu" qua thời gian phản hồi hay nội dung lỗi), tăng `failedLoginCount` khi mật khẩu sai,
và trả `423 ACCOUNT_LOCKED` khi tài khoản đang bị khoá.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email không tồn tại | `POST /v1/auth/login` | `401 INVALID_CREDENTIALS`, vẫn chạy `bcrypt.compare` với hash giả để thời gian phản hồi không lệch |
| 2 | Email tồn tại, sai mật khẩu, `failedLoginCount` hiện tại `< 4` | `POST /v1/auth/login` | `401 INVALID_CREDENTIALS`, `failedLoginCount += 1` |
| 3 | `failedLoginCount` đạt `5` sau lần sai này | `POST /v1/auth/login` | Đặt `lockedUntil = now + 15 phút`, trả `423 ACCOUNT_LOCKED`, phát `user.locked` |
| 4 | `lockedUntil` còn hiệu lực | `POST /v1/auth/login` (kể cả đúng mật khẩu) | `423 ACCOUNT_LOCKED`, không tăng thêm `failedLoginCount` |
| 5 | Tài khoản `isBanned = true` | `POST /v1/auth/login` | `403 ACCOUNT_BANNED` |

---

## 3. Refresh token rotation

### REQ-IDN-005 — Xoay refresh token

**Nguồn:** `FEAT-IDN-003`
**Ưu tiên:** P0

KHI client gửi refresh token còn hợp lệ (`isRevoked = false`, chưa hết hạn, chưa từng bị thay thế) tới
`POST /v1/auth/refresh`, HỆ THỐNG PHẢI cấp access token mới + refresh token mới, đánh dấu token cũ
`replacedBy = <token mới>`, và giữ token cũ trong bảng 7 ngày để dò tái sử dụng trước khi coi là hết hạn lưu trữ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Refresh token `ACTIVE`, chưa hết hạn | `POST /v1/auth/refresh` | Trả cặp token mới, token cũ chuyển `ROTATED` (`replacedBy` trỏ token mới) |
| 2 | Hai request refresh **đồng thời** cùng một token `ACTIVE` | Cả hai `POST /v1/auth/refresh` gần như cùng lúc | Đúng một request thắng (cập nhật nguyên tử `UPDATE ... WHERE token = ? AND isRevoked = false AND replacedBy IS NULL`), request còn lại nhận state đã `ROTATED` → xử lý theo REQ-IDN-006 |

### REQ-IDN-006 — Phát hiện tái sử dụng refresh token (Unwanted)

**Nguồn:** `FEAT-IDN-003`
**Ưu tiên:** P0

NẾU refresh token gửi lên đã ở trạng thái `ROTATED` (đã từng được dùng để đổi lấy token khác) hoặc `REVOKED`, THÌ HỆ
THỐNG PHẢI từ chối với `401 REFRESH_TOKEN_REUSED`, thu hồi **toàn bộ** `RefreshToken` đang `ACTIVE` của `userId` đó
(mọi thiết bị), và gửi email cảnh báo đăng nhập bất thường.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Refresh token đã `ROTATED` (đã dùng một lần) | `POST /v1/auth/refresh` dùng lại token đó | `401 REFRESH_TOKEN_REUSED`, mọi `RefreshToken.isRevoked = true` của user, gửi mail cảnh báo |
| 2 | Refresh token đã hết hạn tự nhiên (`expiresAt < now`), chưa từng bị dùng lại | `POST /v1/auth/refresh` | `401 REFRESH_TOKEN_EXPIRED` — không kích hoạt thu hồi toàn bộ, chỉ yêu cầu đăng nhập lại |
| 3 | Refresh token không tồn tại trong DB (giả mạo) | `POST /v1/auth/refresh` | `401 REFRESH_TOKEN_INVALID`, ghi `AuditLog` mức cảnh báo |

---

## 4. Đăng xuất & thiết bị

### REQ-IDN-007 — Đăng xuất một thiết bị

**Nguồn:** `FEAT-IDN-004`
**Ưu tiên:** P0

KHI người dùng gọi `POST /v1/auth/logout` kèm refresh token hiện tại, HỆ THỐNG PHẢI đánh dấu đúng `RefreshToken` đó
`isRevoked = true`, `revokedAt = now`, và xoá cookie phiên NextAuth ở FE.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Refresh token thuộc chính người gọi, đang `ACTIVE` | `POST /v1/auth/logout` | Token đó `isRevoked = true`, các thiết bị khác không bị ảnh hưởng |

### REQ-IDN-008 — Đăng xuất tất cả thiết bị

**Nguồn:** `FEAT-IDN-004`
**Ưu tiên:** P0

KHI người dùng gọi `POST /v1/auth/logout-all`, HỆ THỐNG PHẢI thu hồi toàn bộ `RefreshToken` đang `ACTIVE` của
`userId` đó và đưa `sessionId` hiện tại vào Redis set `revoked:sessions` (TTL bằng TTL access token) để chặn access
token đang lưu hành ngay lập tức.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có 3 phiên đang hoạt động trên 3 thiết bị | `POST /v1/auth/logout-all` | Cả 3 `RefreshToken.isRevoked = true`, access token của cả 3 bị chặn trong ≤ 15 phút còn lại của TTL |

### REQ-IDN-009 — Xem danh sách thiết bị đã đăng nhập

**Nguồn:** `FEAT-IDN-005`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cho phép người dùng xem danh sách `Device` của chính mình (`userAgent`, `deviceName`, `ip`,
`lastActiveAt`, đánh dấu thiết bị hiện tại) qua `GET /v1/auth/devices`, lọc theo `userId` lấy từ token.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có 2 thiết bị đang hoạt động | `GET /v1/auth/devices` | Trả đúng 2 bản ghi, đánh dấu thiết bị đang gọi request |

### REQ-IDN-010 — Thu hồi một thiết bị (Unwanted khi ngoài phạm vi)

**Nguồn:** `FEAT-IDN-005`
**Ưu tiên:** P1

KHI người dùng gọi `DELETE /v1/auth/devices/:id`, HỆ THỐNG PHẢI thu hồi mọi `RefreshToken` gắn với `Device` đó và đặt
`Device.isActive = false`. NẾU `:id` không thuộc `userId` của người gọi (hoặc không tồn tại), THÌ HỆ THỐNG PHẢI trả
`404`, không phải `403` — tránh rò rỉ việc thiết bị đó có tồn tại hay không.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Device thuộc chính người gọi | `DELETE /v1/auth/devices/:id` | Device bị vô hiệu, refresh token liên quan bị thu hồi |
| 2 | Device thuộc người dùng khác | `DELETE /v1/auth/devices/:id` | `404 NOT_FOUND` |
| 3 | Admin thu hồi thiết bị của người dùng khác | `DELETE /v1/admin/users/:userId/devices/:id` với `identity:devices:revoke:any` | Thu hồi thành công, ghi `AuditLog` |

---

## 5. Quên mật khẩu & đặt lại mật khẩu

### REQ-IDN-011 — Yêu cầu quên mật khẩu

**Nguồn:** `FEAT-IDN-006`
**Ưu tiên:** P0

KHI người dùng gửi `email` tới `POST /v1/auth/forgot-password`, HỆ THỐNG PHẢI tạo `PasswordResetToken` (giá trị đã
hash trong DB, TTL 15 phút theo FEAT-IDN-006), gửi email chứa token dạng chưa hash qua liên kết một lần, và luôn trả
`202` bất kể email có tồn tại hay không.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email tồn tại | `POST /v1/auth/forgot-password` | Tạo `PasswordResetToken`, gửi mail, trả `202` |
| 2 | Email không tồn tại | `POST /v1/auth/forgot-password` | Không tạo token, không gửi mail, vẫn trả `202` (chống dò email) |

### REQ-IDN-012 — Chặn lạm dụng yêu cầu quên mật khẩu (Unwanted)

**Nguồn:** `FEAT-IDN-006`
**Ưu tiên:** P1

NẾU cùng một `email` hoặc cùng một IP gửi quá 5 yêu cầu `forgot-password` trong 1 giờ, THÌ HỆ THỐNG PHẢI trả
`429 TOO_MANY_REQUESTS` và không tạo thêm `PasswordResetToken` mới.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đã gửi 5 yêu cầu trong giờ qua cho cùng email | Gửi yêu cầu thứ 6 | `429 TOO_MANY_REQUESTS`, không tạo token |

### REQ-IDN-013 — Đặt lại mật khẩu bằng token

**Nguồn:** `FEAT-IDN-007`
**Ưu tiên:** P0

KHI người dùng gửi token + mật khẩu mới hợp lệ tới `POST /v1/auth/reset-password`, HỆ THỐNG PHẢI cập nhật
`passwordHash` mới, đánh dấu `PasswordResetToken.used = true`, thu hồi **toàn bộ** `RefreshToken` đang `ACTIVE` của
user (vô hiệu mọi phiên cũ), và phát sự kiện nội bộ để gửi email xác nhận đổi mật khẩu.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Token hợp lệ, chưa hết hạn, chưa dùng, mật khẩu mới đạt chuẩn | `POST /v1/auth/reset-password` | Đổi mật khẩu, thu hồi mọi `RefreshToken`, trả `200`, gửi mail xác nhận |
| 2 | Mật khẩu mới trùng 1 trong 3 mật khẩu gần nhất | `POST /v1/auth/reset-password` | `422 PASSWORD_REUSED`, không đổi mật khẩu |

### REQ-IDN-014 — Từ chối token đặt lại mật khẩu không hợp lệ (Unwanted)

**Nguồn:** `FEAT-IDN-007`
**Ưu tiên:** P0

NẾU token đặt lại mật khẩu không tồn tại, đã hết hạn (> 15 phút), hoặc đã `used = true`, THÌ HỆ THỐNG PHẢI từ chối
với `400 RESET_TOKEN_INVALID` và không đổi mật khẩu.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Token đã dùng trước đó | `POST /v1/auth/reset-password` dùng lại | `400 RESET_TOKEN_INVALID` |
| 2 | Token hết hạn | `POST /v1/auth/reset-password` | `400 RESET_TOKEN_INVALID` |

---

## 6. Đổi mật khẩu khi đã đăng nhập

### REQ-IDN-015 — Đổi mật khẩu

**Nguồn:** `FEAT-IDN-008`
**Ưu tiên:** P0

KHI người dùng đã đăng nhập gửi mật khẩu hiện tại + mật khẩu mới tới `PATCH /v1/auth/password`, HỆ THỐNG PHẢI xác
minh mật khẩu hiện tại đúng, cập nhật `passwordHash`, và thu hồi mọi `RefreshToken` **khác** phiên hiện tại (giữ
phiên đang thao tác còn sống).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Mật khẩu hiện tại đúng, mật khẩu mới hợp lệ, không trùng 3 mật khẩu gần nhất | `PATCH /v1/auth/password` | Đổi mật khẩu, thu hồi mọi phiên khác, phiên hiện tại còn hiệu lực |

### REQ-IDN-016 — Từ chối đổi mật khẩu sai (Unwanted)

**Nguồn:** `FEAT-IDN-008`
**Ưu tiên:** P0

NẾU mật khẩu hiện tại gửi lên không khớp `passwordHash` đang lưu, THÌ HỆ THỐNG PHẢI từ chối với
`401 CURRENT_PASSWORD_INVALID` và không thay đổi bất kỳ trạng thái phiên nào.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Mật khẩu hiện tại sai | `PATCH /v1/auth/password` | `401 CURRENT_PASSWORD_INVALID`, không đổi `passwordHash`, không thu hồi token nào |
| 2 | Tài khoản chỉ đăng nhập qua SSO, chưa có `passwordHash` | `PATCH /v1/auth/password` | `409 NO_PASSWORD_SET` — hướng dẫn dùng luồng "đặt mật khẩu" (như quên mật khẩu) thay vì đổi |

---

## 7. SSO Google / Facebook

### REQ-IDN-017 — Đăng nhập/đăng ký qua SSO Google

**Nguồn:** `FEAT-IDN-009`
**Ưu tiên:** P1

KHI NextAuth hoàn tất OAuth2 + PKCE với Google và gửi hồ sơ đã xác minh tới `POST /v1/auth/sso`, HỆ THỐNG PHẢI: tìm
`User` theo `googleId`; nếu chưa có và `email` đã tồn tại với `isEmailVerified = true` thì liên kết `googleId` vào
`User` đó; nếu chưa có tài khoản nào khớp thì tạo `User` mới với `roles = [USER]`, `isEmailVerified` theo Google,
không có `passwordHash`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Chưa từng đăng nhập Google, email hoàn toàn mới | `POST /v1/auth/sso` (provider Google) | Tạo `User` mới, `googleId` gán, phát `user.registered` |
| 2 | `googleId` đã gắn với `User` | `POST /v1/auth/sso` | Đăng nhập vào `User` đó như luồng đăng nhập thường, cấp token |
| 3 | Email trùng tài khoản email/password đã có, `isEmailVerified = true` | `POST /v1/auth/sso` | Tự liên kết `googleId` vào `User` hiện có, không tạo user trùng |

### REQ-IDN-018 — Chặn tự liên kết SSO khi email chưa xác minh (Unwanted)

**Nguồn:** `FEAT-IDN-009`, `FEAT-IDN-010`
**Ưu tiên:** P1

NẾU email trả về từ provider SSO trùng một `User` đã tồn tại nhưng `isEmailVerified = false`, THÌ HỆ THỐNG PHẢI
**không** tự liên kết tài khoản, trả `409 EMAIL_NOT_VERIFIED_FOR_LINK`, và yêu cầu người dùng đăng nhập bằng mật
khẩu rồi liên kết SSO thủ công (REQ-IDN-020) — ngăn chiếm tài khoản bằng email giả mạo chưa xác minh.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Email SSO trùng user hiện có, `isEmailVerified = false` | `POST /v1/auth/sso` | `409 EMAIL_NOT_VERIFIED_FOR_LINK`, không tạo, không liên kết |

### REQ-IDN-019 — Đăng nhập/đăng ký qua SSO Facebook

**Nguồn:** `FEAT-IDN-010`
**Ưu tiên:** P1

HỆ THỐNG PHẢI áp dụng đúng quy tắc ở REQ-IDN-017 và REQ-IDN-018 cho provider Facebook, dùng `facebookId` thay
`googleId`, qua cùng endpoint `POST /v1/auth/sso` với `provider = 'facebook'`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Chưa từng đăng nhập Facebook, email hoàn toàn mới | `POST /v1/auth/sso` (provider Facebook) | Tạo `User` mới, `facebookId` gán |
| 2 | Email trùng tài khoản có sẵn, chưa xác minh | `POST /v1/auth/sso` (provider Facebook) | `409 EMAIL_NOT_VERIFIED_FOR_LINK` (như REQ-IDN-018) |

---

## 8. Liên kết / gỡ liên kết SSO

### REQ-IDN-020 — Liên kết tài khoản SSO thủ công

**Nguồn:** `FEAT-IDN-011`
**Ưu tiên:** P2

KHI người dùng đã đăng nhập gọi `POST /v1/auth/sso/link` với `provider` + `providerToken` hợp lệ, HỆ THỐNG PHẢI xác
minh `providerToken` với Google/Facebook, kiểm tra `googleId`/`facebookId` đó chưa gắn với `User` khác, rồi gán vào
`User` hiện tại.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `providerToken` hợp lệ, `googleId` chưa gắn ai | `POST /v1/auth/sso/link` | Gán `googleId` vào user hiện tại, trả `200` |

### REQ-IDN-021 — Gỡ liên kết SSO (Unwanted khi mất hết phương thức đăng nhập)

**Nguồn:** `FEAT-IDN-011`
**Ưu tiên:** P2

KHI người dùng gọi `DELETE /v1/auth/sso/:provider`, HỆ THỐNG PHẢI xoá `googleId`/`facebookId` tương ứng khỏi `User`.
NẾU sau khi gỡ, `User` không còn bất kỳ phương thức đăng nhập nào (`passwordHash IS NULL` và không còn provider SSO
nào khác), THÌ HỆ THỐNG PHẢI từ chối với `409 LAST_AUTH_METHOD` để tránh khoá người dùng khỏi tài khoản của chính họ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có cả `passwordHash` và `googleId` | `DELETE /v1/auth/sso/google` | Gỡ `googleId`, `passwordHash` vẫn còn — thành công |
| 2 | User chỉ có `googleId`, không có mật khẩu, không có provider khác | `DELETE /v1/auth/sso/google` | `409 LAST_AUTH_METHOD`, không gỡ |

---

## 9. Cookie, phiên NextAuth và điều hướng

### REQ-IDN-022 — Cookie HttpOnly theo môi trường

**Nguồn:** `FEAT-IDN-012`
**Ưu tiên:** P0

HỆ THỐNG PHẢI phát hành cookie phiên `authjs.session-token` (production: `__Secure-authjs.session-token`) và
cookie CSRF của NextAuth `authjs.csrf-token` (production: `__Host-authjs.csrf-token`) với `HttpOnly`, `SameSite=Lax`,
`Path=/`, và `Secure` (bật ở staging/production, bỏ khi dev qua `http://localhost` không TLS).

Access token **và** refresh token của backend nằm **bên trong payload JWT đã mã hoá JWE** của cookie phiên — không
phát hành cookie riêng cho refresh token, và không token nào sống ở `localStorage`/`sessionStorage`/cookie thường.
Chi tiết cấu hình, callback và luồng refresh: `docs/04-frontend/auth-nextauth.md`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Môi trường production | Đăng nhập thành công | Cookie có `Secure`, không đọc được bằng `document.cookie` |
| 2 | Môi trường local dev qua `http://localhost` | Đăng nhập thành công | Cookie vẫn `HttpOnly`, cho phép bỏ `Secure` để chạy không TLS |
| 3 | Người dùng đã đăng nhập | Đọc `document.cookie`, `localStorage`, `sessionStorage` | Không thấy access token hay refresh token ở bất kỳ đâu |

### REQ-IDN-023 — Phiên NextAuth không lộ role/permission cho client

**Nguồn:** `FEAT-IDN-013`
**Ưu tiên:** P0

HỆ THỐNG PHẢI mã hoá session NextAuth dạng JWE bằng `AUTH_SECRET`, chỉ giải mã được ở server-side (route handler,
middleware chạy edge runtime của Next.js). Client-side JavaScript **không** được có cách đọc `roles[]`/`permissions[]`
qua cookie hay biến toàn cục.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người dùng đã đăng nhập với role `SELLER` | Mở DevTools, đọc `document.cookie` và biến JS toàn cục | Không tìm thấy `roles`/`permissions` dạng đọc được |
| 2 | Middleware cần biết role để chặn route `/seller/*` | Request tới route đó | `auth()` của NextAuth giải mã session ở edge, không tự parse cookie bằng tay |

### REQ-IDN-024 — Dọn refresh token hết hạn theo lịch

**Nguồn:** `FEAT-IDN-014`
**Ưu tiên:** P1

TRONG KHI job BullMQ cron chạy mỗi giờ, HỆ THỐNG PHẢI xoá vĩnh viễn các `RefreshToken` có `expiresAt < now - 7 ngày`
(bản ghi `ROTATED`/`REVOKED` hết hạn lưu trữ theo state machem ở `security.md`), không xoá token còn trong cửa sổ dò
tái sử dụng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Có `RefreshToken` `ROTATED` từ 8 ngày trước | Job cron chạy | Bản ghi bị xoá |
| 2 | Có `RefreshToken` `ROTATED` từ 2 ngày trước (còn trong cửa sổ 7 ngày) | Job cron chạy | Bản ghi được giữ lại |

### REQ-IDN-025 — Thống kê token/phiên đang hoạt động cho admin

**Nguồn:** `FEAT-IDN-015`
**Ưu tiên:** P2

HỆ THỐNG PHẢI cho phép người có `identity:sessions:stats` xem tổng số `RefreshToken` đang `ACTIVE`, số thiết bị đang
hoạt động, phân bố theo khoảng thời gian, qua `GET /v1/admin/auth/sessions/stats`. Đây là dữ liệu tổng hợp toàn hệ
thống — không lọc theo phạm vi chủ sở hữu vì bản thân nó không gắn với một user cụ thể.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người gọi có `identity:sessions:stats` | `GET /v1/admin/auth/sessions/stats` | Trả số liệu tổng hợp |
| 2 | Người gọi không có permission này | `GET /v1/admin/auth/sessions/stats` | `403 FORBIDDEN` (đây là tài nguyên tổng hợp, không phải bản ghi có chủ sở hữu, nên dùng `403` chứ không phải `404`) |

---

## 10. Xác minh email

### REQ-IDN-026 — Xác minh email sau đăng ký

**Nguồn:** `FEAT-IDN-016`
**Ưu tiên:** P1

KHI người dùng nhấn liên kết xác minh chứa token hợp lệ (`GET /v1/auth/verify-email?token=...`), HỆ THỐNG PHẢI đặt
`isEmailVerified = true` và phát `EVT-user.email-verified`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Token xác minh còn hạn (24 giờ), chưa dùng | `GET /v1/auth/verify-email` | `isEmailVerified = true`, phát `user.email-verified`, trả `200` |
| 2 | Người dùng yêu cầu gửi lại mail xác minh khi chưa xác minh | `POST /v1/auth/verify-email/resend` | Sinh token xác minh mới, vô hiệu token xác minh cũ, gửi mail |

### REQ-IDN-027 — Từ chối token xác minh email không hợp lệ (Unwanted)

**Nguồn:** `FEAT-IDN-016`
**Ưu tiên:** P1

NẾU token xác minh email không tồn tại, đã hết hạn (> 24 giờ), hoặc đã dùng, THÌ HỆ THỐNG PHẢI trả
`400 VERIFY_TOKEN_INVALID` và giữ nguyên `isEmailVerified`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Token hết hạn | `GET /v1/auth/verify-email?token=...` | `400 VERIFY_TOKEN_INVALID`, `isEmailVerified` không đổi |

---

## 11. Khoá tài khoản

### REQ-IDN-028 — Khoá tài khoản sau N lần đăng nhập sai

Đã đặc tả cùng REQ-IDN-004 (kịch bản 3–4). Tham chiếu tại đây để đảm bảo `FEAT-IDN-017` có REQ tường minh.

**Nguồn:** `FEAT-IDN-017`
**Ưu tiên:** P1

KHI `failedLoginCount` của một `User` đạt ngưỡng 5 lần sai liên tiếp, HỆ THỐNG PHẢI đặt `lockedUntil = now + 15
phút` và phát `EVT-user.locked`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `failedLoginCount = 4`, đăng nhập sai lần nữa | Lưu thất bại | `failedLoginCount = 5`, `lockedUntil` đặt, phát `user.locked` |

### REQ-IDN-029 — Tự mở khoá theo thời gian (State-driven)

**Nguồn:** `FEAT-IDN-017`
**Ưu tiên:** P1

TRONG KHI `lockedUntil` đã ở quá khứ (thời hạn khoá đã hết), HỆ THỐNG PHẢI cho phép đăng nhập lại bình thường mà
**không** cần thao tác mở khoá thủ công của admin, và reset `failedLoginCount` về 0 ngay khi đăng nhập thành công
lần kế tiếp.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `lockedUntil` đã qua, mật khẩu đúng | `POST /v1/auth/login` | Đăng nhập thành công, `failedLoginCount` về `0`, `lockedUntil` về `null` |
| 2 | Admin muốn mở khoá sớm hơn | `PATCH /v1/admin/users/:id/lock` với `identity:users:lock`, `locked = false` | `lockedUntil = null` ngay lập tức, ghi `AuditLog` |

---

## 12. 2FA cho admin

### REQ-IDN-030 — Bật 2FA (TOTP) cho ADMIN / SUPER_ADMIN (Optional)

**Nguồn:** `FEAT-IDN-018`
**Ưu tiên:** P2

NƠI CÓ tài khoản mang role `ADMIN` hoặc `SUPER_ADMIN` bật 2FA (`POST /v1/auth/2fa/enable`), HỆ THỐNG PHẢI sinh
`twoFactorSecret` (mã hoá khi lưu), trả QR code, và chỉ đặt `twoFactorEnabled = true` sau khi người dùng xác nhận
đúng mã TOTP đầu tiên (`POST /v1/auth/2fa/confirm`).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin bật 2FA, nhập đúng mã TOTP xác nhận | `POST /v1/auth/2fa/confirm` | `twoFactorEnabled = true` |
| 2 | Đăng nhập với tài khoản `twoFactorEnabled = true` | `POST /v1/auth/login` đúng mật khẩu | Trả `202 TWO_FACTOR_REQUIRED` kèm `challengeId` tạm thời, **chưa** cấp token |

### REQ-IDN-031 — Từ chối mã TOTP sai (Unwanted)

**Nguồn:** `FEAT-IDN-018`
**Ưu tiên:** P2

NẾU mã TOTP gửi kèm `challengeId` không khớp `twoFactorSecret` hoặc `challengeId` đã hết hạn (5 phút), THÌ HỆ THỐNG
PHẢI từ chối với `401 TWO_FACTOR_INVALID`, giới hạn tối đa 5 lần thử mỗi `challengeId`, quá số lần buộc đăng nhập
lại từ đầu.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Mã TOTP sai | `POST /v1/auth/2fa/verify` | `401 TWO_FACTOR_INVALID`, không cấp token |
| 2 | Sai 5 lần liên tiếp cho cùng `challengeId` | Lần thử thứ 6 | `challengeId` bị huỷ, yêu cầu `POST /v1/auth/login` lại |

---

## 13. `callbackUrl` thống nhất

### REQ-IDN-032 — Chuẩn hoá tham số `callbackUrl`

**Nguồn:** `FEAT-IDN-019`
**Ưu tiên:** P0

HỆ THỐNG PHẢI dùng thống nhất tên tham số `?callbackUrl` (theo quy ước NextAuth) ở mọi nơi điều hướng sau đăng
nhập/đăng ký/SSO trên toàn bộ frontend và backend; **không** còn nơi nào sinh hoặc đọc `?redirect`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người dùng chưa đăng nhập truy cập `/vi/seller/products` | Middleware chuyển hướng | Điều hướng tới `/vi/login?callbackUrl=%2Fvi%2Fseller%2Fproducts` |
| 2 | Đăng nhập thành công | NextAuth xử lý xong | Điều hướng đúng theo giá trị `callbackUrl` đã nhận, không rơi về trang mặc định sai như bản cũ |

### REQ-IDN-033 — Chặn `callbackUrl` mở chuyển hướng ngoài (Unwanted)

**Nguồn:** `FEAT-IDN-019`
**Ưu tiên:** P0

NẾU giá trị `callbackUrl` là một URL tuyệt đối trỏ ra ngoài danh sách host được phép (open redirect), THÌ HỆ THỐNG
PHẢI bỏ qua giá trị đó và điều hướng về trang mặc định an toàn (`/`), theo đúng quy tắc ở
`docs/01-architecture/security.md#8-đầu-vào-và-đầu-ra`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `callbackUrl=https://evil.example.com` | Đăng nhập thành công | Điều hướng về `/`, bỏ qua giá trị độc hại |
| 2 | `callbackUrl=/vi/seller/products` (đường dẫn tương đối) | Đăng nhập thành công | Điều hướng đúng tới đường dẫn đó |

---

## 14. Bảng phủ FEAT-IDN-*

| FEAT | REQ |
|---|---|
| FEAT-IDN-001 | REQ-IDN-001, REQ-IDN-002 |
| FEAT-IDN-002 | REQ-IDN-003, REQ-IDN-004 |
| FEAT-IDN-003 | REQ-IDN-005, REQ-IDN-006 |
| FEAT-IDN-004 | REQ-IDN-007, REQ-IDN-008 |
| FEAT-IDN-005 | REQ-IDN-009, REQ-IDN-010 |
| FEAT-IDN-006 | REQ-IDN-011, REQ-IDN-012 |
| FEAT-IDN-007 | REQ-IDN-013, REQ-IDN-014 |
| FEAT-IDN-008 | REQ-IDN-015, REQ-IDN-016 |
| FEAT-IDN-009 | REQ-IDN-017, REQ-IDN-018 |
| FEAT-IDN-010 | REQ-IDN-019, REQ-IDN-018 |
| FEAT-IDN-011 | REQ-IDN-020, REQ-IDN-021 |
| FEAT-IDN-012 | REQ-IDN-022 |
| FEAT-IDN-013 | REQ-IDN-023 |
| FEAT-IDN-014 | REQ-IDN-024 |
| FEAT-IDN-015 | REQ-IDN-025 |
| FEAT-IDN-016 | REQ-IDN-026, REQ-IDN-027 |
| FEAT-IDN-017 | REQ-IDN-028, REQ-IDN-029 |
| FEAT-IDN-018 | REQ-IDN-030, REQ-IDN-031 |
| FEAT-IDN-019 | REQ-IDN-032, REQ-IDN-033 |
