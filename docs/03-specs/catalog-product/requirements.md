---
title: Requirements — catalog-product
status: draft
owner: Backend Lead
updated: 2026-09-16
related:
    - docs/00-overview/feature-inventory.md
    - docs/02-domain/product-variant.md
    - docs/01-architecture/service-catalog.md
    - docs/01-architecture/event-catalog.md
    - docs/03-specs/catalog-product/design.md
    - docs/03-specs/catalog-product/tasks.md
---

# Requirements — `catalog-product`

Phạm vi: cây danh mục (`Category`), CRUD sản phẩm và biến thể (`Product`, `ProductOption`, `ProductOptionValue`,
`ProductVariant`), luồng kiểm duyệt sản phẩm, slug, ảnh sản phẩm, nhập hàng loạt, nhân bản, nháp, lịch sử giá,
ngừng kinh doanh. **Không** đặc tả reserve/commit/release tồn kho — thuộc domain `inventory` (mã `INV`), xem
`docs/03-specs/inventory/requirements.md` (khi có). Mô hình chi tiết Product/Option/Variant/InventoryItem là
`docs/02-domain/product-variant.md` — không lặp lại ở đây.

Mọi requirement dưới đây truy vết về `FEAT-CAT-<nnn>` trong
[feature-inventory.md §5](../../00-overview/feature-inventory.md#5-catalog-product--danh-mục--sản-phẩm).

---

## 1. Danh mục (`Category`)

### REQ-CAT-001 — Cây danh mục nhiều cấp

**Nguồn:** `FEAT-CAT-001`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cho phép Admin tạo, sửa, xoá `Category` theo cấu trúc cây (tự tham chiếu qua `parentId`) và sắp xếp
lại vị trí anh em bằng kéo thả (cập nhật `position`).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Admin ở trang quản lý danh mục | Tạo category con dưới một category cha đang `isActive` | Category mới được tạo với `parentId` đúng, `position` là số lớn nhất hiện có + 1 |
| 2 | Danh sách category cùng cấp cha | Admin kéo thả đổi thứ tự | `position` của toàn bộ anh em trong nhóm được ghi lại đúng thứ tự mới trong một transaction |
| 3 | Category `isActive = false` | Guest duyệt web | Category và sản phẩm thuộc nó không xuất hiện ở danh sách công khai |

### REQ-CAT-002 — Chặn xoá category còn sản phẩm

**Nguồn:** `FEAT-CAT-001`
**Ưu tiên:** P0

NẾU Admin xoá một `Category` đang có ít nhất một `Product` với `status != DELETED` tham chiếu tới nó (trực tiếp hoặc
qua category con), THÌ HỆ THỐNG PHẢI từ chối thao tác, trả `409 CATEGORY_HAS_PRODUCTS`, và không xoá.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Category có 3 sản phẩm đang `APPROVED` | Admin gọi xoá category đó | `409 CATEGORY_HAS_PRODUCTS`, category không đổi |
| 2 | Category rỗng, có category con rỗng | Admin gọi xoá | Xoá thành công, phát `EVT-category.updated` |
| 3 | Category có category con đang chứa sản phẩm | Admin xoá category cha | `409 CATEGORY_HAS_PRODUCTS` (kiểm tra đệ quy toàn bộ cây con) |

---

## 2. Tạo sản phẩm và biến thể

### REQ-CAT-003 — Tạo sản phẩm với option và ma trận biến thể

**Nguồn:** `FEAT-CAT-002`, `FEAT-CAT-003`
**Ưu tiên:** P0

KHI Seller gửi yêu cầu tạo sản phẩm kèm tối đa 3 `ProductOption` (mỗi option tối đa 30 giá trị), HỆ THỐNG PHẢI tạo
`Product` ở trạng thái `DRAFT`, sinh sẵn ma trận `ProductVariant` cho mọi tổ hợp giá trị (tối đa 200 variant), và
đặt một variant mặc định khi sản phẩm không có option (`isDefault = true`). Chi tiết thuật toán sinh ma trận, giới
hạn, và `optionKey` xem [product-variant.md §2–3](../../02-domain/product-variant.md#2-mô-hình-dữ-liệu).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller khai 2 option (Màu × Size) = 3 × 4 giá trị | Gửi tạo sản phẩm | Sinh đúng 12 `ProductVariant`, mỗi variant `isActive = false` cho tới khi seller điền giá |
| 2 | Sản phẩm không có option nào | Seller gửi tạo | Sinh đúng 1 `ProductVariant` với `isDefault = true`, không có `optionKey` |
| 3 | Seller không thuộc shop nào đã duyệt (`SellerProfile` chưa `APPROVED`) | Gửi tạo sản phẩm | `403` bị chặn ở lớp permission — không tạo |

### REQ-CAT-004 — Vượt giới hạn ma trận biến thể

**Nguồn:** `FEAT-CAT-003`
**Ưu tiên:** P0

NẾU tổ hợp option × giá trị sinh ra nhiều hơn 200 variant, HOẶC vượt quá 3 option, HOẶC một option vượt quá 30 giá
trị, THÌ HỆ THỐNG PHẢI từ chối ở tầng validate (Zod) trước khi chạm DB và trả `422 VARIANT_MATRIX_TOO_LARGE`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller khai 4 option | Gửi tạo sản phẩm | `422 VARIANT_MATRIX_TOO_LARGE`, không tạo `Product` |
| 2 | 3 option, tích các giá trị = 210 tổ hợp | Gửi tạo sản phẩm | `422 VARIANT_MATRIX_TOO_LARGE`, seller thấy số tổ hợp thực tế để tự giảm |

### REQ-CAT-005 — Thư viện ảnh sản phẩm và ảnh theo biến thể

**Nguồn:** `FEAT-CAT-004`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cho phép Seller gắn nhiều ảnh (`imageId` trỏ tới `media-service`) vào `Product` làm thư viện chung, và
gắn một `imageId` riêng cho từng `ProductOptionValue` (ví dụ ảnh theo màu) — variant kế thừa ảnh của giá trị option
mà nó chứa nếu không có ảnh riêng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm chưa có ảnh | Seller thêm 5 ảnh vào thư viện | Cả 5 được lưu, ảnh đầu tiên là ảnh đại diện mặc định |
| 2 | Option "Màu sắc" có giá trị "Đen" gắn `imageId` riêng | Trang chi tiết hiển thị variant "Đen / L" | Ảnh hiển thị là ảnh của giá trị "Đen", không phải ảnh thư viện chung |
| 3 | Seller gắn `imageId` không tồn tại ở `media-service` (kiểm qua RPC `media.get`) | Gửi lưu | `422 IMAGE_NOT_FOUND`, không lưu |

---

## 3. Slug

### REQ-CAT-006 — Sinh slug tự động, duy nhất, giữ lịch sử

**Nguồn:** `FEAT-CAT-005`
**Ưu tiên:** P1

KHI Seller tạo hoặc đổi tên sản phẩm, HỆ THỐNG PHẢI tự sinh `slug` từ tên (chuẩn hoá không dấu, thường, nối gạch
ngang), đảm bảo duy nhất trong phạm vi `shopId` (`@@unique([shopId, slug])`), và khi slug đổi thì ghi slug cũ vào
lịch sử để redirect 301 từ slug cũ sang slug mới.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Tên "Áo Thun Basic" | Tạo sản phẩm | Slug sinh ra `ao-thun-basic` |
| 2 | Sản phẩm đã có slug `ao-thun-basic`, seller đổi tên | Lưu tên mới "Áo Thun Basic 2026" | Slug mới `ao-thun-basic-2026`, slug cũ được ghi vào bảng lịch sử slug, request tới slug cũ trả `301` kèm slug mới |
| 3 | Guest truy cập một slug không còn tồn tại và cũng không có trong lịch sử | Mở trang chi tiết | `404` |

### REQ-CAT-007 — Slug trùng trong cùng shop

**Nguồn:** `FEAT-CAT-005`
**Ưu tiên:** P1

NẾU slug tự sinh đã tồn tại trong cùng `shopId` (kể cả slug đang là lịch sử của sản phẩm khác), THÌ HỆ THỐNG PHẢI
tự thêm hậu tố số tăng dần (`-2`, `-3`, …) cho tới khi duy nhất, không được trả lỗi cho seller ở luồng tạo thường.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Shop đã có sản phẩm slug `ao-thun-basic` | Seller tạo sản phẩm mới cùng tên | Slug mới là `ao-thun-basic-2`, tạo thành công |
| 2 | Seller tự nhập tay một slug đã tồn tại trong shop qua API nhập hàng loạt | Gửi lưu | `409 SLUG_ALREADY_EXISTS`, dòng đó bị từ chối, các dòng khác vẫn xử lý |

---

## 4. Luồng kiểm duyệt

### REQ-CAT-008 — Gửi sản phẩm để duyệt

**Nguồn:** `FEAT-CAT-006`, `FEAT-CAT-013`
**Ưu tiên:** P0

KHI Seller gửi một `Product` ở trạng thái `DRAFT` để duyệt, HỆ THỐNG PHẢI kiểm tra đủ trường bắt buộc (tên, category,
ít nhất một variant `isActive` có giá > 0, ít nhất một ảnh), rồi chuyển `status` sang `PENDING` và xếp vào hàng đợi
duyệt của Admin.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Draft đủ tên, category, 1 ảnh, 1 variant có giá | Seller gửi duyệt | `status = PENDING`, xuất hiện trong hàng đợi duyệt |
| 2 | Draft thiếu ảnh | Seller gửi duyệt | `422 PRODUCT_INCOMPLETE`, liệt kê trường thiếu, vẫn ở `DRAFT` |
| 3 | Sản phẩm đang `PENDING` | Seller gửi duyệt lại | `409 ALREADY_PENDING` |

### REQ-CAT-009 — Admin duyệt sản phẩm

**Nguồn:** `FEAT-CAT-006`
**Ưu tiên:** P0

KHI Admin duyệt một `Product` đang `PENDING`, HỆ THỐNG PHẢI chuyển `status` sang `APPROVED`, ghi thời điểm và người
duyệt, và phát `EVT-product.approved` trong cùng transaction với thay đổi trạng thái (transactional outbox).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm `PENDING` | Admin duyệt | `status = APPROVED`, sản phẩm hiển thị công khai, `EVT-product.approved` được ghi vào outbox |
| 2 | Sản phẩm `APPROVED` sẵn | Admin gọi duyệt lại (double click) | `409 ALREADY_APPROVED`, không phát event lần hai |
| 3 | Sản phẩm `DRAFT` (chưa gửi duyệt) | Admin gọi duyệt | `409 NOT_PENDING` |

### REQ-CAT-010 — Admin từ chối sản phẩm kèm lý do

**Nguồn:** `FEAT-CAT-006`
**Ưu tiên:** P0

KHI Admin từ chối một `Product` đang `PENDING`, HỆ THỐNG PHẢI bắt buộc nhập lý do (tối thiểu 10 ký tự), chuyển
`status` sang `REJECTED`, lưu lý do, và phát `EVT-product.rejected` để `notification-service` báo cho Seller.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm `PENDING` | Admin từ chối kèm lý do "Ảnh vi phạm bản quyền" | `status = REJECTED`, lý do được lưu, Seller nhận thông báo qua `EVT-product.rejected` |
| 2 | Admin từ chối không nhập lý do | Gửi request | `422 REASON_REQUIRED`, không đổi trạng thái |

### REQ-CAT-011 — Sản phẩm bị từ chối do không đủ điều kiện duyệt

**Nguồn:** `FEAT-CAT-006`
**Ưu tiên:** P0

NẾU sản phẩm ở trạng thái `REJECTED` được Seller sửa và gửi duyệt lại nhưng vẫn còn variant có giá `<= 0` hoặc
`compareAtPrice <= price`, THÌ HỆ THỐNG PHẢI chặn ở tầng validate trước khi vào hàng đợi, trả `422
PRODUCT_INCOMPLETE` kèm danh sách variant lỗi, không đổi `status`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm `REJECTED`, seller sửa nhưng còn 1 variant giá 0 | Gửi duyệt lại | `422 PRODUCT_INCOMPLETE`, liệt kê variant lỗi, `status` giữ `REJECTED` |
| 2 | Sản phẩm `REJECTED`, seller sửa hợp lệ toàn bộ | Gửi duyệt lại | `status = PENDING`, vào lại hàng đợi |

---

## 5. Danh sách và hiển thị

### REQ-CAT-012 — Danh sách sản phẩm của seller

**Nguồn:** `FEAT-CAT-007`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cung cấp `GET /seller/products` trả về sản phẩm thuộc shop của Seller đang đăng nhập, lọc được theo
`status`, phân trang, với phạm vi dữ liệu lọc bằng `whereForScope` (`shopId = user.sellerProfileId`) ngay trong câu
truy vấn.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller A có 20 sản phẩm, Seller B có 5 | Seller A gọi danh sách | Chỉ thấy 20 sản phẩm của mình, không thấy của B |
| 2 | Seller lọc `status=REJECTED` | Gọi danh sách | Chỉ trả sản phẩm `REJECTED` của shop mình |

### REQ-CAT-013 — Lọc sản phẩm công khai theo danh mục/giá/thương hiệu/đánh giá

**Nguồn:** `FEAT-CAT-008`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cung cấp `GET /products` chỉ trả sản phẩm `status = APPROVED` và shop không bị `SUSPENDED`, lọc được
theo `categoryId` (bao gồm category con), khoảng `minPrice`–`maxPrice`, `brandId`. Lọc theo đánh giá và full-text là
trách nhiệm của `search-service` (đọc chỉ mục dẫn xuất từ `EVT-product.approved`/`EVT-product.updated`) — endpoint
này là nguồn sự thật dự phòng khi Elasticsearch không sẵn sàng, không phải đường đọc chính cho trang tìm kiếm.

| # | Given | When | Then |
|---|---|---|---|
| 1 | 3 sản phẩm `APPROVED` trong khoảng giá 100.000–200.000₫, 2 ngoài khoảng | Guest lọc `minPrice=100000&maxPrice=200000` | Chỉ trả đúng 3 sản phẩm trong khoảng |
| 2 | Sản phẩm `APPROVED` nhưng shop đang `SUSPENDED` | Guest lọc theo category của shop đó | Sản phẩm không xuất hiện |

### REQ-CAT-014 — Trang chi tiết sản phẩm theo slug

**Nguồn:** `FEAT-CAT-009`
**Ưu tiên:** P0

HỆ THỐNG PHẢI cung cấp `GET /products/:slug` trả đầy đủ thông tin sản phẩm, option, variant đang `isActive`, và ảnh,
chỉ cho sản phẩm `status = APPROVED`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Slug hợp lệ của sản phẩm `APPROVED` | Guest mở trang | Trả đủ product + option + variant + ảnh |
| 2 | Slug thuộc sản phẩm `PENDING`/`DRAFT`/`REJECTED` | Guest mở trang | `404` (không lộ sự tồn tại của sản phẩm chưa duyệt) |
| 3 | Seller chủ sở hữu mở slug sản phẩm `PENDING` của chính mình (xem trước) | Gọi kèm quyền `catalog:products:update` | Trả đủ dữ liệu ở chế độ xem trước, không phải `404` |

### REQ-CAT-015 — Sản phẩm không tồn tại hoặc đã xoá

**Nguồn:** `FEAT-CAT-009`
**Ưu tiên:** P0

NẾU slug không khớp sản phẩm nào (kể cả trong lịch sử slug) hoặc sản phẩm có `status = DELETED`, THÌ HỆ THỐNG PHẢI
trả `404`, không phân biệt hai lý do với người dùng (chống dò dữ liệu).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Slug chưa từng tồn tại | Guest mở trang | `404` |
| 2 | Sản phẩm đã `DELETED` | Guest mở đúng slug cũ | `404` |

### REQ-CAT-016 — Metadata SEO và JSON-LD

**Nguồn:** `FEAT-CAT-010`
**Ưu tiên:** P1

HỆ THỐNG PHẢI trả kèm trong response chi tiết sản phẩm các trường phục vụ SEO (`name`, `description` rút gọn,
ảnh đại diện, `minPrice`/`maxPrice`, `currency`, số lượng đã bán `soldCount`) để `frontend` dựng thẻ `<meta>` và
JSON-LD schema.org `Product` qua `next-intl` — không hardcode chuỗi hiển thị ở BE.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm `APPROVED` đầy đủ dữ liệu | FE render trang chi tiết | JSON-LD `Product` có đủ `name`, `image`, `offers.price`, `offers.priceCurrency` |
| 2 | Sản phẩm thiếu ảnh đại diện | FE render | JSON-LD dùng ảnh mặc định của shop, không để trống field `image` |

---

## 6. Vận hành hàng loạt

### REQ-CAT-017 — Nhập hàng loạt sản phẩm bằng CSV/Excel

**Nguồn:** `FEAT-CAT-011`
**Ưu tiên:** P2

KHI Seller tải lên file CSV/Excel theo mẫu, HỆ THỐNG PHẢI xử lý bất đồng bộ qua BullMQ (không chặn request), tạo
từng sản phẩm ở trạng thái `DRAFT`, và trả về báo cáo kết quả (số dòng thành công/thất bại, lý do từng dòng lỗi) qua
job status endpoint.

| # | Given | When | Then |
|---|---|---|---|
| 1 | File 50 dòng hợp lệ | Seller tải lên | 50 `Product` `DRAFT` được tạo, job trả `50 thành công / 0 lỗi` |
| 2 | File 500 dòng | Seller tải lên | Request trả `202 Accepted` với `jobId` ngay lập tức, xử lý nền |

### REQ-CAT-018 — Dòng CSV không hợp lệ trong nhập hàng loạt

**Nguồn:** `FEAT-CAT-011`
**Ưu tiên:** P2

NẾU một dòng trong file nhập hàng loạt thiếu trường bắt buộc, sai kiểu dữ liệu, hoặc category không tồn tại, THÌ HỆ
THỐNG PHẢI bỏ qua dòng đó, ghi lý do cụ thể vào báo cáo, và tiếp tục xử lý các dòng còn lại — một dòng lỗi không làm
hỏng cả file.

| # | Given | When | Then |
|---|---|---|---|
| 1 | File 50 dòng, 3 dòng thiếu `categoryId` | Seller tải lên | 47 sản phẩm được tạo, báo cáo liệt kê đúng 3 dòng lỗi kèm số dòng và lý do |

### REQ-CAT-019 — Nhân bản sản phẩm

**Nguồn:** `FEAT-CAT-012`
**Ưu tiên:** P2

KHI Seller nhân bản một sản phẩm đang tồn tại, HỆ THỐNG PHẢI tạo `Product` mới ở trạng thái `DRAFT` với toàn bộ
option/variant/ảnh được sao chép, slug mới sinh riêng (không trùng bản gốc), và không sao chép `soldCount`,
lịch sử giá, hay đơn hàng liên quan.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm gốc `APPROVED` có 12 variant, `soldCount = 340` | Seller nhân bản | Sản phẩm mới `DRAFT`, 12 variant giống hệt giá/tên nhưng `id` mới, `soldCount = 0`, slug khác bản gốc |

### REQ-CAT-020 — Lưu nháp và xem trước

**Nguồn:** `FEAT-CAT-013`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cho phép Seller lưu sản phẩm ở trạng thái `DRAFT` bất kỳ lúc nào (kể cả thiếu trường), và xem trước
giao diện trang chi tiết y hệt người mua sẽ thấy sau khi duyệt, trước khi gửi duyệt chính thức.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller đang nhập dở sản phẩm | Bấm "Lưu nháp" | `Product` được lưu `DRAFT` dù thiếu ảnh/giá, không validate đầy đủ như lúc gửi duyệt |
| 2 | Sản phẩm `DRAFT` | Seller bấm "Xem trước" | Trả về màn hình dựng y hệt trang chi tiết công khai, chỉ Seller sở hữu xem được |

### REQ-CAT-021 — Lịch sử thay đổi giá

**Nguồn:** `FEAT-CAT-014`
**Ưu tiên:** P2

KHI giá (`price`) của một `ProductVariant` thay đổi, HỆ THỐNG PHẢI ghi một bản ghi `ProductPriceHistory`
(`oldPrice`, `newPrice`, `changedById`, `createdAt`) trong cùng transaction với việc cập nhật giá.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant giá 100.000₫ | Seller sửa thành 90.000₫ | `ProductPriceHistory` ghi `oldPrice=100000.00`, `newPrice=90000.00` |
| 2 | Seller sửa các trường khác của variant (tên SKU) nhưng không đổi giá | Lưu | Không ghi `ProductPriceHistory` |

### REQ-CAT-022 — Ngừng kinh doanh sản phẩm

**Nguồn:** `FEAT-CAT-015`
**Ưu tiên:** P1

KHI Seller ngừng kinh doanh một sản phẩm đã có đơn hàng tham chiếu, HỆ THỐNG PHẢI chuyển toàn bộ variant sang
`isActive = false` và ẩn sản phẩm khỏi danh sách công khai, **không xoá cứng** `Product`/`ProductVariant`, và phát
`EVT-product.deactivated`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm `APPROVED` đã có đơn hàng tham chiếu variant của nó | Seller bấm "Ngừng kinh doanh" | Toàn bộ variant `isActive = false`, sản phẩm ẩn khỏi trang công khai, `EVT-product.deactivated` phát ra, dữ liệu sản phẩm vẫn còn nguyên trong DB |
| 2 | Sản phẩm chưa từng có đơn hàng nào | Seller bấm "Xoá" (không phải "Ngừng kinh doanh") | `status = DELETED`, có thể coi là xoá logic vì slug/lịch sử vẫn giữ để tránh tái sử dụng |

### REQ-CAT-023 — Chặn xoá cứng sản phẩm đã có đơn hàng

**Nguồn:** `FEAT-CAT-015`
**Ưu tiên:** P1

NẾU Seller hoặc Admin cố xoá cứng (`DELETE`) một `Product` có bất kỳ `ProductVariant` nào đã từng được tham chiếu
bởi `OrderItem` (kiểm qua RPC `order.hasReferences` hoặc cờ nội bộ được đồng bộ qua `EVT-order.created`), THÌ HỆ
THỐNG PHẢI từ chối, trả `409 PRODUCT_IN_USE`, và hướng dẫn dùng "Ngừng kinh doanh" thay thế.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Sản phẩm có variant đã từng bán | Gọi `DELETE /seller/products/:id` | `409 PRODUCT_IN_USE`, không xoá |
| 2 | Sản phẩm `DRAFT`, chưa từng gửi duyệt, chưa có đơn | Gọi `DELETE` | Xoá cứng thành công |

---

## 7. Tự kiểm truy vết

| FEAT-CAT | REQ phủ |
|---|---|
| FEAT-CAT-001 | REQ-CAT-001, REQ-CAT-002 |
| FEAT-CAT-002 | REQ-CAT-003 |
| FEAT-CAT-003 | REQ-CAT-003, REQ-CAT-004 |
| FEAT-CAT-004 | REQ-CAT-005 |
| FEAT-CAT-005 | REQ-CAT-006, REQ-CAT-007 |
| FEAT-CAT-006 | REQ-CAT-008, REQ-CAT-009, REQ-CAT-010, REQ-CAT-011 |
| FEAT-CAT-007 | REQ-CAT-012 |
| FEAT-CAT-008 | REQ-CAT-013 |
| FEAT-CAT-009 | REQ-CAT-014, REQ-CAT-015 |
| FEAT-CAT-010 | REQ-CAT-016 |
| FEAT-CAT-011 | REQ-CAT-017, REQ-CAT-018 |
| FEAT-CAT-012 | REQ-CAT-019 |
| FEAT-CAT-013 | REQ-CAT-008 (một phần), REQ-CAT-020 |
| FEAT-CAT-014 | REQ-CAT-021 |
| FEAT-CAT-015 | REQ-CAT-022, REQ-CAT-023 |
