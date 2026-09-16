---
title: Danh mục tính năng (Feature Inventory)
status: approved
owner: Product Owner
updated: 2026-09-16
related: [docs/00-overview/product-overview.md, docs/01-architecture/service-catalog.md, docs/03-specs, docs/08-handoff/migration-from-legacy.md]
---

# Danh mục tính năng

Đây là **nguồn sự thật duy nhất** về phạm vi chức năng của TimmyHub. Mọi `REQ-*` trong `docs/03-specs/` phải truy ngược
được về một `FEAT-*` ở đây; mọi `FEAT-*` ở đây phải có ít nhất một `REQ-*`.

## Cách đọc bảng

| Cột | Ý nghĩa |
|---|---|
| **ID** | `FEAT-<DOMAIN>-<nnn>`, không tái sử dụng khi xoá |
| **Nguồn** | `kế thừa` = có trong bản cũ, giữ nguyên nghiệp vụ · `kế thừa+` = có nhưng mở rộng đáng kể · `kế thừa*` = có nhưng **đang lỗi/thiếu** ở bản cũ, phải sửa · `mới` = chưa từng có · `loại bỏ` = bản cũ có, bản mới bỏ |
| **Ưu tiên** | `P0` = MVP · `P1` = v1 · `P2` = v1.5 |
| **Vai** | Actor chính sử dụng |
| **Service** | Service sở hữu, xem [service-catalog.md](../01-architecture/service-catalog.md) |

Mã domain: `IDN` identity-auth · `RBAC` rbac-permission · `USR` user-profile · `SEL` seller-onboarding ·
`CAT` catalog-product · `INV` inventory · `CRT` cart-checkout · `ORD` order-fulfillment · `PAY` payment-vnpay ·
`WAL` wallet-settlement · `VCH` promotion-voucher · `CPG` campaign-flashsale · `PST` content-post · `ADS` video-ads ·
`REV` review-rating · `CHT` chat-support · `NTF` notification · `SRC` search-discovery · `MED` media-upload ·
`ANA` analytics-sales · `AUD` audit-log · `MDT` master-data · `ADM` admin-console.

## Tổng quan số lượng

| Nguồn | Số tính năng |
|---|---|
| kế thừa | 76 |
| kế thừa+ (mở rộng) | 27 |
| kế thừa* (phải sửa lỗi bản cũ) | 18 |
| mới | 130 |
| **Tổng đặc tả** | **251** |
| loại bỏ (không đặc tả) | 6 |

| Ưu tiên | Số tính năng |
|---|---|
| P0 (MVP) | 79 |
| P1 (v1) | 119 |
| P2 (v1.5) | 53 |

---

## 1. `identity-auth` — Xác thực & phiên

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-IDN-001 | Đăng ký bằng email + mật khẩu (bcrypt, cost ≥ 12) | kế thừa | P0 | Guest | identity |
| FEAT-IDN-002 | Đăng nhập trả access token + refresh token | kế thừa | P0 | User | identity |
| FEAT-IDN-003 | Refresh token xoay vòng (rotation) + phát hiện tái sử dụng | kế thừa* | P0 | User | identity |
| FEAT-IDN-004 | Đăng xuất một thiết bị / tất cả thiết bị | kế thừa | P0 | User | identity |
| FEAT-IDN-005 | Quản lý danh sách thiết bị đã đăng nhập, thu hồi từng thiết bị | kế thừa | P1 | User | identity |
| FEAT-IDN-006 | Quên mật khẩu → email token một lần, hết hạn 15 phút | kế thừa | P0 | User | identity |
| FEAT-IDN-007 | Đặt lại mật khẩu bằng token, vô hiệu toàn bộ phiên cũ | kế thừa | P0 | User | identity |
| FEAT-IDN-008 | Đổi mật khẩu khi đã đăng nhập (yêu cầu mật khẩu hiện tại) | kế thừa* | P0 | User | identity |
| FEAT-IDN-009 | SSO Google (Passport OAuth2) | kế thừa | P1 | Guest | identity |
| FEAT-IDN-010 | SSO Facebook | kế thừa | P1 | Guest | identity |
| FEAT-IDN-011 | Liên kết / gỡ liên kết tài khoản SSO với tài khoản email | mới | P2 | User | identity |
| FEAT-IDN-012 | Cookie HttpOnly + SameSite cấu hình theo môi trường | kế thừa* | P0 | — | gateway |
| FEAT-IDN-013 | Phiên NextAuth mã hoá phía FE, không lộ role/permission ra client | mới | P0 | — | frontend |
| FEAT-IDN-014 | Dọn refresh token hết hạn theo lịch (BullMQ cron) | kế thừa+ | P1 | System | identity |
| FEAT-IDN-015 | Thống kê token/phiên đang hoạt động cho admin | kế thừa | P2 | Admin | identity |
| FEAT-IDN-016 | Xác minh email sau đăng ký | mới | P1 | User | identity |
| FEAT-IDN-017 | Khoá tài khoản sau N lần đăng nhập sai, mở khoá theo thời gian | mới | P1 | System | identity |
| FEAT-IDN-018 | 2FA qua TOTP cho `ADMIN` / `SUPER_ADMIN` | mới | P2 | Admin | identity |
| FEAT-IDN-019 | Thống nhất tham số chuyển hướng `?callbackUrl` trên toàn hệ thống | kế thừa* | P0 | — | frontend |

