---
title: Requirements — cart-checkout
status: draft
owner: Backend Lead
updated: 2026-09-16
related:
    - docs/00-overview/feature-inventory.md
    - docs/01-architecture/service-catalog.md
    - docs/01-architecture/communication-patterns.md
    - docs/01-architecture/event-catalog.md
    - docs/02-domain/schemas/cart-service.prisma.md
    - docs/03-specs/cart-checkout/design.md
---

# Requirements — `cart-checkout` (`CRT`)

Phạm vi: giỏ hàng bền vững của user (`cart-service`), giỏ khách vãng lai, kiểm tra lại giỏ trước khi tạo đơn, và
bước khởi tạo checkout gọi sang `order-service`. **Không** phủ toàn bộ saga tạo đơn (giữ tồn, giữ voucher, chờ
thanh toán, chốt/bù trừ) — phần đó thuộc `docs/03-specs/order-fulfillment/`.

Mọi feature nguồn: `docs/00-overview/feature-inventory.md` mục 7 `cart-checkout`.

## 1. Giỏ hàng bền vững

### REQ-CRT-001 — Xem giỏ hàng của mình

**Nguồn:** `FEAT-CRT-001`
**Ưu tiên:** P0

HỆ THỐNG PHẢI lưu giỏ hàng của user đã đăng nhập bền vững (Postgres `cart_db`, cache Redis 30 phút), gắn theo
đúng một `Cart` trên mỗi `userId`, và chỉ trả về giỏ của chính user đang gọi.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User đã có `Cart` với 3 item | Gọi `GET /v1/cart` | Trả đủ 3 item, tổng tạm tính theo `cachedPriceSnapshot` |
| 2 | User chưa từng có giỏ | Gọi `GET /v1/cart` | Hệ thống tạo `Cart` rỗng (upsert theo `userId`), trả giỏ rỗng |
| 3 | User A gọi `GET /v1/cart` | Token thuộc user A | Không bao giờ trả `Cart` của user B, kể cả truyền `cartId` khác trong query |

### REQ-CRT-002 — Thêm sản phẩm vào giỏ

**Nguồn:** `FEAT-CRT-002`
**Ưu tiên:** P0

KHI user gọi `POST /v1/cart/items` với `variantId` và `quantity` hợp lệ, HỆ THỐNG PHẢI tạo hoặc cộng dồn
`CartItem` theo khoá duy nhất `(cartId, variantId)`, lưu `cachedPriceSnapshot` từ giá hiện tại của biến thể.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ chưa có `variantId` X | Thêm X với `quantity = 2` | Tạo `CartItem` mới, `quantity = 2` |
| 2 | Giỏ đã có `variantId` X với `quantity = 2` | Thêm X với `quantity = 1` | Cộng dồn thành `quantity = 3`, không tạo dòng mới |
| 3 | `quantity` gửi lên = 0 hoặc âm | Gọi `POST /v1/cart/items` | Từ chối `400`, không tạo/sửa `CartItem` |

### REQ-CRT-003 — Thêm sản phẩm vượt tồn kho khả dụng

**Nguồn:** `FEAT-CRT-002`
**Ưu tiên:** P1

NẾU `quantity` sau khi cộng dồn vượt quá `available` mà `catalog-service` báo qua RPC `catalog.getVariantSnapshot`,
THÌ HỆ THỐNG PHẢI từ chối thao tác, trả về `available` hiện tại, và không sửa `CartItem`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `available` của biến thể là 5, giỏ đang có 3 | Thêm 4 (tổng 7) | Từ chối, trả `available = 5`, giỏ vẫn giữ 3 |
| 2 | `available = 0` | Thêm bất kỳ số lượng nào | Từ chối, đánh dấu biến thể hết hàng cho FE hiển thị |

### REQ-CRT-004 — Sửa số lượng item trong giỏ

**Nguồn:** `FEAT-CRT-002`
**Ưu tiên:** P0

