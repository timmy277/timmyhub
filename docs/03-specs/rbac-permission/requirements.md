---
title: Requirements — rbac-permission
status: draft
owner: Backend Lead
updated: 2026-09-16
related: [docs/00-overview/feature-inventory.md, docs/00-overview/roles-and-permissions.md, docs/01-architecture/rbac-advanced.md, docs/01-architecture/service-catalog.md, docs/02-domain/schemas/identity-service.prisma.md, docs/03-specs/rbac-permission/design.md, docs/03-specs/rbac-permission/tasks.md]
---

# Requirements — `rbac-permission`

Domain `RBAC`, sở hữu bởi `identity-service` (`identity_db`). Bốn lớp kiểm quyền — xác thực → role → permission
`module:resource:action` → phạm vi dữ liệu — được định nghĩa chi tiết ở
[rbac-advanced.md](../../01-architecture/rbac-advanced.md) và danh mục permission chuẩn tắc ở
[roles-and-permissions.md](../../00-overview/roles-and-permissions.md). Tài liệu này chỉ đặc tả **hành vi** cần có;
không lặp lại nội dung hai file trên.

Nguồn `FEAT-RBAC-*`: [feature-inventory.md §2](../../00-overview/feature-inventory.md#2-rbac-permission--vai-trò--quyền).
Mọi `FEAT-RBAC-001` đến `FEAT-RBAC-011` đều được phủ dưới đây.

---

### REQ-RBAC-001 — Vai thô gắn trực tiếp trên `User`

**Nguồn:** `FEAT-RBAC-001`
**Ưu tiên:** P0

HỆ THỐNG PHẢI xác định tập vai thô của người dùng từ `User.roles: UserRole[]` và đánh giá `RolesGuard` (lớp 1) trước
khi đi tới `PermissionsGuard` (lớp 2) cho mọi request đã xác thực.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có `roles: [SELLER]` | Gọi endpoint gắn `@Roles(SELLER, ADMIN)` | Qua lớp 1, đi tiếp lớp 2 |
| 2 | User có `roles: [CUSTOMER]` | Gọi endpoint gắn `@Roles(SELLER, ADMIN)` | `403`, dừng ở lớp 1, không đánh giá lớp 2/3 |
| 3 | User có `roles: [SUPER_ADMIN]` | Gọi bất kỳ endpoint nào | Qua lớp 1 và mọi lớp sau, nhưng vẫn ghi audit log bypass |

---

### REQ-RBAC-002 — Permission động qua `SystemRole` / `RolePermission` / `Permission`

**Nguồn:** `FEAT-RBAC-002`
**Ưu tiên:** P0

HỆ THỐNG PHẢI suy ra tập permission hiệu lực của một user bằng cách hợp (`UNION`) permission của mọi `SystemRole` được
gán qua `UserSystemRole`, rồi áp `UserPermission` (lớp 2b) làm bước cuối, mà không yêu cầu triển khai lại (deploy) khi
Super Admin chỉ thay đổi liên kết `RolePermission`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Role `SELLER` có `RolePermission → catalog:products:create` | User có `UserSystemRole` trỏ `SELLER` | `PermissionsGuard` cho qua `@Permissions(catalog:products:create)` |
| 2 | Super Admin gỡ `RolePermission` đó khỏi role `SELLER` | Không deploy lại service | User cùng role bị từ chối ngay khi cache permission được làm mới |
| 3 | User có hai role, chỉ một role có permission cần | Gọi endpoint yêu cầu permission đó | Vẫn được cho qua (hợp permission của mọi role) |

---

### REQ-RBAC-003 — Gán quyền trực tiếp cho user, cho phép / khước từ (lớp 2b)

**Nguồn:** `FEAT-RBAC-003`
**Ưu tiên:** P1

KHI Super Admin tạo bản ghi `UserPermission` cho một user với `isGranted = true`, HỆ THỐNG PHẢI cộng permission đó vào
tập hiệu lực của user dù role không có; KHI tạo với `isGranted = false`, HỆ THỐNG PHẢI loại permission đó khỏi tập hiệu
lực dù role có cấp.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User role `CUSTOMER`, không role nào có `content:reports:list` | Super Admin tạo `UserPermission(isGranted: true)` cho quyền đó | User gọi được endpoint yêu cầu quyền đó |
| 2 | User role `ADMIN` có `orders:cancel:any` qua role | Super Admin tạo `UserPermission(isGranted: false)` cho đúng quyền đó | User bị từ chối dù role vẫn có quyền |
| 3 | Người cấp quyền không tự có permission X | Người đó cố tạo `UserPermission` cấp X cho người khác | HỆ THỐNG PHẢI từ chối (không tự nâng cấp qua uỷ quyền) |

---

### REQ-RBAC-004 — Chuẩn đặt tên `module:resource:action[:any]`

**Nguồn:** `FEAT-RBAC-005`
**Ưu tiên:** P0

HỆ THỐNG PHẢI đặt tên mọi permission theo cấu trúc `<module>:<resource>:<action>[:any]`, trong đó vắng hậu tố `:any`
nghĩa là giới hạn phạm vi sở hữu (CASL quyết định) và `:any` nghĩa là toàn sàn, đúng theo
[roles-and-permissions.md §3](../../00-overview/roles-and-permissions.md#3-quy-ước-đặt-tên-permission).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Định nghĩa permission mới cho duyệt sản phẩm | Thêm vào `PERMISSIONS` const | Tên là `catalog:products:approve`, không phải `canApproveProduct` hay `product:approve` |
| 2 | Permission cho seller đọc đơn của shop mình và permission cho admin đọc mọi đơn | Khai báo hai permission | Hai chuỗi khác nhau: `orders:read` và `orders:read:any`, không dùng chung một permission kèm `if` phân biệt trong code |

---

### REQ-RBAC-005 — CASL ability đăng ký subject tường minh (lớp 3)

**Nguồn:** `FEAT-RBAC-004`
**Ưu tiên:** P0

HỆ THỐNG PHẢI đăng ký tường minh từng subject (`Product`, `Order`, `Post`, `AdCampaign`, `Review`, `Address`, `Wallet`,
`Conversation`, …) trong `CaslAbilityFactory.mapSubject`, và suy `AppAbility` cho user từ tập permission hiệu lực kết
hợp điều kiện sở hữu ở [roles-and-permissions.md §6](../../00-overview/roles-and-permissions.md#6-điều-kiện-casl-theo-bản-ghi).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller A sở hữu `Product` P | Gọi `ab.can('update', subject('Product', P))` với ability của seller A | Trả `true` |
| 2 | Seller B không sở hữu `Product` P | Gọi cùng biểu thức với ability của seller B | Trả `false` |
| 3 | Thêm subject mới `Wallet` vào hệ thống | Chưa đăng ký trong `mapSubject` | Không có test nào pass tới khi đăng ký subject — CI chặn merge |

---

### REQ-RBAC-006 — Subject chưa đăng ký phải ném lỗi, không có nhánh fallback nuốt subject lạ

**Nguồn:** `FEAT-RBAC-004`
**Ưu tiên:** P0

NẾU `mapSubject` nhận một tên subject chưa được đăng ký tường minh, THÌ HỆ THỐNG PHẢI ném lỗi cấu hình (`500`, ghi log
mức `CRITICAL`) chứ không được rơi vào nhánh mặc định coi như subject hợp lệ. Đây là lỗi nghiêm trọng nhất của bản cũ:
`mapSubject` có nhánh mặc định khiến rule CASL lấy từ DB không bao giờ khớp subject, tức toàn bộ lớp 3 bị vô hiệu âm
thầm mà không có triệu chứng lỗi nào lộ ra.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Subject `'Product'` đã đăng ký | `mapSubject('Product', record)` | Trả về subject CASL đúng type, rule khớp |
| 2 | Subject `'Unknown'` chưa từng đăng ký | `mapSubject('Unknown', record)` | Ném lỗi cấu hình ngay, **không** trả subject mặc định cho phép mọi rule |
| 3 | Deploy service thiếu đăng ký một subject đang được `@CheckPolicies` tham chiếu | Request đầu tiên chạm code path đó | Lỗi `500` có log rõ tên subject thiếu, không âm thầm cho qua như `can()` luôn `true` |

---

### REQ-RBAC-007 — Tài nguyên ngoài phạm vi dữ liệu trả `404`, không trả `403`

**Nguồn:** `FEAT-RBAC-004`
**Ưu tiên:** P0

NẾU một tài nguyên tồn tại nhưng nằm ngoài phạm vi dữ liệu (`DataScope`) của user gọi, THÌ HỆ THỐNG PHẢI trả `404`,
không trả `403` — theo CLAUDE.md luật #8: `403` xác nhận sự tồn tại của tài nguyên, tức rò rỉ thông tin.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller A gọi `GET /v1/orders/:id` với id đơn thuộc seller B | Seller A có quyền `orders:read` (không có `:any`) | `404`, không `403` |
| 2 | Guest gọi `GET /v1/orders/:id` với id không tồn tại | — | `404` — cùng hình dạng response với trường hợp 1, không phân biệt được |
| 3 | Admin có `orders:read:any` gọi cùng id | — | `200` — phạm vi `all` áp dụng đúng |

---

### REQ-RBAC-008 — Seed đầy đủ permission, không endpoint nào trỏ tới quyền không tồn tại

**Nguồn:** `FEAT-RBAC-006`
**Ưu tiên:** P0

HỆ THỐNG PHẢI seed toàn bộ permission liệt kê ở
[roles-and-permissions.md §4](../../00-overview/roles-and-permissions.md#4-danh-mục-permission), bao gồm các permission
mà bản cũ thiếu (`catalog:products:approve`/`:reject`, `identity:users:create`, `rbac:permissions:create`/`:update`/
`:delete`), và gán vào `RolePermission` đúng cột "Mặc định cho".

| # | Given | When | Then |
|---|---|---|---|
| 1 | Chạy `prisma db seed` trên DB rỗng | — | Bảng `Permission` có đủ permission ở §4, không thiếu `catalog:products:approve`, `identity:users:create`, `rbac:permissions:*` |
| 2 | Chạy seed lần thứ hai trên DB đã có dữ liệu | — | Idempotent (`upsert` theo `name`), không tạo trùng, không lỗi |
| 3 | Một endpoint có `@Permissions('catalog:products:approve')` | Seed chưa chạy hoặc thiếu permission này | Service từ chối khởi động (xem REQ-RBAC-014), không âm thầm chạy với endpoint không ai gọi được |

---

### REQ-RBAC-009 — CRUD role và gán permission cho role qua admin console

**Nguồn:** `FEAT-RBAC-007`
**Ưu tiên:** P1

KHI Super Admin tạo, sửa, xoá `SystemRole` hoặc thay đổi liên kết `RolePermission` qua admin console, HỆ THỐNG PHẢI
ghi thay đổi vào DB, phát `EVT-rbac.permissions.changed`, và ghi audit log kèm diff trước/sau cùng lý do bắt buộc nhập.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Super Admin tạo role mới `SUPPORT_STAFF` | Gán 3 permission | Role và `RolePermission` được tạo, audit log ghi lý do |
| 2 | Super Admin sửa role có `isSystem: true` (vd `SUPER_ADMIN`) | Gọi API sửa | `403`, role hệ thống không sửa được ở cả API lẫn trigger DB |
| 3 | Super Admin xoá role đang có user gán | Gọi API xoá | Từ chối hoặc yêu cầu gỡ gán trước — không để user mồ côi role |

---

### REQ-RBAC-010 — Gán / gỡ role cho người dùng

**Nguồn:** `FEAT-RBAC-008`
**Ưu tiên:** P0

KHI Admin gán hoặc gỡ role cho một user, HỆ THỐNG PHẢI cập nhật `UserSystemRole`, phát `EVT-user.role-granted` hoặc
`EVT-user.role-revoked`, và vô hiệu hoá ngay cache permission Redis của user đó (không đợi TTL 15 phút).

| # | Given | When | Then |
|---|---|---|---|
| 1 | User chỉ có role `CUSTOMER` | Admin gán role `SELLER` | `UserSystemRole` mới, phát `user.role-granted`, cache permission bị xoá ngay |
| 2 | User có role `SELLER` | Admin gỡ role `SELLER` | Phát `user.role-revoked`, lần gọi API tiếp theo của user không còn quyền của `SELLER` |
| 3 | Admin cố gán role `SUPER_ADMIN` cho user khác | Admin không phải `SUPER_ADMIN` | `403` — không tự nâng cấp quyền qua gán role vượt cấp bản thân |

---

### REQ-RBAC-011 — API kiểm tra permission hiệu lực (effective permissions) của một user

**Nguồn:** `FEAT-RBAC-009`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cung cấp RPC `rbac.getEffectivePermissions(userId)` trả về tập permission hiệu lực sau khi hợp permission
theo role và áp `UserPermission` (lớp 2b), dùng cho gateway lúc cache miss và cho admin console lúc tra cứu.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có role `SELLER` và một `UserPermission(isGranted: false)` khước từ một quyền của role | Gọi `rbac.getEffectivePermissions(userId)` | Danh sách trả về **không** chứa quyền bị khước từ |
| 2 | User không tồn tại | Gọi RPC với `userId` không có thật | Trả lỗi RPC rõ ràng (không trả mảng rỗng lẫn lộn với "user hợp lệ nhưng không có quyền nào") |
| 3 | Admin console gọi RPC để hiển thị màn hình tra cứu quyền | — | Kết quả nhất quán với những gì `PermissionsGuard` thực sự dùng để chặn/cho qua |

---

### REQ-RBAC-012 — Cache permission trong Redis, vô hiệu hoá khi role/permission đổi

**Nguồn:** `FEAT-RBAC-010`
**Ưu tiên:** P1

HỆ THỐNG PHẢI lưu tập permission đã tính sẵn của mỗi user tại khoá Redis `perm:{userId}` với TTL 15 phút, và KHI nhận
`EVT-rbac.permissions.changed`, `EVT-user.role-granted`, `EVT-user.role-revoked`, hoặc `EVT-user.locked`, HỆ THỐNG PHẢI
xoá khoá cache tương ứng ngay lập tức.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Cache `perm:{userId}` chưa có (miss) | Request đầu tiên của user | Tính từ DB, ghi cache, TTL 15 phút |
| 2 | Đổi định nghĩa role (gỡ permission khỏi `RolePermission`) | Phát `rbac.permissions.changed` | Cache của **mọi** user mang role đó bị xoá theo lô, không dùng `KEYS` trên Redis sản xuất |
| 3 | User bị khoá tài khoản | Phát `user.locked` | Cache permission của user đó bị xoá ngay, request tiếp theo bị chặn dù access token còn hạn |

---

### REQ-RBAC-013 — Redis lỗi/không đọc được thì chặn, không mở toang phân quyền (fail-closed)

**Nguồn:** `FEAT-RBAC-010`
**Ưu tiên:** P0

NẾU Redis không phản hồi hoặc trả lỗi khi tra cứu cache permission, THÌ HỆ THỐNG PHẢI đọc thẳng từ DB qua
`rbac.getEffectivePermissions` (đường chậm) để đánh giá quyền, **không** được coi cache miss/lỗi là "cho qua". Nếu cả
DB cũng không truy vấn được trong ngưỡng timeout, HỆ THỐNG PHẢI từ chối request (`503`), không mặc định `allow()`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Redis timeout khi tra `perm:{userId}` | Request tới `PermissionsGuard` | Guard gọi RPC đọc DB, request vẫn được đánh giá đúng quyền, có tăng độ trễ |
| 2 | Redis và DB đều không phản hồi trong timeout | Request tới `PermissionsGuard` | `503`, request bị từ chối, **không** có nhánh nào trả `allow()` khi thiếu dữ liệu |
| 3 | Cache cục bộ LRU trong pod còn dữ liệu 20 giây tuổi | Redis vừa mới lỗi | Guard dùng cache cục bộ đó tạm thời (theo rbac-advanced §6), không gọi thẳng "cho qua" |

---

### REQ-RBAC-014 — Kiểm tra nhất quán quyền lúc khởi động, fail-fast nếu thiếu

**Nguồn:** `FEAT-RBAC-011`
**Ưu tiên:** P0

TRONG KHI service khởi động, HỆ THỐNG PHẢI quét toàn bộ metadata `@Permissions(...)` gắn trên controller của chính
service đó, đối chiếu với hằng `PERMISSIONS` trong `@timmyhub/contracts` và với bảng `Permission` trong DB; NẾU có bất
kỳ chuỗi permission nào thiếu ở một trong ba nơi, THÌ HỆ THỐNG PHẢI từ chối khởi động và in danh sách cụ thể permission
thiếu cùng vị trí endpoint tham chiếu.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Mọi `@Permissions` đều có trong `PERMISSIONS` const và trong bảng `Permission` | Service khởi động | Khởi động bình thường |
| 2 | Một endpoint dùng `@Permissions('catalog:products:approve')` nhưng permission này chưa seed | Service khởi động | Service **không** khởi động, log liệt kê rõ `catalog:products:approve` thiếu ở DB và tên endpoint |
| 3 | `PERMISSIONS` const có một permission không endpoint nào dùng | Service khởi động | Chỉ cảnh báo (không chặn khởi động) — đây không phải lỗi an toàn, chỉ là permission chưa dùng tới |

---

## Tự kiểm

- `FEAT-RBAC-001` → `REQ-RBAC-001`
- `FEAT-RBAC-002` → `REQ-RBAC-002`
- `FEAT-RBAC-003` → `REQ-RBAC-003`
- `FEAT-RBAC-004` → `REQ-RBAC-005`, `REQ-RBAC-006`, `REQ-RBAC-007`
- `FEAT-RBAC-005` → `REQ-RBAC-004`
- `FEAT-RBAC-006` → `REQ-RBAC-008`
- `FEAT-RBAC-007` → `REQ-RBAC-009`
- `FEAT-RBAC-008` → `REQ-RBAC-010`
- `FEAT-RBAC-009` → `REQ-RBAC-011`
- `FEAT-RBAC-010` → `REQ-RBAC-012`, `REQ-RBAC-013`
- `FEAT-RBAC-011` → `REQ-RBAC-014`