> `kế thừa*` ở FEAT-IDN-019: bản cũ backend sinh `?redirect` nhưng FE đọc `?callbackUrl` → chuyển hướng sau đăng nhập sai.

## 2. `rbac-permission` — Vai trò & quyền

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-RBAC-001 | Enum `UserRole[]` gắn trực tiếp trên `User` (lớp 1) | kế thừa | P0 | — | identity |
| FEAT-RBAC-002 | Bảng `SystemRole` / `Permission` / `RolePermission` động (lớp 2) | kế thừa | P0 | Super Admin | identity |
| FEAT-RBAC-003 | Gán quyền trực tiếp cho user, cho phép/khước từ (lớp 2b) | kế thừa | P1 | Super Admin | identity |
| FEAT-RBAC-004 | CASL ability theo bản ghi (chủ sở hữu, shop) (lớp 3) | kế thừa* | P0 | — | identity |
| FEAT-RBAC-005 | Chuẩn đặt tên quyền `module:resource:action` | kế thừa | P0 | — | contracts |
| FEAT-RBAC-006 | Seed đầy đủ permission, **không endpoint nào trỏ tới quyền không tồn tại** | kế thừa* | P0 | — | identity |
| FEAT-RBAC-007 | CRUD role & gán permission cho role qua admin console | kế thừa | P1 | Super Admin | identity |
| FEAT-RBAC-008 | Gán / gỡ role cho người dùng | kế thừa | P0 | Admin | identity |
| FEAT-RBAC-009 | API kiểm tra quyền hiệu lực (`effective permissions`) của một user | mới | P1 | — | identity |
| FEAT-RBAC-010 | Cache permission trong Redis, invalidate khi role/permission đổi | mới | P1 | — | identity |
| FEAT-RBAC-011 | Kiểm tra nhất quán quyền lúc khởi động (fail fast nếu thiếu) | mới | P0 | — | identity |

> `kế thừa*` FEAT-RBAC-004: bản cũ có `mapSubject` fallback khiến rule lấy từ DB không khớp subject, thực tế vô hiệu.
> `kế thừa*` FEAT-RBAC-006: bản cũ thiếu seed `product:approve`, `users:create`, `rbac:permissions:create|update|delete`
> → các endpoint tương ứng không ai gọi được.

## 3. `user-profile` — Hồ sơ người dùng

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-USR-001 | Xem / cập nhật hồ sơ (tên, avatar, ngày sinh, giới tính, số điện thoại) | kế thừa | P0 | User | identity |
| FEAT-USR-002 | Sổ địa chỉ: thêm/sửa/xoá, đặt mặc định | kế thừa | P0 | User | order |
| FEAT-USR-003 | Chọn địa chỉ theo tỉnh/huyện/xã từ master data | kế thừa | P0 | User | order + masterdata |
| FEAT-USR-004 | Trang quản lý tài khoản (admin CRUD user) | kế thừa | P1 | Admin | identity |
| FEAT-USR-005 | Khoá / mở khoá tài khoản người dùng | kế thừa | P1 | Admin | identity |
| FEAT-USR-006 | Trang cài đặt thông báo (bản cũ mới là stub) | kế thừa* | P1 | User | notification |
| FEAT-USR-007 | Trang đổi mật khẩu (bản cũ mới là stub) | kế thừa* | P0 | User | identity |
| FEAT-USR-008 | Xoá tài khoản (soft delete + ẩn danh hoá dữ liệu cá nhân) | mới | P2 | User | identity |
| FEAT-USR-009 | Xuất dữ liệu cá nhân theo yêu cầu | mới | P2 | User | identity |
| FEAT-USR-010 | Theo dõi shop (follow seller) | mới | P1 | User | seller |

## 4. `seller-onboarding` — Trở thành người bán

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-SEL-001 | Gửi đơn đăng ký bán hàng (thông tin shop, giấy tờ) | kế thừa | P0 | User | seller |
| FEAT-SEL-002 | Admin duyệt / từ chối đơn kèm lý do | kế thừa | P0 | Admin | seller |
| FEAT-SEL-003 | Hồ sơ shop: tên, slug, logo, banner, mô tả, địa chỉ kho | kế thừa | P0 | Seller | seller |
| FEAT-SEL-004 | Trang shop công khai theo slug | kế thừa | P1 | Guest | seller |
| FEAT-SEL-005 | Quản lý thương hiệu (`BrandProfile`) | kế thừa | P1 | Seller | seller |
| FEAT-SEL-006 | Huy hiệu xác minh shop | mới | P2 | Admin | seller |
| FEAT-SEL-007 | Tạm ngưng / khôi phục shop vi phạm | mới | P1 | Admin | seller |
| FEAT-SEL-008 | Chỉ số uy tín shop (tỉ lệ huỷ, thời gian xử lý, điểm review) | mới | P2 | Seller | analytics |
| FEAT-SEL-009 | Cấu hình chính sách shop (đổi trả, thời gian chuẩn bị hàng) | mới | P1 | Seller | seller |

