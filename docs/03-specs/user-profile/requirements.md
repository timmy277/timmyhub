---
title: Requirements — user-profile
status: draft
owner: Backend Lead
updated: 2026-09-19
related:
    - docs/00-overview/feature-inventory.md
    - docs/01-architecture/service-catalog.md
    - docs/01-architecture/event-catalog.md
    - docs/02-domain/schemas/identity-service.prisma.md
    - docs/02-domain/schemas/order-service.prisma.md
    - docs/03-specs/user-profile/design.md
    - docs/03-specs/user-profile/tasks.md
    - docs/01-architecture/adr/ADR-0015-modular-monolith.md
---

# Requirements — `user-profile`

Domain hồ sơ người dùng: xem/sửa hồ sơ cá nhân, sổ địa chỉ giao hàng, trang quản lý tài khoản phía admin,
khoá/mở khoá tài khoản, đổi mật khẩu, xoá tài khoản, xuất dữ liệu cá nhân, theo dõi shop. Dữ liệu `User`/`Profile`
thuộc `identity-service` (phần schema module `identity`); sổ địa chỉ (`Address`) thuộc `order-service` (phần schema
module `order`) — xem lý do ở
[design.md §1](design.md#1-mô-hình-dữ-liệu). Hai `FEAT-*` trong domain này (`FEAT-USR-006`, một phần `FEAT-USR-007`)
là màn hình lối vào cho nghiệp vụ do domain khác sở hữu — chỉ đặc tả phần lối vào, không lặp lại toàn bộ nghiệp vụ.

Mọi `REQ-USR-*` dưới đây truy vết về `FEAT-USR-<nnn>` trong
[feature-inventory.md §3](../../00-overview/feature-inventory.md#3-user-profile--hồ-sơ-người-dùng).

## 1. Xem và cập nhật hồ sơ cá nhân (`FEAT-USR-001`)

### REQ-USR-001 — Xem hồ sơ cá nhân

**Nguồn:** `FEAT-USR-001`
**Ưu tiên:** P0

KHI người dùng đã đăng nhập mở trang hồ sơ, HỆ THỐNG PHẢI trả về `firstName`, `lastName`, `displayName`, `avatar`,
`dateOfBirth`, `gender`, `bio`, `email`, `phone` của chính tài khoản đang đăng nhập.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User đã xác thực, đã có `Profile` | Gọi `GET /api/users/me/profile` | Trả `200` kèm đủ field, `email`/`phone` lấy từ `User` |
| 2 | User đã xác thực, chưa từng tạo `Profile` (tài khoản SSO mới) | Gọi `GET /api/users/me/profile` | Trả `200`, các field `Profile` là `null`/rỗng, không lỗi `404` |
| 3 | Chưa đăng nhập | Gọi `GET /api/users/me/profile` | Trả `401` |

### REQ-USR-002 — Cập nhật hồ sơ cá nhân

**Nguồn:** `FEAT-USR-001`
**Ưu tiên:** P0

KHI người dùng gửi cập nhật hợp lệ cho hồ sơ của chính mình, HỆ THỐNG PHẢI ghi vào `Profile` (và `phone` trên `User`
nếu có đổi số điện thoại), tăng `version`, và phát `EVT-user.profile-updated`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User sửa `displayName`, `avatar`, `dateOfBirth`, `gender`, `bio` | `PATCH /api/users/me/profile` với dữ liệu hợp lệ | `200`, `Profile.updatedAt` đổi, phát `EVT-user.profile-updated` với `displayName`/`avatarUrl` mới |
| 2 | User đổi `phone` sang số chưa ai dùng | `PATCH /api/users/me/profile` kèm `phone` mới | `200`, `User.phone` cập nhật, `User.isPhoneVerified` reset về `false` |
| 3 | User không gửi field nào đổi so với hiện tại | `PATCH /api/users/me/profile` với dữ liệu giống hệt | `200`, không tăng `version`, không phát event (idempotent theo nội dung) |

### REQ-USR-003 — Từ chối cập nhật hồ sơ không hợp lệ

**Nguồn:** `FEAT-USR-001`
**Ưu tiên:** P0

NẾU dữ liệu cập nhật hồ sơ vi phạm ràng buộc (`dateOfBirth` ở tương lai hoặc làm tuổi < 13, `phone` đã thuộc `User`
khác, `firstName`/`lastName` rỗng), THÌ HỆ THỐNG PHẢI từ chối toàn bộ thao tác, trả lỗi theo field, không ghi
một phần.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `dateOfBirth` gửi lên là ngày trong tương lai | `PATCH /api/users/me/profile` | `422`, lỗi field `dateOfBirth`, không ghi DB |
| 2 | `phone` gửi lên đã `@unique` ở `User` khác | `PATCH /api/users/me/profile` | `409`, lỗi field `phone`, `User.phone` giữ nguyên |
| 3 | `firstName` gửi chuỗi rỗng | `PATCH /api/users/me/profile` | `422`, lỗi field `firstName`, không ghi DB |

## 2. Sổ địa chỉ (`FEAT-USR-002`)

### REQ-USR-004 — Thêm địa chỉ mới

**Nguồn:** `FEAT-USR-002`
**Ưu tiên:** P0

KHI người dùng thêm địa chỉ hợp lệ, HỆ THỐNG PHẢI tạo bản ghi `Address` gắn `userId` của chính người gọi; nếu đây
là địa chỉ đầu tiên của user, HỆ THỐNG PHẢI tự đặt `isDefault = true`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User chưa có địa chỉ nào | `POST /api/addresses` hợp lệ, kèm `Idempotency-Key` | `201`, `Address.isDefault = true` |
| 2 | User đã có ≥ 1 địa chỉ | `POST /api/addresses` hợp lệ, không truyền `isDefault` | `201`, `Address.isDefault = false`, địa chỉ mặc định cũ giữ nguyên |
| 3 | Gọi lại `POST /api/addresses` với cùng `Idempotency-Key` | Gửi lần 2 trong cửa sổ idempotency | Trả lại đúng kết quả lần 1, không tạo bản ghi trùng |

### REQ-USR-005 — Sửa và xoá địa chỉ

**Nguồn:** `FEAT-USR-002`
**Ưu tiên:** P0

KHI người dùng sửa hoặc xoá một địa chỉ thuộc sở hữu của chính mình, HỆ THỐNG PHẢI áp dụng thay đổi; nếu địa chỉ bị
xoá đang là mặc định và người dùng còn địa chỉ khác, HỆ THỐNG PHẢI tự động đặt địa chỉ còn lại mới nhất làm mặc định.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Địa chỉ thuộc user, không phải mặc định | `PATCH /api/addresses/:id` hợp lệ | `200`, các field đổi theo yêu cầu |
| 2 | Địa chỉ là mặc định, user còn ≥ 1 địa chỉ khác | `DELETE /api/addresses/:id` | `204`, địa chỉ tạo gần nhất còn lại trở thành `isDefault = true` |
| 3 | Địa chỉ là mặc định và là địa chỉ duy nhất | `DELETE /api/addresses/:id` | `204`, user còn `0` địa chỉ, không có mặc định |

### REQ-USR-006 — Đặt địa chỉ mặc định

**Nguồn:** `FEAT-USR-002`
**Ưu tiên:** P0

KHI người dùng đặt một địa chỉ làm mặc định, HỆ THỐNG PHẢI đảm bảo tại mọi thời điểm **đúng một** địa chỉ của user
có `isDefault = true` — xem luồng nguyên tử ở [design.md §4](design.md#4-sequence-diagram--đặt-địa-chỉ-mặc-định).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Địa chỉ A đang mặc định, đặt địa chỉ B làm mặc định | `POST /api/addresses/:id/default` với `id` của B | `200`, B là mặc định, A không còn là mặc định |
| 2 | Hai request đặt mặc định cho hai địa chỉ khác nhau gửi gần như đồng thời | Race condition ở tầng DB | Request thắng transaction sau cùng quyết định, kết quả cuối luôn đúng một mặc định (không có hai mặc định) |

### REQ-USR-007 — Từ chối thao tác địa chỉ ngoài phạm vi hoặc không hợp lệ

**Nguồn:** `FEAT-USR-002`
**Ưu tiên:** P0

NẾU người dùng thao tác lên một `Address` không thuộc sở hữu của chính mình, THÌ HỆ THỐNG PHẢI trả `404` (không phải
`403`, theo `CLAUDE.md` luật #8 — tránh rò rỉ sự tồn tại của tài nguyên).

| # | Given | When | Then |
|---|---|---|---|
| 1 | `Address` thuộc user khác | `PATCH /api/addresses/:id`, `DELETE /api/addresses/:id`, hoặc đặt mặc định bởi user A với `id` thuộc user B | `404` |
| 2 | `Address` không tồn tại | Bất kỳ thao tác nào lên `:id` không có thật | `404` |
| 3 | `Address` đang được ≥ 1 `Order` chưa `COMPLETED`/`CANCELLED` tham chiếu | `DELETE /api/addresses/:id` | `409`, không xoá, thông báo còn đơn hàng đang dùng địa chỉ này |

## 3. Chọn địa chỉ theo tỉnh/huyện/xã (`FEAT-USR-003`)

### REQ-USR-008 — Lấy danh mục hành chính khi nhập địa chỉ

**Nguồn:** `FEAT-USR-003`
**Ưu tiên:** P0

KHI người dùng mở form thêm/sửa địa chỉ, HỆ THỐNG PHẢI lấy danh sách tỉnh/huyện/xã từ module `master-data` bằng cách
gọi trực tiếp qua NestJS DI (`MasterDataService.getProvinces()` / `getDistricts()` / `getWards()`, cùng process,
không qua network), huyện/xã lọc theo tỉnh/huyện đã chọn trước đó.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Form địa chỉ mở lần đầu | Không có `provinceCode` được chọn | Trả danh sách tỉnh, danh sách huyện/xã rỗng |
| 2 | User chọn một tỉnh | Đổi `provinceCode` | Trả danh sách huyện thuộc đúng tỉnh đó |
| 3 | User chọn một huyện | Đổi `districtCode` | Trả danh sách xã thuộc đúng huyện đó |

### REQ-USR-009 — Từ chối địa chỉ sai phân cấp hành chính

**Nguồn:** `FEAT-USR-003`
**Ưu tiên:** P0

NẾU `provinceCode`/`districtCode`/`wardCode` gửi lên không tồn tại ở module `master-data` hoặc không đúng quan hệ
phân cấp (`districtCode` không thuộc `provinceCode`, `wardCode` không thuộc `districtCode`), THÌ HỆ THỐNG PHẢI từ
chối lưu địa chỉ, trả lỗi theo field, không tự "đoán" hoặc tự sửa.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `wardCode` hợp lệ nhưng thuộc huyện khác `districtCode` gửi lên | `POST`/`PATCH /api/addresses` | `422`, lỗi field `wardCode` |
| 2 | `provinceCode` không tồn tại trong module `master-data` | `POST`/`PATCH /api/addresses` | `422`, lỗi field `provinceCode` |
| 3 | Lời gọi `MasterDataService` (DI, trong process) lỗi hoặc vượt quá timeout nội bộ đã cấu hình cho lời gọi liên module (ví dụ dữ liệu chưa sẵn sàng, lỗi truy vấn) | `POST`/`PATCH /api/addresses` | `503`, không lưu bản ghi một phần, client được yêu cầu thử lại |

## 4. Quản lý tài khoản phía admin (`FEAT-USR-004`, `FEAT-USR-005`)

### REQ-USR-010 — Admin xem và tìm kiếm danh sách tài khoản

**Nguồn:** `FEAT-USR-004`
**Ưu tiên:** P1

KHI admin có quyền mở trang quản lý tài khoản, HỆ THỐNG PHẢI trả danh sách `User` có phân trang, lọc theo `email`,
`phone`, `roles`, `isActive`, `isBanned`, không trả `passwordHash`/`twoFactorSecret`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin có `identity:users:read:any` | `GET /api/admin/users?query=...` | `200`, danh sách phân trang, không lộ field nhạy cảm |
| 2 | User thường (không có permission) | `GET /api/admin/users` | `403` |

### REQ-USR-011 — Admin sửa thông tin và vai trò tài khoản

**Nguồn:** `FEAT-USR-004`
**Ưu tiên:** P1

KHI admin có quyền cập nhật một tài khoản (đổi `roles`, sửa `Profile` thay người dùng để hỗ trợ), HỆ THỐNG PHẢI ghi
thay đổi, gắn `@AuditAction`, và nếu `roles` đổi thì phát `EVT-user.role-granted`/`EVT-user.role-revoked`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin có `identity:users:update:any`, thêm role `SELLER` cho user | `PATCH /api/admin/users/:id` | `200`, `User.roles` cập nhật, phát `EVT-user.role-granted`, ghi `AuditLog` |
| 2 | Admin gỡ role cuối cùng khỏi `User` khiến `roles` rỗng | `PATCH /api/admin/users/:id` | `422` — mọi `User` phải có ít nhất một role |

### REQ-USR-012 — Khoá và mở khoá tài khoản người dùng

**Nguồn:** `FEAT-USR-005`
**Ưu tiên:** P1

KHI admin khoá một tài khoản, HỆ THỐNG PHẢI đặt `isBanned = true`, ghi `banReason`, thu hồi toàn bộ
`RefreshToken` đang hoạt động của user đó, và phát `EVT-user.locked`. KHI admin mở khoá, HỆ THỐNG PHẢI đặt
`isBanned = false` và xoá `banReason`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin có `identity:users:lock:any`, user đang hoạt động | `POST /api/admin/users/:id/lock` kèm `reason` | `200`, `isBanned = true`, mọi `RefreshToken` của user bị `isRevoked = true`, phát `EVT-user.locked` |
| 2 | Admin có quyền, user đang bị khoá | `POST /api/admin/users/:id/unlock` | `200`, `isBanned = false`, `banReason = null` |
| 3 | User đã đăng nhập bằng phiên cũ ngay sau khi bị khoá | Gọi API bất kỳ bằng access token cũ | `401` khi access token hết hạn hoặc `403` do `isBanned`, tuỳ tầng kiểm tra — không được phép thao tác tiếp |

### REQ-USR-013 — Từ chối khoá tài khoản trái phép

**Nguồn:** `FEAT-USR-005`
**Ưu tiên:** P1

NẾU admin cố khoá chính tài khoản của mình hoặc khoá một tài khoản có role `SUPER_ADMIN` mà bản thân không phải
`SUPER_ADMIN`, THÌ HỆ THỐNG PHẢI từ chối thao tác.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin tự gọi khoá chính `userId` của mình | `POST /api/admin/users/:selfId/lock` | `422`, không khoá |
| 2 | Admin (không phải `SUPER_ADMIN`) khoá tài khoản `SUPER_ADMIN` | `POST /api/admin/users/:id/lock` | `403` |

## 5. Cài đặt thông báo — lối vào (`FEAT-USR-006`)

### REQ-USR-014 — Lối vào trang cài đặt thông báo

**Nguồn:** `FEAT-USR-006`
**Ưu tiên:** P1

NƠI CÓ mục "Cài đặt thông báo" trong khu vực hồ sơ người dùng, HỆ THỐNG PHẢI hiển thị đúng tuỳ chọn kênh/loại thông
báo hiện có của user, đọc và ghi qua API của `notification-service` (`NotificationPreference`) — nghiệp vụ và mô
hình dữ liệu đầy đủ thuộc `FEAT-NTF-005`, đặc tả tại domain `notification` (`docs/03-specs/notification-preference/`,
chưa viết tại thời điểm tài liệu này — theo dõi ở `docs/00-overview/feature-inventory.md` mục 17). Trang này **không**
lặp lại đặc tả `NotificationPreference`, chỉ đặc tả việc nhúng đúng vị trí trong menu hồ sơ và điều hướng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User mở menu hồ sơ | Nhấn "Cài đặt thông báo" | Điều hướng tới màn hình cấu hình do `notification-service` cấp dữ liệu, không phải trang trắng/stub |
| 2 | `notification-service` không phản hồi | Mở trang cài đặt thông báo | Hiển thị trạng thái lỗi (state #4 trong luật giao diện #9), không hiển thị màn hình trắng |

## 6. Đổi mật khẩu (`FEAT-USR-007`)

### REQ-USR-015 — Đổi mật khẩu khi đã đăng nhập

**Nguồn:** `FEAT-USR-007` (nghiệp vụ gốc: `FEAT-IDN-008`, domain `identity-auth`)
**Ưu tiên:** P0

KHI người dùng đã đăng nhập gửi `currentPassword` đúng và `newPassword` hợp lệ, HỆ THỐNG PHẢI băm mật khẩu mới
bằng bcrypt cost ≥ 12, ghi vào `User.passwordHash`, và thu hồi toàn bộ `RefreshToken` của các thiết bị khác (giữ
lại phiên hiện tại).

| # | Given | When | Then |
|---|---|---|---|
| 1 | `currentPassword` đúng, `newPassword` đạt độ mạnh yêu cầu | `POST /api/users/me/password` | `200`, `passwordHash` đổi, `RefreshToken` của thiết bị khác bị `isRevoked = true`, phiên hiện tại còn hiệu lực |
| 2 | `newPassword` trùng với mật khẩu hiện tại | `POST /api/users/me/password` | `422`, không đổi — mật khẩu mới phải khác mật khẩu cũ |

### REQ-USR-016 — Từ chối đổi mật khẩu khi sai mật khẩu hiện tại

**Nguồn:** `FEAT-USR-007` (nghiệp vụ gốc: `FEAT-IDN-008`)
**Ưu tiên:** P0

NẾU `currentPassword` gửi lên không khớp `User.passwordHash`, THÌ HỆ THỐNG PHẢI từ chối đổi mật khẩu, không thu hồi
bất kỳ phiên nào, và tăng bộ đếm thử sai (dùng chung cơ chế `failedLoginCount`/`lockedUntil` ở `FEAT-IDN-017`).

| # | Given | When | Then |
|---|---|---|---|
| 1 | `currentPassword` sai | `POST /api/users/me/password` | `400`, lỗi field `currentPassword`, không đổi `passwordHash`, không thu hồi `RefreshToken` nào |
| 2 | Sai `currentPassword` đủ số lần cấu hình trong cửa sổ thời gian | Lặp lại request sai | Tài khoản tạm khoá đổi mật khẩu theo cùng cơ chế `lockedUntil` của đăng nhập, trả `429`/`423` |
| 3 | Tài khoản đăng nhập bằng SSO, `User.passwordHash = null` | `POST /api/users/me/password` | `422`, hướng dẫn đặt mật khẩu lần đầu qua luồng "quên mật khẩu" (`FEAT-IDN-006`) thay vì đổi |

## 7. Xoá tài khoản (`FEAT-USR-008`)

### REQ-USR-017 — Yêu cầu xoá tài khoản

**Nguồn:** `FEAT-USR-008`
**Ưu tiên:** P2

KHI người dùng xác nhận xoá tài khoản của chính mình (nhập lại mật khẩu để xác thực), HỆ THỐNG PHẢI đặt
`User.deletedAt`, vô hiệu hoá đăng nhập ngay lập tức, và lên lịch job ẩn danh hoá `Profile` (xoá `avatar`, `bio`,
thay `firstName`/`lastName` bằng placeholder) sau khoảng thời gian giữ chỗ theo chính sách (ví dụ 30 ngày, cấu hình
ở `SystemConfig` của `master-data-service`).

| # | Given | When | Then |
|---|---|---|---|
| 1 | User xác thực đúng mật khẩu, không có ràng buộc chặn xoá | `POST /api/users/me/delete` | `200`, `User.deletedAt` được set, mọi `RefreshToken` bị thu hồi, job ẩn danh hoá được lên lịch |
| 2 | User yêu cầu xoá rồi đăng nhập lại trong thời gian giữ chỗ | Đăng nhập bằng tài khoản đã có `deletedAt` | Từ chối đăng nhập, hướng dẫn liên hệ hỗ trợ để khôi phục |

### REQ-USR-018 — Từ chối xoá tài khoản khi còn ràng buộc nghiệp vụ

**Nguồn:** `FEAT-USR-008`
**Ưu tiên:** P2

NẾU tài khoản còn `Order` chưa ở trạng thái cuối (`COMPLETED`/`CANCELLED`/`REFUNDED`), có `roles` chứa `SELLER`/
`BRAND` với shop đang hoạt động, hoặc có số dư `Wallet` khác `0`, THÌ HỆ THỐNG PHẢI từ chối xoá và liệt kê rõ lý do
chặn.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có đơn hàng đang `SHIPPING` | `POST /api/users/me/delete` | `409`, danh sách lý do gồm "còn đơn hàng đang xử lý" |
| 2 | User có role `SELLER`, shop chưa tạm ngưng | `POST /api/users/me/delete` | `409`, yêu cầu ngưng hoạt động bán hàng trước |
| 3 | User có `Wallet.balance != 0` | `POST /api/users/me/delete` | `409`, yêu cầu rút hết số dư trước |

## 8. Xuất dữ liệu cá nhân (`FEAT-USR-009`)

### REQ-USR-019 — Yêu cầu xuất dữ liệu cá nhân

**Nguồn:** `FEAT-USR-009`
**Ưu tiên:** P2

KHI người dùng yêu cầu xuất dữ liệu cá nhân, HỆ THỐNG PHẢI tạo job bất đồng bộ (BullMQ, theo `CLAUDE.md` luật #16 —
không xử lý trong đường request), tổng hợp `User`, `Profile`, `Address` (và gọi trực tiếp qua DI các module khác để
lấy phần dữ liệu của họ), đóng gói file, và thông báo cho người dùng khi sẵn sàng tải.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User gửi yêu cầu xuất dữ liệu lần đầu trong ngày | `POST /api/users/me/export` | `202`, job được xếp hàng, trả `jobId` |
| 2 | Job hoàn tất | Worker xử lý xong | User nhận thông báo trong-app/email kèm link tải có hạn dùng |
| 3 | User gửi yêu cầu thứ hai khi job trước chưa xong | `POST /api/users/me/export` | `409`, trả `jobId` của job đang chạy, không tạo job trùng |

## 9. Theo dõi shop (`FEAT-USR-010`)

### REQ-USR-020 — Theo dõi và bỏ theo dõi shop

**Nguồn:** `FEAT-USR-010`
**Ưu tiên:** P1

KHI người dùng theo dõi hoặc bỏ theo dõi một shop, HỆ THỐNG PHẢI ghi/xoá bản ghi `ShopFollow` (thuộc module `seller`,
gọi trực tiếp qua DI — xem [design.md §3](design.md#3-api)) gắn đúng `userId` của người gọi.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User chưa theo dõi shop X | `POST /api/shops/:sellerProfileId/follow` | `201`, `ShopFollow` được tạo, không trùng nếu gọi lại (idempotent theo `@@unique([userId, sellerProfileId])`) |
| 2 | User đang theo dõi shop X | `DELETE /api/shops/:sellerProfileId/follow` | `204`, `ShopFollow` bị xoá |

### REQ-USR-021 — Từ chối theo dõi shop không hợp lệ

**Nguồn:** `FEAT-USR-010`
**Ưu tiên:** P1

NẾU shop được theo dõi thuộc chính người dùng đang gọi hoặc shop đã bị `seller.shop.suspended`, THÌ HỆ THỐNG PHẢI
từ chối thao tác theo dõi.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User là chủ của `sellerProfileId` đó | `POST /api/shops/:sellerProfileId/follow` | `422`, không thể tự theo dõi shop của mình |
| 2 | Shop đang bị tạm ngưng | `POST /api/shops/:sellerProfileId/follow` | `409`, không cho theo dõi shop đang tạm ngưng |
| 3 | `sellerProfileId` không tồn tại | `POST /api/shops/:sellerProfileId/follow` | `404` |