KHI user gọi `PATCH /v1/cart/items/:itemId` với `quantity` mới, HỆ THỐNG PHẢI cập nhật đúng `CartItem` đó nếu
thuộc giỏ của user gọi, và trả `404` nếu `itemId` không thuộc giỏ của user.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Item thuộc giỏ user A | User A sửa `quantity` từ 2 thành 5 | Cập nhật thành công, `updatedAt` đổi |
| 2 | Item thuộc giỏ user A | User B gọi sửa item đó | Trả `404` (không tiết lộ item tồn tại) |
| 3 | `quantity` mới = 0 | Gọi `PATCH` | Từ chối `400`, hướng dẫn dùng `DELETE` để xoá |

### REQ-CRT-005 — Xoá item khỏi giỏ

**Nguồn:** `FEAT-CRT-002`
**Ưu tiên:** P0

KHI user gọi `DELETE /v1/cart/items/:itemId` cho item thuộc giỏ của chính mình, HỆ THỐNG PHẢI xoá cứng
`CartItem` đó và trả `204`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Item thuộc giỏ user A | User A xoá | Item biến mất khỏi `GET /v1/cart` tiếp theo |
| 2 | Item không tồn tại hoặc thuộc user khác | Gọi xoá | Trả `404` |

## 2. Giỏ khách vãng lai

### REQ-CRT-006 — Giỏ hàng cho khách chưa đăng nhập

**Nguồn:** `FEAT-CRT-003`
**Ưu tiên:** P1

NƠI CÓ khách chưa đăng nhập, HỆ THỐNG PHẢI cho phép thêm/sửa/xoá item vào giỏ tạm lưu **chỉ ở Redis**, khoá theo
`guestId` (cookie/token ẩn danh), TTL 7 ngày, không ghi vào `cart_db`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Khách chưa đăng nhập, chưa có `guestId` | Thêm item đầu tiên | Hệ thống sinh `guestId`, tạo giỏ Redis, TTL 7 ngày |
| 2 | Giỏ khách không hoạt động 7 ngày | Bất kỳ lúc nào sau đó | Redis tự hết TTL, giỏ mất, không có bản sao lưu |

### REQ-CRT-007 — Gộp giỏ khi đăng nhập

**Nguồn:** `FEAT-CRT-003`
**Ưu tiên:** P1

KHI khách vãng lai có giỏ Redis đăng nhập thành công, HỆ THỐNG PHẢI gộp item từ giỏ khách vào `Cart` bền vững
của user qua RPC `cart.merge`: cộng dồn số lượng theo `variantId` trùng, giữ nguyên item không trùng, rồi xoá
giỏ Redis của khách.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ khách có variant X (qty 2), giỏ user có X (qty 1) | Đăng nhập | Giỏ user có X (qty 3), giỏ khách bị xoá |
| 2 | Giỏ khách có variant Y, giỏ user chưa có Y | Đăng nhập | Giỏ user thêm `CartItem` Y mới |
| 3 | Giỏ khách trống hoặc đã hết TTL | Đăng nhập | Không gộp gì, không lỗi |

## 3. Nhóm theo shop và kiểm tra lại trước checkout

### REQ-CRT-008 — Nhóm giỏ theo shop

**Nguồn:** `FEAT-CRT-004`
**Ưu tiên:** P0

HỆ THỐNG PHẢI nhóm `CartItem` theo shop sở hữu `productId` (tra qua `catalog-service`) khi trả `GET /v1/cart`
và khi kiểm tra lại giỏ, để mỗi nhóm shop tương ứng đúng một đơn con khi tạo đơn.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ có item của shop A và shop B | Gọi `GET /v1/cart` | Kết quả trả 2 nhóm, mỗi nhóm kèm tổng tiền riêng |

### REQ-CRT-009 — Kiểm tra lại giỏ trước checkout

**Nguồn:** `FEAT-CRT-005`
**Ưu tiên:** P0