## 5. `catalog-product` — Danh mục & sản phẩm

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-CAT-001 | Cây danh mục nhiều cấp, kéo thả sắp xếp | kế thừa | P0 | Admin | catalog |
| FEAT-CAT-002 | Tạo sản phẩm với nhiều biến thể (`ProductVariant`) | kế thừa | P0 | Seller | catalog |
| FEAT-CAT-003 | Thuộc tính biến thể (màu/size…) sinh ma trận biến thể | kế thừa+ | P0 | Seller | catalog |
| FEAT-CAT-004 | Thư viện ảnh sản phẩm + ảnh riêng theo biến thể | kế thừa | P0 | Seller | catalog + media |
| FEAT-CAT-005 | Slug tự sinh, duy nhất, có lịch sử slug cũ để redirect | kế thừa+ | P1 | — | catalog |
| FEAT-CAT-006 | Hàng đợi duyệt sản phẩm (`ResourceStatus`), duyệt/từ chối kèm lý do | kế thừa* | P0 | Admin | catalog |
| FEAT-CAT-007 | Danh sách sản phẩm của seller (`/seller/products`) | kế thừa | P0 | Seller | catalog |
| FEAT-CAT-008 | Lọc sản phẩm theo danh mục/giá/thương hiệu/đánh giá | kế thừa | P0 | Guest | catalog + search |
| FEAT-CAT-009 | Trang chi tiết sản phẩm theo slug | kế thừa | P0 | Guest | catalog |
| FEAT-CAT-010 | Metadata SEO + JSON-LD `Product` | mới | P1 | — | frontend |
| FEAT-CAT-011 | Nhập hàng loạt sản phẩm bằng CSV/Excel | mới | P2 | Seller | catalog |
| FEAT-CAT-012 | Nhân bản sản phẩm | mới | P2 | Seller | catalog |
| FEAT-CAT-013 | Lưu nháp sản phẩm, xem trước trước khi gửi duyệt | mới | P1 | Seller | catalog |
| FEAT-CAT-014 | Lịch sử thay đổi giá | mới | P2 | Seller | catalog |
| FEAT-CAT-015 | Ngừng kinh doanh sản phẩm (không xoá cứng khi đã có đơn) | kế thừa+ | P1 | Seller | catalog |

## 6. `inventory` — Tồn kho *(domain mới hoàn toàn)*

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-INV-001 | Tồn kho theo biến thể, tách `onHand` / `reserved` / `available` | mới | P0 | Seller | catalog |
| FEAT-INV-002 | Reserve tồn kho khi tạo đơn, tự hết hạn nếu không thanh toán | mới | P0 | System | catalog |
| FEAT-INV-003 | Commit tồn kho khi thanh toán thành công | mới | P0 | System | catalog |
| FEAT-INV-004 | Release tồn kho khi huỷ/hết hạn/hoàn tiền | mới | P0 | System | catalog |
| FEAT-INV-005 | Nhật ký biến động tồn kho (`InventoryLedger`) bất biến | mới | P0 | Seller | catalog |
| FEAT-INV-006 | Điều chỉnh tồn thủ công kèm lý do | mới | P1 | Seller | catalog |
| FEAT-INV-007 | Cảnh báo sắp hết hàng theo ngưỡng | mới | P1 | Seller | catalog + notification |
| FEAT-INV-008 | Tồn kho riêng cho flash sale, tách khỏi tồn thường | mới | P1 | Seller | catalog |
| FEAT-INV-009 | Báo cáo tồn kho + giá trị tồn | mới | P2 | Seller | analytics |
| FEAT-INV-010 | Chống bán vượt tồn ở mức DB (ràng buộc `available >= 0`) | mới | P0 | — | catalog |

## 7. `cart-checkout` — Giỏ hàng & thanh toán

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-CRT-001 | Giỏ hàng bền vững theo user | kế thừa | P0 | User | cart |
| FEAT-CRT-002 | Thêm/sửa số lượng/xoá item | kế thừa | P0 | User | cart |
| FEAT-CRT-003 | Giỏ hàng cho khách chưa đăng nhập, gộp khi đăng nhập | mới | P1 | Guest | cart |
| FEAT-CRT-004 | Nhóm giỏ theo shop (mỗi shop một đơn con) | kế thừa+ | P0 | User | cart |
| FEAT-CRT-005 | Kiểm tra lại giỏ trước checkout (giá, tồn, trạng thái sản phẩm) | kế thừa+ | P0 | User | cart |
| FEAT-CRT-006 | Chốt ảnh giá (price snapshot) tại thời điểm đặt đơn | kế thừa+ | P0 | — | order |
| FEAT-CRT-007 | Áp voucher trong checkout, xem trước số tiền giảm | kế thừa | P0 | User | promotion |
| FEAT-CRT-008 | Chọn phương thức thanh toán (VNPay / COD) | kế thừa | P0 | User | order |
| FEAT-CRT-009 | Saga checkout với hành động bù trừ | mới | P0 | — | order |
| FEAT-CRT-010 | Lưu giỏ để mua sau (save for later) | mới | P2 | User | cart |
| FEAT-CRT-011 | Nhắc giỏ hàng bỏ quên qua email | mới | P2 | System | notification |

