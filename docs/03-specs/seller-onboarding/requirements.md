---
title: Yêu cầu — seller-onboarding
status: draft
owner: Backend Lead
updated: 2026-09-19
related: [docs/00-overview/feature-inventory.md, docs/01-architecture/service-catalog.md, docs/01-architecture/event-catalog.md, docs/01-architecture/rbac-advanced.md, docs/02-domain/schemas/seller-service.prisma.md, docs/03-specs/seller-onboarding/design.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# Yêu cầu — seller-onboarding (`SEL`)

Phạm vi: toàn bộ `FEAT-SEL-*` trong [feature-inventory.md §4](../../00-overview/feature-inventory.md#4-seller-onboarding--trở-thành-người-bán) —
nộp đơn đăng ký bán hàng, admin duyệt/từ chối, hồ sơ shop, trang shop công khai, thương hiệu, huy hiệu xác minh,
tạm ngưng/khôi phục shop, chỉ số uy tín, cấu hình chính sách shop. Module sở hữu: `seller-service` (phần schema
module `seller` trong Postgres chung), xem [service-catalog.md](../../01-architecture/service-catalog.md#2-seller-service).

Ghi chú phạm vi: `ShopFollow` (theo dõi shop) thuộc `FEAT-USR-010` của domain `user-profile`, dù dùng chung phần
schema module `seller` — không đặc tả lại ở đây, chỉ xuất hiện trong mô hình dữ liệu của `design.md` vì cùng module.

## 1. Nộp đơn đăng ký bán hàng (`FEAT-SEL-001`)

### REQ-SEL-001 — Nộp đơn đăng ký bán hàng

**Nguồn:** `FEAT-SEL-001`
**Ưu tiên:** P0

KHI user đã xác thực gửi đơn đăng ký bán hàng với đầy đủ trường bắt buộc (`shopName`, `idDocumentUrl`), HỆ THỐNG
PHẢI tạo `SellerApplication` trạng thái `PENDING`, gắn `userId` từ token đã xác thực (không nhận từ body), và phát
`EVT-seller.application.submitted` qua outbox trong cùng transaction.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User đã đăng nhập, chưa từng nộp đơn | Gửi đơn đủ `shopName`, `idDocumentUrl` | Tạo `SellerApplication` `PENDING`, phát `seller.application.submitted` đúng một lần |
| 2 | User đã đăng nhập | Gửi kèm `sellerProfileId` giả trong body | Hệ thống bỏ qua giá trị đó, tự sinh `userId` từ token |
| 3 | Hai request nộp đơn cùng lúc với cùng `Idempotency-Key` | Gửi lại request thứ hai | Trả lại đúng kết quả lần đầu, không tạo bản ghi thứ hai |

### REQ-SEL-002 — Từ chối tạo đơn thiếu giấy tờ bắt buộc

**Nguồn:** `FEAT-SEL-001`
**Ưu tiên:** P0

NẾU đơn đăng ký thiếu `shopName` hoặc `idDocumentUrl`, THÌ HỆ THỐNG PHẢI từ chối tạo đơn, trả lỗi validation theo
schema `@timmyhub/contracts`, không ghi vào phần schema module `seller`, và không phát event.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn thiếu `idDocumentUrl` | Gửi đơn | Trả `422`, thông điệp lỗi qua catalog thông điệp, không tạo bản ghi |
| 2 | Đơn thiếu `shopName` | Gửi đơn | Trả `422`, không phát `seller.application.submitted` |
| 3 | `taxCode` bị bỏ trống (trường không bắt buộc) | Gửi đơn | Vẫn tạo đơn bình thường vì `taxCode` là optional |

### REQ-SEL-003 — Chặn nộp đơn trùng khi đã có đơn đang chờ hoặc đã có shop

**Nguồn:** `FEAT-SEL-001`
**Ưu tiên:** P0

NẾU user đã có `SellerApplication` ở trạng thái `PENDING`, hoặc đã có `SellerProfile` với `status = APPROVED`, THÌ
HỆ THỐNG PHẢI từ chối tạo đơn mới, trả lỗi `409`, không ghi bản ghi mới.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User có đơn đang `PENDING` | Gửi đơn thứ hai | Trả `409`, không tạo bản ghi mới |
| 2 | User đã có `SellerProfile.status = APPROVED` | Gửi đơn mới | Trả `409` kèm thông điệp "đã là seller" |
| 3 | User có đơn `REJECTED` (không có đơn `PENDING`, không có shop) | Gửi đơn mới | Cho phép tạo — xem `REQ-SEL-004` |

### REQ-SEL-004 — Nộp lại đơn sau khi bị từ chối

**Nguồn:** `FEAT-SEL-001`
**Ưu tiên:** P0

KHI user có `SellerApplication` gần nhất ở trạng thái `REJECTED` gửi đơn đăng ký mới, HỆ THỐNG PHẢI tạo một
`SellerApplication` **mới** trạng thái `PENDING` (giữ nguyên bản ghi `REJECTED` cũ làm lịch sử, không sửa đè), và
phát `EVT-seller.application.submitted`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn gần nhất của user là `REJECTED` với `reviewNote` | Nộp lại đơn có `idDocumentUrl` mới | Tạo bản ghi `SellerApplication` mới `PENDING`, bản ghi cũ giữ nguyên |
| 2 | User xem lịch sử đơn của mình | Gọi `GET /seller/applications/me` | Thấy cả đơn `REJECTED` cũ và đơn `PENDING` mới, sắp xếp theo `createdAt` giảm dần |

### REQ-SEL-005 — Giới hạn tần suất nộp lại đơn

**Nguồn:** `FEAT-SEL-001`
**Ưu tiên:** P1

NẾU user nộp lại đơn trong vòng 24 giờ kể từ `reviewedAt` của lần bị từ chối gần nhất, THÌ HỆ THỐNG PHẢI từ chối
yêu cầu, trả lỗi `429` kèm thời điểm được phép nộp lại tiếp theo.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn bị từ chối cách đây 2 giờ | Nộp lại ngay | Trả `429`, kèm `retryAfter` |
| 2 | Đơn bị từ chối cách đây 25 giờ | Nộp lại | Cho phép tạo đơn mới |

## 2. Admin duyệt / từ chối đơn (`FEAT-SEL-002`)

### REQ-SEL-006 — Admin duyệt đơn, tạo shop

**Nguồn:** `FEAT-SEL-002`
**Ưu tiên:** P0

KHI admin có quyền `seller:application:approve` duyệt một `SellerApplication` đang `PENDING`, HỆ THỐNG PHẢI, trong
cùng một transaction: chuyển đơn sang `APPROVED`, ghi `reviewedById`/`reviewedAt`, tạo `SellerProfile` mới với
`status = APPROVED` liên kết qua `sellerProfileId`, và ghi bản ghi `OutboxEvent` cho `EVT-seller.application.approved`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn `PENDING` hợp lệ | Admin duyệt | Đơn `APPROVED`, tạo `SellerProfile` mới, phát `seller.application.approved` đúng một lần |
| 2 | `identity-service` nhận `seller.application.approved` | Consumer xử lý | Gán role `SELLER` cho `userId`, ghi `ProcessedEvent` để chặn xử lý trùng |
| 3 | Admin duyệt đơn nhưng transaction DB rollback (lỗi hạ tầng) | — | Không có `SellerProfile` nào được tạo, không có `OutboxEvent` nào được ghi, đơn vẫn `PENDING` |

### REQ-SEL-007 — Admin từ chối đơn kèm lý do

**Nguồn:** `FEAT-SEL-002`
**Ưu tiên:** P0

KHI admin có quyền `seller:application:reject` từ chối một `SellerApplication` đang `PENDING` kèm `reviewNote`, HỆ
THỐNG PHẢI chuyển đơn sang `REJECTED`, bắt buộc `reviewNote` khác rỗng, ghi `reviewedById`/`reviewedAt`, và phát
`EVT-seller.application.rejected` qua outbox.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn `PENDING` | Admin từ chối kèm `reviewNote` = "Thiếu giấy phép kinh doanh" | Đơn `REJECTED`, phát `seller.application.rejected` với `reviewNote` trong payload |
| 2 | Admin gọi từ chối không kèm `reviewNote` | Gửi request | Trả `422`, không đổi trạng thái đơn |

### REQ-SEL-008 — Chặn duyệt/từ chối đơn không còn ở `PENDING`

**Nguồn:** `FEAT-SEL-002`
**Ưu tiên:** P0

NẾU `SellerApplication` không còn ở trạng thái `PENDING` (đã `APPROVED` hoặc `REJECTED`) khi nhận yêu cầu duyệt hoặc
từ chối, THÌ HỆ THỐNG PHẢI từ chối thao tác bằng `UPDATE … WHERE id = :id AND status = 'PENDING'` trả về 0 dòng, ánh
xạ sang lỗi `409`, không phát lại event.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Hai admin cùng bấm duyệt một đơn gần như đồng thời | Request thứ hai tới sau khi request đầu đã commit | Request thứ hai nhận `409`, không tạo `SellerProfile` thứ hai, không phát event trùng |
| 2 | Đơn đã `REJECTED` | Admin gọi duyệt | Trả `409`, không đổi trạng thái |

## 3. Hồ sơ shop (`FEAT-SEL-003`)

### REQ-SEL-009 — Cập nhật hồ sơ shop

**Nguồn:** `FEAT-SEL-003`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cho phép seller sở hữu `SellerProfile` (`status = APPROVED`) cập nhật `shopName`, `shopLogo`,
`shopBanner`, `description`, `warehouseAddressLine`, `provinceCode`, `districtCode`, `wardCode` của chính shop mình,
và phát `EVT-seller.shop.updated` sau khi lưu thành công.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller sở hữu shop `APPROVED` | Cập nhật `description` và `shopBanner` | Lưu thành công, phát `seller.shop.updated` |
| 2 | Seller cố cập nhật `SellerProfile` của shop khác | Gửi `PATCH /seller/shop/me` với token của mình nhưng nhắm `id` shop khác qua thao tác trực tiếp | Trả `404` (phạm vi lọc qua `whereForScope`, không phải `403`) |

### REQ-SEL-010 — Tự đảm bảo `shopSlug` duy nhất khi đổi tên shop trùng

**Nguồn:** `FEAT-SEL-003`
**Ưu tiên:** P1

NẾU `shopSlug` sinh từ `shopName` mới trùng với `shopSlug` đã tồn tại của một `SellerProfile` khác, THÌ HỆ THỐNG
PHẢI tự động thêm hậu tố số tăng dần (`-2`, `-3`, …) cho tới khi duy nhất trước khi ghi, dựa vào ràng buộc
`@unique` trên `shopSlug` — không đọc-kiểm tra-rồi-ghi tách rời hai bước.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop A đổi tên thành "Cửa Hàng Việt", slug `cua-hang-viet` đã bị Shop B (khác) chiếm | Shop A lưu | Shop A nhận `shopSlug = cua-hang-viet-2`, không lỗi |
| 2 | Slug mới không trùng ai | Lưu | `shopSlug` giữ nguyên dạng sinh ra, không thêm hậu tố |
| 3 | Hai request đổi tên trùng slug gửi đồng thời (race) | Cả hai cùng cố lấy `cua-hang-viet` | Một request thành công với slug gốc, request còn lại retry và nhận hậu tố kế tiếp nhờ bắt lỗi vi phạm `@unique` rồi thử lại, không có hai shop trùng slug |

## 4. Trang shop công khai (`FEAT-SEL-004`)

### REQ-SEL-011 — Trang shop công khai theo slug

**Nguồn:** `FEAT-SEL-004`
**Ưu tiên:** P1

TRONG KHI một `SellerProfile` có `status = APPROVED` và `isSuspended = false`, HỆ THỐNG PHẢI cho phép guest xem
trang shop công khai qua `shopSlug`, trả về các trường công khai (`shopName`, `shopLogo`, `shopBanner`,
`description`, `rating`, `returnPolicyDays`, `prepTimeHours`), không trả `warehouseAddressLine` chi tiết.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop `APPROVED`, không bị tạm ngưng | `GET /shops/:slug` | Trả `200` với các trường công khai |
| 2 | Guest xem trang shop | Response trả về | Không có trường `warehouseAddressLine`, không có thông tin nội bộ nào của đơn/uy tín chưa công bố |

### REQ-SEL-012 — Shop không khả dụng trả `404`

**Nguồn:** `FEAT-SEL-004`
**Ưu tiên:** P1

NẾU `shopSlug` không tồn tại, hoặc `SellerProfile` tương ứng đang `isSuspended = true`, hoặc `status != APPROVED`,
THÌ HỆ THỐNG PHẢI trả `404` cho trang shop công khai — không phân biệt "không tồn tại" với "bị tạm ngưng" để tránh
rò rỉ thông tin.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `shopSlug` không tồn tại | `GET /shops/:slug` | Trả `404` |
| 2 | Shop tồn tại nhưng `isSuspended = true` | `GET /shops/:slug` | Trả `404`, không trả `403` |
| 3 | Shop tồn tại nhưng `status = PENDING` (chưa từng duyệt, không nên xảy ra do slug chỉ sinh khi duyệt) | `GET /shops/:slug` | Trả `404` |

## 5. Quản lý thương hiệu (`FEAT-SEL-005`)

### REQ-SEL-013 — Tạo và cập nhật thương hiệu

**Nguồn:** `FEAT-SEL-005`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cho phép seller có `SellerProfile.status = APPROVED` tạo đúng một `BrandProfile` gắn với
`sellerProfileId` của mình (ràng buộc `@unique`), và cập nhật `brandName`, `brandLogo`, `description` sau đó.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller đã duyệt, chưa có `BrandProfile` | Tạo thương hiệu với `brandName` hợp lệ | Tạo thành công, sinh `brandSlug` duy nhất |
| 2 | Seller đã có `BrandProfile` | Gọi tạo thương hiệu lần hai | Trả `409` — mỗi shop chỉ một thương hiệu |
| 3 | Seller chưa được duyệt (`SellerProfile` chưa tồn tại) | Gọi tạo thương hiệu | Trả `404` |

### REQ-SEL-014 — Chặn `brandName`/`brandSlug` trùng

**Nguồn:** `FEAT-SEL-005`
**Ưu tiên:** P1

NẾU `brandName` hoặc `brandSlug` sinh ra đã tồn tại ở một `BrandProfile` khác, THÌ HỆ THỐNG PHẢI từ chối tạo/sửa,
trả lỗi `409` kèm gợi ý tên khác — không tự thêm hậu tố cho thương hiệu (khác với `shopSlug` ở `REQ-SEL-010`, vì
`brandName` là nhãn hiệu thật, không được tự ý biến dạng).

| # | Given | When | Then |
|---|---|---|---|
| 1 | `brandName = "Cocoon"` đã tồn tại | Seller khác tạo thương hiệu `brandName = "Cocoon"` | Trả `409` |
| 2 | `brandSlug` trùng dù `brandName` khác (khác biệt chỉ ở dấu) | Tạo thương hiệu | Trả `409` |

## 6. Huy hiệu xác minh shop (`FEAT-SEL-006`)

### REQ-SEL-015 — Admin xác minh shop

**Nguồn:** `FEAT-SEL-006`
**Ưu tiên:** P2

KHI admin có quyền `seller:shops:verify` xác minh một shop `APPROVED`, HỆ THỐNG PHẢI đặt `isVerified = true`,
`verifiedAt = now()`, và ghi audit log — không phát event outbox vì không có consumer nào ngoài read model hiển
thị huy hiệu (không cần thêm `EVT-seller.*` mới ngoài danh mục hiện có).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop `APPROVED`, `isVerified = false` | Admin xác minh | `isVerified = true`, `verifiedAt` được ghi, audit log có diff trước/sau |
| 2 | Shop đã `isVerified = true` | Admin xác minh lại | Không đổi `verifiedAt`, trả `200` idempotent (không lỗi) |

## 7. Tạm ngưng / khôi phục shop vi phạm (`FEAT-SEL-007`)

### REQ-SEL-016 — Tạm ngưng shop vi phạm

**Nguồn:** `FEAT-SEL-007`
**Ưu tiên:** P1

KHI admin có quyền `seller:shops:suspend` tạm ngưng một shop kèm `suspendedReason` bắt buộc, HỆ THỐNG PHẢI đặt
`isSuspended = true`, lưu `suspendedReason`, và phát `EVT-seller.shop.suspended` qua outbox để `catalog-service` ẩn
toàn bộ sản phẩm của shop.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop đang hoạt động bình thường | Admin tạm ngưng kèm lý do "Bán hàng giả" | `isSuspended = true`, phát `seller.shop.suspended`, `catalog-service` ẩn sản phẩm |
| 2 | Admin tạm ngưng không kèm lý do | Gửi request | Trả `422`, không đổi trạng thái |

### REQ-SEL-017 — Khôi phục shop tạm ngưng

**Nguồn:** `FEAT-SEL-007`
**Ưu tiên:** P1

KHI admin có quyền `seller:shops:restore` khôi phục một shop đang `isSuspended = true`, HỆ THỐNG PHẢI đặt
`isSuspended = false`, xoá `suspendedReason`, và phát `EVT-seller.shop.updated` để các service liên quan (bao gồm
`catalog-service`) đồng bộ lại read model và hiện lại sản phẩm.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop đang `isSuspended = true` | Admin khôi phục | `isSuspended = false`, `suspendedReason = null`, phát `seller.shop.updated` |
| 2 | Shop không hề bị tạm ngưng | Admin gọi khôi phục | Trả `409`, không phát event |

## 8. Chỉ số uy tín shop (`FEAT-SEL-008`)

### REQ-SEL-018 — Cập nhật chỉ số uy tín khi đơn hoàn tất

**Nguồn:** `FEAT-SEL-008`
**Ưu tiên:** P2

KHI module `seller` nhận `EVT-order.completed` qua `EventEmitter2` (`@OnEvent`, trong cùng process với module
`order`), HỆ THỐNG PHẢI cập nhật `cancelRate` và `avgResponseHours` của `SellerProfile` tương ứng bằng
`UPDATE … WHERE id = :sellerProfileId` nguyên tử, và ghi `ProcessedEvent(eventId)` trước khi xử lý để đảm bảo
idempotent nếu sự kiện bị phát lại (retry logic nội bộ của module phát, chạy lại thủ công/backfill) — không còn vì
lý do "at-least-once delivery" của broker như bản RabbitMQ cũ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sự kiện `order.completed` lần đầu tới | Consumer xử lý | Cập nhật chỉ số, ghi `ProcessedEvent` |
| 2 | Cùng `eventId` gửi lại (at-least-once delivery) | Consumer nhận lại | Phát hiện đã có trong `ProcessedEvent`, bỏ qua, không cập nhật hai lần |

### REQ-SEL-019 — Cập nhật điểm đánh giá khi có review mới

**Nguồn:** `FEAT-SEL-008`
**Ưu tiên:** P2

KHI `seller-service` nhận `EVT-review.created`, HỆ THỐNG PHẢI cập nhật `rating` trung bình của `SellerProfile`
tương ứng bằng `UPDATE` nguyên tử, idempotent qua `ProcessedEvent`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Review mới 5 sao cho shop | Consumer xử lý `review.created` | `rating` của shop được tính lại và cập nhật |

### REQ-SEL-020 — Seller xem chỉ số uy tín của shop mình

**Nguồn:** `FEAT-SEL-008`
**Ưu tiên:** P2

HỆ THỐNG PHẢI cho phép seller xem `cancelRate`, `avgResponseHours`, `rating` của chính shop mình qua endpoint hồ
sơ shop; các trường này chỉ đọc, không cho seller tự sửa trực tiếp.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller gọi `GET /seller/shop/me` | — | Response có `cancelRate`, `avgResponseHours`, `rating` |
| 2 | Seller gửi `PATCH` với `rating` trong body | — | Trường `rating` bị bỏ qua, không cập nhật (chỉ hệ thống mới ghi được) |

## 9. Cấu hình chính sách shop (`FEAT-SEL-009`)

### REQ-SEL-021 — Cấu hình chính sách shop

**Nguồn:** `FEAT-SEL-009`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cho phép seller cập nhật `returnPolicyDays` (0–30) và `prepTimeHours` (1–168) của `SellerProfile`
mình, áp dụng ngay cho đơn hàng tạo sau thời điểm cập nhật.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller đặt `returnPolicyDays = 15`, `prepTimeHours = 48` | Lưu | Cập nhật thành công, phát `seller.shop.updated` |

### REQ-SEL-022 — Từ chối giá trị chính sách ngoài khoảng cho phép

**Nguồn:** `FEAT-SEL-009`
**Ưu tiên:** P1

NẾU `returnPolicyDays` nằm ngoài `[0, 30]` hoặc `prepTimeHours` nằm ngoài `[1, 168]`, THÌ HỆ THỐNG PHẢI từ chối cập
nhật, trả lỗi validation theo schema Zod dùng chung, không lưu giá trị không hợp lệ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `returnPolicyDays = 45` | Gửi cập nhật | Trả `422`, giữ nguyên giá trị cũ |
| 2 | `prepTimeHours = 0` | Gửi cập nhật | Trả `422`, giữ nguyên giá trị cũ |