KHI user gọi `POST /v1/cart/validate` (bắt đầu checkout), HỆ THỐNG PHẢI gọi RPC `catalog.getVariantSnapshot`
cho từng `variantId` trong giỏ để lấy lại giá thật, trạng thái sản phẩm, và `available`, rồi trả về danh sách
item hợp lệ/không hợp lệ — **không** dùng `cachedPriceSnapshot` để tính tổng tiền cuối cùng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Toàn bộ item còn bán, đủ tồn, giá không đổi | Gọi `POST /v1/cart/validate` | Trả `valid = true`, tổng tiền theo giá thật vừa lấy |
| 2 | Một item hết tồn | Gọi `POST /v1/cart/validate` | Trả `valid = false`, item đó có `invalidReason = OUT_OF_STOCK` |

### REQ-CRT-010 — Sản phẩm ngừng bán hoặc hết hàng khi checkout

**Nguồn:** `FEAT-CRT-005`
**Ưu tiên:** P0

NẾU một `CartItem` tham chiếu tới sản phẩm đã bị `product.deactivated`, bị từ chối duyệt, hoặc `available < quantity`
tại thời điểm `POST /v1/cart/validate`, THÌ HỆ THỐNG PHẢI đánh dấu `isValid = false` kèm `invalidReason` tương ứng
(`PRODUCT_DEACTIVATED` / `OUT_OF_STOCK`), loại item đó khỏi tổng tiền tạm tính, và chặn không cho tiếp tục tạo đơn
cho tới khi user tự xoá hoặc sửa số lượng item đó.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Item bị `product.deactivated` từ trước (consumer đã cập nhật `isValid = false`) | Gọi `POST /v1/cart/validate` | Item xuất hiện trong danh sách `invalidItems`, không tính vào tổng tiền |
| 2 | Item còn hoạt động lúc mở giỏ nhưng vừa hết tồn ngay khi validate | Gọi `POST /v1/cart/validate` | Item chuyển `invalidReason = OUT_OF_STOCK` ngay trong response, không cần chờ event |
| 3 | Còn `invalidItems` trong giỏ | User cố gọi tiếp `POST /v1/orders/from-cart` | `order-service` từ chối `422`, liệt kê item chặn |

### REQ-CRT-011 — Giá sản phẩm thay đổi khi checkout

**Nguồn:** `FEAT-CRT-005`
**Ưu tiên:** P0

NẾU giá thật lấy qua RPC lúc `POST /v1/cart/validate` khác với `cachedPriceSnapshot` đã lưu, THÌ HỆ THỐNG PHẢI
báo cho user biết giá đã đổi (giá cũ, giá mới), cập nhật lại `cachedPriceSnapshot`, và yêu cầu user xác nhận lại
trước khi cho phép gọi `POST /v1/orders/from-cart`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `cachedPriceSnapshot = 100.000`, giá thật hiện tại `120.000` | Gọi `POST /v1/cart/validate` | Trả `priceChanged = true` kèm giá cũ/mới, cập nhật `cachedPriceSnapshot = 120.000` |
| 2 | Giá thật không đổi | Gọi `POST /v1/cart/validate` | `priceChanged = false`, không ghi lại `CartItem` |

### REQ-CRT-012 — Chốt ảnh giá tại thời điểm tạo đơn

**Nguồn:** `FEAT-CRT-006`
**Ưu tiên:** P0

HỆ THỐNG PHẢI chốt giá cuối cùng (price snapshot) vào `OrderItem` tại đúng thời điểm `order-service` tạo đơn từ
giỏ đã validate — không phải tại thời điểm thêm vào giỏ. `cachedPriceSnapshot` trong `CartItem` chỉ để hiển thị
nhanh, không tự động đồng bộ theo giá catalog và không được dùng làm giá chốt của đơn.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ đã validate thành công, giá xác nhận 120.000 | `order-service` tạo `Order` | `OrderItem.priceSnapshot = 120.000`, không đọc lại `cachedPriceSnapshot` cũ |
| 2 | Giữa lúc validate và lúc thực sự tạo đơn, giá đổi lần nữa | `order-service` gọi lại RPC lúc tạo đơn | Dùng giá mới nhất tại thời điểm tạo đơn, không dùng giá đã validate trước đó nếu lệch |