## 8. `order-fulfillment` — Đơn hàng

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-ORD-001 | Tạo đơn từ giỏ hàng | kế thừa | P0 | User | order |
| FEAT-ORD-002 | Máy trạng thái đơn hàng, chỉ cho phép chuyển hợp lệ | kế thừa+ | P0 | — | order |
| FEAT-ORD-003 | Lịch sử chuyển trạng thái (ai, khi nào, vì sao) | mới | P0 | Admin | order |
| FEAT-ORD-004 | Danh sách đơn của tôi, lọc theo trạng thái | kế thừa | P0 | User | order |
| FEAT-ORD-005 | Chi tiết đơn + theo dõi tiến trình | kế thừa | P0 | User | order |
| FEAT-ORD-006 | Seller xử lý đơn (xác nhận, đóng gói, bàn giao vận chuyển) | kế thừa* | P0 | Seller | order |
| FEAT-ORD-007 | Admin xem/đổi trạng thái mọi đơn (`orders:process`) | kế thừa | P0 | Admin | order |
| FEAT-ORD-008 | Người mua xác nhận đã nhận hàng | kế thừa | P0 | User | order |
| FEAT-ORD-009 | Tự động xác nhận nhận hàng sau N ngày giao thành công | mới | P1 | System | order |
| FEAT-ORD-010 | Huỷ đơn (người mua trước khi giao, seller kèm lý do) | kế thừa+ | P0 | User/Seller | order |
| FEAT-ORD-011 | Yêu cầu trả hàng / hoàn tiền | mới | P1 | User | order |
| FEAT-ORD-012 | Tính phí vận chuyển theo vùng và trọng lượng | kế thừa+ | P1 | — | order |
| FEAT-ORD-013 | Gán shipper và cập nhật trạng thái giao (`ShipperStatus`) | kế thừa | P1 | Shipper | order |
| FEAT-ORD-014 | In phiếu giao hàng / hoá đơn (PDF) | mới | P2 | Seller | order |
| FEAT-ORD-015 | Xuất danh sách đơn ra CSV/Excel | mới | P1 | Seller/Admin | order |
| FEAT-ORD-016 | Màn hình `/seller/orders` (bản cũ có liên kết nhưng **không có trang**) | kế thừa* | P0 | Seller | frontend |

> Bảy trạng thái bản cũ (`OrderStatus`) được mở rộng thành máy trạng thái 11 trạng thái —
> xem [order-fulfillment/design.md](../03-specs/order-fulfillment/design.md).

## 9. `payment-vnpay` — Thanh toán

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-PAY-001 | Tạo URL thanh toán VNPay có chữ ký | kế thừa | P0 | User | payment |
| FEAT-PAY-002 | Xử lý return URL (chỉ hiển thị, **không** chốt trạng thái) | kế thừa* | P0 | User | payment |
| FEAT-PAY-003 | Xử lý IPN **idempotent**, là nguồn sự thật của trạng thái thanh toán | kế thừa* | P0 | System | payment |
| FEAT-PAY-004 | Xác minh chữ ký `vnp_SecureHash`, từ chối yêu cầu sai | kế thừa | P0 | — | payment |
| FEAT-PAY-005 | Bản ghi `Payment` với `PaymentStatus`, gắn `orderId` duy nhất | kế thừa | P0 | — | payment |
| FEAT-PAY-006 | Thanh toán khi nhận hàng (COD) | kế thừa | P0 | User | payment |
| FEAT-PAY-007 | Hoàn tiền (một phần / toàn phần) | mới | P1 | Admin | payment |
| FEAT-PAY-008 | Đối soát định kỳ với sao kê VNPay, báo cáo sai lệch | mới | P1 | Admin | payment |
| FEAT-PAY-009 | Tự huỷ đơn chưa thanh toán sau 15 phút, release tồn | mới | P0 | System | payment + order |
| FEAT-PAY-010 | Nhật ký giao dịch thanh toán cho admin tra cứu | mới | P1 | Admin | payment |
| FEAT-PAY-011 | Thử lại thanh toán cho đơn chưa thanh toán | mới | P1 | User | payment |

## 10. `wallet-settlement` — Ví & đối soát *(domain mới)*

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-WAL-001 | Ví seller với số dư khả dụng / đang giữ | kế thừa* | P1 | Seller | payment |
| FEAT-WAL-002 | Sổ giao dịch ví bất biến (`WalletTransaction`) | kế thừa* | P1 | Seller | payment |
| FEAT-WAL-003 | Ghi có cho seller khi đơn hoàn tất, trừ hoa hồng sàn | mới | P1 | System | payment |
| FEAT-WAL-004 | Thời gian giữ tiền (hold) trước khi khả dụng | mới | P1 | System | payment |
| FEAT-WAL-005 | Yêu cầu rút tiền + luồng duyệt của admin | mới | P1 | Seller | payment |
| FEAT-WAL-006 | Sao kê đối soát theo kỳ, xuất file | mới | P2 | Seller | payment |
| FEAT-WAL-007 | Cấu hình tỉ lệ hoa hồng theo danh mục | mới | P2 | Admin | payment |
| FEAT-WAL-008 | Ví người mua (số dư hoàn tiền) | mới | P2 | User | payment |

> `kế thừa*`: model `Wallet` và `WalletTransaction` **đã có trong Prisma bản cũ nhưng không có bất kỳ API nào** —
> doanh số không có đường về tiền.