## 4. Voucher và phương thức thanh toán

### REQ-CRT-013 — Áp voucher, xem trước số tiền giảm

**Nguồn:** `FEAT-CRT-007`
**Ưu tiên:** P0

KHI user gọi `POST /v1/cart/vouchers/preview` với mã voucher, HỆ THỐNG PHẢI gọi RPC sang `promotion-service` để
kiểm tra điều kiện áp dụng và trả về số tiền giảm dự kiến trên tổng giỏ hàng đã validate, không trừ lượt dùng
voucher ở bước này.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Voucher hợp lệ, đủ điều kiện đơn tối thiểu | Gọi preview | Trả số tiền giảm dạng chuỗi + `currency`, không đổi trạng thái voucher |
| 2 | Voucher hết lượt hoặc hết hạn | Gọi preview | Trả lỗi rõ lý do, số tiền giảm = 0 |

### REQ-CRT-014 — Voucher không còn hợp lệ lúc khởi tạo checkout

**Nguồn:** `FEAT-CRT-007`
**Ưu tiên:** P1

NẾU voucher đã chọn hết hiệu lực hoặc hết lượt giữa lúc preview và lúc thực sự gọi `POST /v1/orders/from-cart`,
THÌ HỆ THỐNG PHẢI từ chối khởi tạo đơn với lý do rõ ràng, không âm thầm bỏ qua voucher và tính giá đầy đủ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Voucher hợp lệ lúc preview, hết lượt ngay trước khi tạo đơn | Gọi `POST /v1/orders/from-cart` | Từ chối `422`, báo `VOUCHER_NO_LONGER_VALID`, không tạo đơn với giá sai |

### REQ-CRT-015 — Chọn phương thức thanh toán

**Nguồn:** `FEAT-CRT-008`
**Ưu tiên:** P0

KHI user khởi tạo checkout, HỆ THỐNG PHẢI yêu cầu chọn đúng một phương thức thanh toán trong tập
`{VNPAY, COD}` và truyền kèm sang `order-service`; thiếu phương thức thì không cho tiếp tục.

| # | Given | When | Then |
|---|---|---|---|
| 1 | User chọn `VNPAY` | Gọi `POST /v1/orders/from-cart` | `paymentMethod = VNPAY` được ghi vào yêu cầu tạo đơn |
| 2 | Không truyền `paymentMethod` | Gọi `POST /v1/orders/from-cart` | Từ chối `400` |

## 5. Khởi tạo checkout

### REQ-CRT-016 — Khởi tạo checkout với Idempotency-Key

**Nguồn:** `FEAT-CRT-009`
**Ưu tiên:** P0

KHI user đã có giỏ hợp lệ (không còn `invalidItems`, giá đã xác nhận lại), gọi `POST /v1/orders/from-cart` với
header `Idempotency-Key`, HỆ THỐNG PHẢI dùng key đó để đảm bảo bấm lặp lại (double-submit) không tạo đơn trùng,
trước khi chuyển sang phần saga tạo đơn của `order-fulfillment`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Gửi cùng `Idempotency-Key` 2 lần liên tiếp trong 24h | Cả 2 request cùng thân bài | Chỉ một lần tạo đơn thật, lần 2 trả lại đúng kết quả lần 1 |
| 2 | Gửi `Idempotency-Key` đã dùng nhưng thân bài request khác | Gọi lại | Từ chối `409` — key trùng nhưng payload khác |
| 3 | Không có header `Idempotency-Key` | Gọi `POST /v1/orders/from-cart` | Từ chối `400` |

### REQ-CRT-017 — Order-service từ chối hoặc lỗi khi khởi tạo saga

**Nguồn:** `FEAT-CRT-009`
**Ưu tiên:** P0

NẾU `order-service` trả lỗi (giỏ không hợp lệ, RPC `cart.validate` timeout, hoặc từ chối nghiệp vụ) khi khởi tạo
checkout, THÌ HỆ THỐNG PHẢI giữ nguyên giỏ hàng của user (không xoá item), trả lỗi rõ nguyên nhân cho FE, và
không phát bất kỳ event nào coi như đơn đã được tạo.

| # | Given | When | Then |
|---|---|---|---|
| 1 | RPC `cart.validate` timeout (> 3.000 ms, đã retry 2 lần đọc) | `order-service` gọi `cart.validate` | Trả `503` kèm `retryAfter`, giỏ hàng không đổi |
| 2 | Giỏ hợp lệ nhưng `order-service` từ chối vì lý do nghiệp vụ khác | Gọi `POST /v1/orders/from-cart` | Giỏ hàng giữ nguyên toàn bộ item, user có thể thử lại |

## 6. Lưu để mua sau và nhắc giỏ bỏ quên

### REQ-CRT-018 — Lưu giỏ để mua sau

**Nguồn:** `FEAT-CRT-010`
**Ưu tiên:** P2

NƠI CÓ item được đánh dấu lưu để mua sau, HỆ THỐNG PHẢI đặt `CartItem.savedForLater = true`, loại item đó khỏi
tổng tiền checkout và khỏi kiểm tra `POST /v1/cart/validate`, nhưng vẫn giữ trong cùng `Cart` để hiển thị lại.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Item đang trong giỏ checkout | Gọi `PATCH /v1/cart/items/:itemId` với `savedForLater = true` | Item chuyển sang danh sách "lưu để mua sau", không còn tính vào tổng tiền |
| 2 | Item đã lưu để mua sau | Gọi `PATCH` với `savedForLater = false` | Item quay lại giỏ checkout bình thường |

### REQ-CRT-019 — Nhắc giỏ hàng bỏ quên qua email

**Nguồn:** `FEAT-CRT-011`
**Ưu tiên:** P2

TRONG KHI một `Cart` có ít nhất một item không `savedForLater`, không đổi trong 24 giờ, và user có bật nhận
thông báo marketing, HỆ THỐNG PHẢI phát `EVT-cart.abandoned` để `notification-service` gửi email nhắc, tối đa
một lần nhắc cho mỗi giai đoạn bỏ quên.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Giỏ không đổi 24h, có item chưa `savedForLater` | Job quét giỏ bỏ quên chạy | Phát đúng một `cart.abandoned`, `notification-service` gửi mail |
| 2 | Giỏ đã được nhắc trong 24h gần nhất | Job quét chạy lại | Không phát lại `cart.abandoned` cho cùng giỏ |
| 3 | User đã tắt nhận thông báo marketing | Job quét chạy | Không phát `cart.abandoned` cho giỏ của user đó |

## 7. Tự kiểm phủ FEAT

| FEAT | REQ phủ |
|---|---|
| `FEAT-CRT-001` | `REQ-CRT-001` |
| `FEAT-CRT-002` | `REQ-CRT-002`, `REQ-CRT-003`, `REQ-CRT-004`, `REQ-CRT-005` |
| `FEAT-CRT-003` | `REQ-CRT-006`, `REQ-CRT-007` |
| `FEAT-CRT-004` | `REQ-CRT-008` |
| `FEAT-CRT-005` | `REQ-CRT-009`, `REQ-CRT-010`, `REQ-CRT-011` |
| `FEAT-CRT-006` | `REQ-CRT-012` |
| `FEAT-CRT-007` | `REQ-CRT-013`, `REQ-CRT-014` |
| `FEAT-CRT-008` | `REQ-CRT-015` |
| `FEAT-CRT-009` | `REQ-CRT-016`, `REQ-CRT-017` |
| `FEAT-CRT-010` | `REQ-CRT-018` |
| `FEAT-CRT-011` | `REQ-CRT-019` |