## 11. `promotion-voucher` — Khuyến mãi

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-VCH-001 | Ba loại voucher (`VoucherType`): phần trăm, số tiền, miễn phí vận chuyển | kế thừa | P1 | Admin | promotion |
| FEAT-VCH-002 | Điều kiện áp dụng: giá trị tối thiểu, danh mục, shop, phương thức thanh toán | kế thừa+ | P1 | Admin | promotion |
| FEAT-VCH-003 | Giới hạn tổng lượt dùng và lượt dùng mỗi người | kế thừa | P1 | — | promotion |
| FEAT-VCH-004 | Kho voucher của người dùng (`UserVoucher`, `UserVoucherStatus`) | kế thừa | P1 | User | promotion |
| FEAT-VCH-005 | Nhật ký sử dụng voucher (`VoucherUsageLog`) | kế thừa | P1 | Admin | promotion |
| FEAT-VCH-006 | Voucher do seller tự phát hành trong phạm vi shop | mới | P1 | Seller | promotion |
| FEAT-VCH-007 | Thu thập voucher trên trang shop / trang chủ | kế thừa | P1 | User | promotion |
| FEAT-VCH-008 | Hoàn trả lượt dùng voucher khi huỷ đơn | mới | P1 | System | promotion |
| FEAT-VCH-009 | Chống lạm dụng voucher (giới hạn theo thiết bị/IP) | mới | P2 | — | promotion |

## 12. `campaign-flashsale` — Chiến dịch & flash sale

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-CPG-001 | Tạo chiến dịch khuyến mãi có khung thời gian | kế thừa | P1 | Admin | promotion |
| FEAT-CPG-002 | Đăng ký sản phẩm vào chiến dịch (`CampaignProduct`) kèm giá riêng | kế thừa | P1 | Seller | promotion |
| FEAT-CPG-003 | Duyệt sản phẩm tham gia chiến dịch | mới | P1 | Admin | promotion |
| FEAT-CPG-004 | Flash sale theo khung giờ, đếm ngược, hạn mức tồn riêng | kế thừa+ | P1 | User | promotion |
| FEAT-CPG-005 | Tự kích hoạt / kết thúc chiến dịch theo lịch (BullMQ) | mới | P1 | System | promotion |
| FEAT-CPG-006 | Banner & trang đích của chiến dịch | mới | P2 | Admin | content |
| FEAT-CPG-007 | Báo cáo hiệu quả chiến dịch | mới | P2 | Admin | analytics |

## 13. `content-post` — Bài đăng & video

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-PST-001 | Seller đăng bài (văn bản + ảnh) với `PostStatus` | kế thừa | P1 | Seller | content |
| FEAT-PST-002 | Đăng video dọc (feed cuộn kiểu short-video) | kế thừa+ | P1 | Seller | content + media |
| FEAT-PST-003 | Gắn sản phẩm vào bài/video (`PostProduct`), mua ngay từ nội dung | kế thừa+ | P1 | Seller | content |
| FEAT-PST-004 | Thích bài (`PostLike`) cập nhật realtime | kế thừa | P1 | User | content |
| FEAT-PST-005 | Bình luận bài (`PostComment`) realtime, bình luận lồng nhau | kế thừa+ | P1 | User | content |
| FEAT-PST-006 | Hàng đợi kiểm duyệt nội dung, duyệt/từ chối kèm lý do | mới | P1 | Admin | content |
| FEAT-PST-007 | Feed cá nhân hoá (theo shop đang theo dõi + độ phổ biến) | mới | P2 | User | content |
| FEAT-PST-008 | Hashtag và trang hashtag | mới | P2 | User | content |
| FEAT-PST-009 | Hẹn giờ đăng bài | mới | P2 | Seller | content |
| FEAT-PST-010 | Báo cáo nội dung vi phạm | mới | P1 | User | content |
| FEAT-PST-011 | Chia sẻ bài ra mạng xã hội, sinh OG image | mới | P2 | User | frontend |
| FEAT-PST-012 | Lưu / bỏ lưu bài | mới | P2 | User | content |

## 14. `video-ads` — Quảng cáo *(domain mới)*

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-ADS-001 | Tạo chiến dịch quảng cáo (mục tiêu, ngân sách, thời gian) | mới | P1 | Seller | content |
| FEAT-ADS-002 | Boost một post/video có sẵn thành quảng cáo | mới | P1 | Seller | content |
| FEAT-ADS-003 | Vị trí hiển thị: feed, trang chủ, kết quả tìm kiếm, trang sản phẩm | mới | P1 | — | content |
| FEAT-ADS-004 | Nhắm mục tiêu theo danh mục, khu vực, hành vi cơ bản | mới | P2 | Seller | content |
| FEAT-ADS-005 | Tính phí theo CPM / CPC, trừ ngân sách theo thời gian thực | mới | P1 | System | content + payment |
| FEAT-ADS-006 | Đo impression / click / CTR / chuyển đổi ra đơn | mới | P1 | Seller | analytics |
| FEAT-ADS-007 | Chống gian lận nhấp chuột (khử trùng lặp theo phiên) | mới | P2 | — | content |
| FEAT-ADS-008 | Kiểm duyệt quảng cáo trước khi chạy | mới | P1 | Admin | content |
| FEAT-ADS-009 | Bảng điều khiển hiệu quả quảng cáo cho seller | mới | P1 | Seller | analytics |
| FEAT-ADS-010 | Tạm dừng / tiếp tục / kết thúc chiến dịch | mới | P1 | Seller | content |
| FEAT-ADS-011 | Cảnh báo sắp hết ngân sách | mới | P2 | Seller | notification |
| FEAT-ADS-012 | Gắn nhãn "Được tài trợ" bắt buộc trên mọi nội dung quảng cáo | mới | P1 | — | frontend |

## 15. `review-rating` — Đánh giá

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-REV-001 | Chỉ người đã mua và nhận hàng mới được đánh giá | kế thừa+ | P1 | User | engagement |
| FEAT-REV-002 | Đánh giá 1–5 sao kèm nội dung và ảnh/video | kế thừa | P1 | User | engagement |
| FEAT-REV-003 | Seller phản hồi đánh giá (`ReviewComment`) | kế thừa | P1 | Seller | engagement |
| FEAT-REV-004 | Bình chọn hữu ích (`ReviewHelpfulVote`) | kế thừa | P1 | User | engagement |
| FEAT-REV-005 | Cập nhật điểm trung bình sản phẩm realtime (`rating:updated`) | kế thừa | P1 | — | engagement |
| FEAT-REV-006 | Lọc đánh giá theo số sao / có ảnh | kế thừa | P1 | User | engagement |
| FEAT-REV-007 | Báo cáo & ẩn đánh giá vi phạm | mới | P1 | Admin | engagement |
| FEAT-REV-008 | Wishlist (`WishlistItem`) | kế thừa | P1 | User | engagement |
| FEAT-REV-009 | Nhắc đánh giá sau khi nhận hàng | mới | P2 | System | notification |
| FEAT-REV-010 | Sửa đánh giá trong 7 ngày, có lịch sử | mới | P2 | User | engagement |

## 16. `chat-support` — Chat & hỗ trợ

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-CHT-001 | Chat realtime 1-1 user ↔ seller (`ChatMessage`) | kế thừa | P1 | User | chat |
| FEAT-CHT-002 | Danh sách hội thoại, đếm tin chưa đọc | kế thừa+ | P1 | User | chat |
| FEAT-CHT-003 | Gửi ảnh và gắn sản phẩm/đơn hàng vào tin nhắn | mới | P1 | User | chat |
| FEAT-CHT-004 | Trợ lý AI (`ai-assistant-bot`) trả lời câu hỏi thường gặp | kế thừa | P2 | User | chat |
| FEAT-CHT-005 | Ticket hỗ trợ có trạng thái và mức ưu tiên | mới | P1 | User | chat |
| FEAT-CHT-006 | Tranh chấp đơn hàng ba bên (user ↔ seller ↔ admin) | mới | P1 | Admin | chat |
| FEAT-CHT-007 | Theo dõi SLA phản hồi, leo thang khi quá hạn | mới | P2 | Admin | chat |
| FEAT-CHT-008 | Tin nhắn mẫu cho seller | mới | P2 | Seller | chat |
| FEAT-CHT-009 | Chỉ báo đang gõ và đã đọc | mới | P2 | User | chat |
| FEAT-CHT-010 | Chặn người dùng quấy rối | mới | P2 | Seller | chat |

## 17. `notification` — Thông báo

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-NTF-001 | Thông báo trong ứng dụng realtime (`notification:new`) | kế thừa | P0 | User | notification |
| FEAT-NTF-002 | Đánh dấu đã đọc từng cái / tất cả | kế thừa | P0 | User | notification |
| FEAT-NTF-003 | Email giao dịch qua SMTP + template | kế thừa+ | P0 | System | notification |
| FEAT-NTF-004 | Hàng đợi gửi BullMQ, thử lại có backoff, dead-letter | mới | P0 | — | notification |
| FEAT-NTF-005 | Tuỳ chọn nhận thông báo theo từng loại/kênh | mới | P1 | User | notification |
| FEAT-NTF-006 | Web push (Service Worker) | mới | P2 | User | notification |
| FEAT-NTF-007 | Thông báo quảng bá do admin gửi theo phân khúc | mới | P2 | Admin | notification |
| FEAT-NTF-008 | Bản tin tổng hợp hằng ngày cho seller | mới | P2 | Seller | notification |
| FEAT-NTF-009 | Quản lý template có phiên bản | mới | P1 | Admin | notification |

## 18. `search-discovery` — Tìm kiếm

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-SRC-001 | Tìm kiếm sản phẩm toàn văn trên Elasticsearch | kế thừa | P1 | Guest | search |
| FEAT-SRC-002 | Đồng bộ chỉ mục qua domain event, không đọc chéo DB | kế thừa+ | P1 | — | search |
| FEAT-SRC-003 | Gợi ý tự động khi gõ | kế thừa | P1 | Guest | search |
| FEAT-SRC-004 | Bộ lọc facet (danh mục, giá, thương hiệu, đánh giá, shop) | kế thừa+ | P1 | Guest | search |
| FEAT-SRC-005 | Sắp xếp: liên quan, bán chạy, mới, giá | kế thừa | P1 | Guest | search |
| FEAT-SRC-006 | Chịu lỗi chính tả và hỗ trợ tiếng Việt không dấu | mới | P1 | Guest | search |
| FEAT-SRC-007 | Reindex toàn bộ không gián đoạn (alias swap) | mới | P1 | Admin | search |
| FEAT-SRC-008 | Tìm kiếm shop và tìm kiếm nội dung | mới | P2 | Guest | search |
| FEAT-SRC-009 | Từ khoá thịnh hành và lịch sử tìm kiếm | mới | P2 | User | search |
| FEAT-SRC-010 | Chèn kết quả được tài trợ có gắn nhãn | mới | P2 | — | search + content |

## 19. `media-upload` — Media

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-MED-001 | Upload ảnh lên Supabase Storage (≤ 5 MB) | kế thừa | P0 | Seller | media |
| FEAT-MED-002 | Upload video (≤ 200 MB, ≤ 10 phút) | kế thừa+ | P1 | Seller | media |
| FEAT-MED-003 | Kiểm tra MIME thật, không tin phần mở rộng tệp | kế thừa* | P0 | — | media |
| FEAT-MED-004 | Sinh thumbnail và nhiều kích thước ảnh (job) | mới | P1 | System | media |
| FEAT-MED-005 | Chuyển mã video sang HLS ladder 360p/720p(/1080p) bằng ffmpeg worker | mới | P1 | System | media |
| FEAT-MED-006 | Upload trực tiếp bằng signed URL, không đi qua gateway | mới | P1 | Seller | media |
| FEAT-MED-007 | Dọn tệp mồ côi theo lịch | mới | P2 | System | media |
| FEAT-MED-008 | Quét nội dung không phù hợp trước khi công khai | mới | P2 | System | media |
| FEAT-MED-009 | Upload nối lại được bằng tus (chunk 6 MB), tiếp tục sau khi mất mạng | mới | P0 | Seller | media |
| FEAT-MED-010 | Cấp token upload có hạn 30 phút; client không cầm khoá dịch vụ storage | mới | P0 | System | media |
| FEAT-MED-011 | Quét mã độc (ClamAV) trên tệp gốc trước khi chuyển mã | mới | P1 | System | media |
| FEAT-MED-012 | Sinh poster, sprite xem trước khi tua và ảnh động cho feed | mới | P1 | System | media |
| FEAT-MED-013 | Theo dõi tiến trình xử lý video theo thời gian thực (WebSocket) | mới | P1 | Seller | media |
| FEAT-MED-014 | Thử lại tác vụ chuyển mã thất bại (tự động có backoff + thủ công từ admin) | mới | P2 | Admin | media |

## 20. `analytics-sales` — Doanh số & báo cáo

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-ANA-001 | Bảng điều khiển admin: GMV, đơn, người dùng mới, doanh thu | kế thừa+ | P1 | Admin | analytics |
| FEAT-ANA-002 | Bảng điều khiển seller: doanh thu, đơn, lượt xem, tỉ lệ chuyển đổi | kế thừa+ | P1 | Seller | analytics |
| FEAT-ANA-003 | Doanh thu theo thời gian (ngày/tuần/tháng) với biểu đồ | kế thừa+ | P1 | Seller | analytics |
| FEAT-ANA-004 | Top sản phẩm / danh mục / shop bán chạy | kế thừa | P1 | Admin | analytics |
| FEAT-ANA-005 | Phễu chuyển đổi: xem → giỏ → checkout → đơn → hoàn tất | mới | P1 | Seller | analytics |
| FEAT-ANA-006 | Phân tích cohort giữ chân khách hàng | mới | P2 | Admin | analytics |
| FEAT-ANA-007 | Quy kết doanh thu từ nội dung và quảng cáo | mới | P1 | Seller | analytics |
| FEAT-ANA-008 | So sánh kỳ (so với kỳ trước / cùng kỳ năm trước) | mới | P2 | Seller | analytics |
| FEAT-ANA-009 | Xuất báo cáo CSV/Excel (job, tải về qua link tạm) | mới | P1 | Seller/Admin | analytics |
| FEAT-ANA-010 | Bản tổng hợp theo ngày dựng sẵn để đọc nhanh | mới | P1 | — | analytics |
| FEAT-ANA-011 | Báo cáo tồn kho và hàng chậm luân chuyển | mới | P2 | Seller | analytics |
| FEAT-ANA-012 | Mục tiêu doanh số và theo dõi tiến độ | mới | P2 | Seller | analytics |
| FEAT-ANA-013 | Số liệu thời gian thực trong ngày (gần realtime) | mới | P2 | Seller | analytics |

## 21. `audit-log` — Nhật ký kiểm toán

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-AUD-001 | Ghi tự động mọi thao tác ghi dữ liệu kèm actor, entity, diff | kế thừa+ | P0 | — | audit |
| FEAT-AUD-002 | Gắn `requestId` / `traceId` xuyên service | mới | P0 | — | audit |
| FEAT-AUD-003 | Lưu bất biến, phân vùng theo tháng, không cho sửa/xoá | mới | P1 | — | audit |
| FEAT-AUD-004 | Giao diện tra cứu audit log cho admin (lọc, phân trang) | kế thừa+ | P1 | Admin | audit |
| FEAT-AUD-005 | Nhật ký hệ thống (`SystemLog`, `LogStatus`) tập trung | kế thừa | P1 | Admin | audit |
| FEAT-AUD-006 | Chính sách lưu trữ và chuyển lưu trữ lạnh | mới | P2 | — | audit |
| FEAT-AUD-007 | Xuất audit log phục vụ kiểm toán | mới | P2 | Admin | audit |
| FEAT-AUD-008 | Che dữ liệu nhạy cảm trong log (mật khẩu, token, thẻ) | mới | P0 | — | audit |

## 22. `master-data` — Dữ liệu nền & cấu hình

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-MDT-001 | Tỉnh / huyện / xã (`Province`, `District`, `Ward`) | kế thừa | P0 | — | masterdata |
| FEAT-MDT-002 | API tra cứu địa giới có cache | kế thừa+ | P0 | — | masterdata |
| FEAT-MDT-003 | Cấu hình hệ thống theo khoá–giá trị, có phiên bản | mới | P1 | Super Admin | masterdata |
| FEAT-MDT-004 | Feature flag bật/tắt theo môi trường và theo phần trăm | mới | P1 | Super Admin | masterdata |
| FEAT-MDT-005 | Bảng phí vận chuyển theo vùng | mới | P1 | Admin | masterdata |
| FEAT-MDT-006 | Danh mục lý do (huỷ đơn, từ chối duyệt, báo cáo vi phạm) | mới | P1 | Admin | masterdata |
| FEAT-MDT-007 | Chế độ bảo trì | mới | P2 | Super Admin | masterdata |

## 23. `admin-console` — Bảng điều khiển quản trị

| ID | Tính năng | Nguồn | Ưu tiên | Vai | Service |
|---|---|---|---|---|---|
| FEAT-ADM-001 | Khung màn hình quản lý dạng tab (danh sách ↔ chi tiết) | kế thừa | P0 | Admin | frontend |
| FEAT-ADM-002 | Bảng dữ liệu: lọc nhanh, ẩn/hiện cột, ghim cột, chọn nhiều dòng | kế thừa | P0 | Admin | frontend |
| FEAT-ADM-003 | Xuất CSV từ bảng dữ liệu | kế thừa | P1 | Admin | frontend |
| FEAT-ADM-004 | Đặt lại trạng thái bảng về mặc định | kế thừa | P1 | Admin | frontend |
| FEAT-ADM-005 | Hàng đợi duyệt thống nhất (seller, sản phẩm, nội dung, quảng cáo, rút tiền) | mới | P1 | Admin | frontend |
| FEAT-ADM-006 | Màn hình `/admin/customers` (bản cũ có liên kết nhưng **không có trang**) | kế thừa* | P1 | Admin | frontend |
| FEAT-ADM-007 | Thao tác hàng loạt trên nhiều dòng đã chọn | mới | P2 | Admin | frontend |
| FEAT-ADM-008 | Trang lỗi và trạng thái rỗng cho mọi route (`error.tsx`, `not-found.tsx`) | kế thừa* | P0 | — | frontend |
| FEAT-ADM-009 | Đồng bộ giao diện sáng/tối toàn hệ thống | kế thừa | P1 | — | frontend |
| FEAT-ADM-010 | Trang sức khoẻ hệ thống (trạng thái từng service) | mới | P1 | Admin | frontend |

---

## 24. Tính năng **loại bỏ** so với bản cũ

| ID | Tính năng bản cũ | Lý do loại bỏ | Thay bằng |
|---|---|---|---|
| FEAT-DEP-001 | Tích hợp Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | Khai báo env nhưng **chưa từng được dùng** | VNPay (`payment-vnpay`) |
| FEAT-DEP-002 | Cookie `user_roles` / `user_permissions` không HttpOnly đọc ở edge | Lộ mô hình quyền ra client, dễ giả mạo | Phiên NextAuth mã hoá (FEAT-IDN-013) |
| FEAT-DEP-003 | DTO `class-validator` song song với zod | Chỉ `ZodValidationPipe` được đăng ký nên DTO **không bao giờ được validate** | zod + `nestjs-zod` ([ADR-0010](../01-architecture/adr/ADR-0010-zod-single-validation-source.md)) |
| FEAT-DEP-004 | AG Grid Enterprise làm bảng mặc định | Bản quyền thương mại; phần lớn màn hình không cần | TanStack Table ([ADR-0007](../01-architecture/adr/ADR-0007-tanstack-table-over-aggrid.md)) |
| FEAT-DEP-005 | i18next khởi tạo phía client, không có locale trên URL | Không SEO được theo ngôn ngữ | next-intl ([ADR-0008](../01-architecture/adr/ADR-0008-next-intl.md)) |
| FEAT-DEP-006 | `prisma db push --accept-data-loss` trong quy trình phát triển | Không có lịch sử migration, rủi ro mất dữ liệu | `prisma migrate` ([ADR-0009](../01-architecture/adr/ADR-0009-prisma-migrate.md)) |

## 25. Đối chiếu độ phủ với bản cũ

Bản cũ có **28 controller** và **42 model Prisma** (đếm bằng `grep -c '^model ' schema.prisma`, xem
`docs/02-domain/domain-model.md` §1). Bảng ánh xạ đầy đủ từng controller/model/route/thư viện sang
domain và service mới nằm ở [migration-from-legacy.md](../08-handoff/migration-from-legacy.md). Quy tắc kiểm chứng:
mỗi controller và mỗi model bản cũ phải xuất hiện ở **ít nhất một** hàng trong bảng đó, hoặc trong mục
[§24 Tính năng loại bỏ](#24-tính-năng-loại-bỏ-so-với-bản-cũ) kèm lý do.
