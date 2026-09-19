---
title: Requirements — inventory
status: draft
owner: Backend Lead
updated: 2026-09-19
related: [docs/00-overview/feature-inventory.md, docs/01-architecture/concurrency-and-consistency.md, docs/02-domain/product-variant.md, docs/02-domain/schemas/catalog-service.prisma.md, docs/01-architecture/event-catalog.md, docs/03-specs/inventory/design.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# Requirements — `inventory`

> Domain **mới hoàn toàn**, là module `catalog` trong `backend/apps/api`, dùng chung một database Postgres với
> mọi module khác — không tách module riêng vì reserve tồn kho và kiểm giá phải chạy trong cùng một
> `$transaction` Prisma với việc tạo đơn ([ADR-0015](../../01-architecture/adr/ADR-0015-modular-monolith.md)).
> Mục tiêu chính: chặn oversell khi flash sale, thứ mà mô hình trừ kho trực tiếp của bản cũ không làm được.

Mã domain: `INV`. Nguồn feature: [feature-inventory.md §6](../../00-overview/feature-inventory.md).

---

## 1. Xem và tồn kho theo variant

### REQ-INV-001 — Xem tồn kho tách `onHand` / `reserved` / `available`

**Nguồn:** `FEAT-INV-001`
**Ưu tiên:** P0

HỆ THỐNG PHẢI lưu tồn kho của mỗi `ProductVariant` dưới dạng `onHand` (tổng vật lý) và `reserved` (đang giữ chỗ),
và tính `available = onHand - reserved` khi trả về API, không lưu `available` thành cột riêng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant có `onHand = 40`, `reserved = 3` | Seller xem chi tiết tồn kho | Trả về `onHand = 40`, `reserved = 3`, `available = 37` |
| 2 | Variant chưa có `InventoryItem` (mới tạo product) | Hệ thống tạo variant | Tự tạo `InventoryItem` với `onHand = 0`, `reserved = 0` trong cùng transaction tạo variant |
| 3 | Admin gọi API tồn kho toàn sàn | Yêu cầu `GET /admin/inventory` | Trả tồn kho của mọi shop, không giới hạn theo `shopId` (scope `:any`) |

---

## 2. Reserve tồn kho khi tạo đơn

### REQ-INV-002 — Reserve tồn kho khi đơn được tạo

**Nguồn:** `FEAT-INV-002`
**Ưu tiên:** P0

KHI module `order` gọi `InventoryService.reserve()` qua DI (trong cùng `$transaction` Prisma với việc tạo đơn) với
danh sách `(variantId, quantity)` và `orderId`, HỆ THỐNG PHẢI tạo một `StockReservation` trạng thái `HELD` với
`expiresAt = now() + 15 phút`, tăng `reserved` của từng variant bằng đúng một câu `UPDATE … WHERE` nguyên tử cho
mỗi dòng, và phát `EVT-inventory.reserved`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant `available = 10` | Reserve `quantity = 3` | `reserved` tăng thêm 3, tạo `StockReservation(HELD, expiresAt = +15p)`, phát `inventory.reserved` |
| 2 | Đơn có 3 variant, đủ hàng cả ba | Reserve cả 3 dòng | Cả 3 `UPDATE` thành công trong cùng transaction, một `StockReservation` cha chứa 3 `StockReservationItem` |
| 3 | `InventoryService.reserve()` được gọi lại với cùng `orderId` (client gửi lại request tạo đơn, ví dụ do timeout) | Reserve lần 2 | Không tạo `StockReservation` thứ hai — nhận diện qua `StockReservation.orderId` unique, trả lại reservation đã có |

### REQ-INV-003 — Unwanted: tồn kho không đủ khi reserve

**Nguồn:** `FEAT-INV-002`, `FEAT-INV-010`
**Ưu tiên:** P0

NẾU tại thời điểm reserve có ít nhất một variant có `available < quantity` yêu cầu, THÌ HỆ THỐNG PHẢI không tạo
`StockReservation`, không thay đổi `reserved` của bất kỳ variant nào trong đơn (toàn bộ hoặc không gì cả), và
phát `EVT-inventory.reserve-failed` kèm danh sách variant thiếu hàng và số lượng khả dụng thực tế.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant A đủ hàng, variant B `available = 1` nhưng đơn cần 2 | Reserve cả đơn | Không dòng nào bị trừ `reserved`, phát `inventory.reserve-failed` với `failedItems = [{variantId: B, requested: 2, available: 1}]` |
| 2 | Variant `available = 0` (đã bán hết) | Reserve | Trả `OUT_OF_STOCK`, `order-service` chuyển đơn sang `CANCELLED` |
| 3 | Variant bị seller ngừng kinh doanh (`isActive = false`) | Reserve | Trả lỗi `VARIANT_INACTIVE`, không đọc tới `available` |

### REQ-INV-004 — Unwanted: race condition hai người mua cùng lúc

**Nguồn:** `FEAT-INV-002`, `FEAT-INV-010`
**Ưu tiên:** P0

NẾU hai request reserve cùng một variant chỉ còn đúng một đơn vị `available` đến gần như đồng thời, THÌ HỆ THỐNG
PHẢI đảm bảo đúng **một** request trừ được `reserved` thành công và request còn lại nhận lỗi `OUT_OF_STOCK`, bằng
câu lệnh `UPDATE "InventoryItem" SET reserved = reserved + qty WHERE variantId = ? AND onHand - reserved >= qty`
— **không** dùng khoá Redis, **không** đọc trước rồi so sánh ở tầng ứng dụng
(xem [concurrency-and-consistency.md §2.1](../../01-architecture/concurrency-and-consistency.md)).

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant `onHand = 1, reserved = 0` | Hai request reserve `quantity = 1` gửi song song | Đúng 1 request có `rowCount = 1` (thành công), request kia có `rowCount = 0` → `409 OUT_OF_STOCK` |
| 2 | Test tải 50 request song song vào 1 variant có `available = 1` | Chạy `Promise.all` | Đúng 1 thành công, 49 nhận `409`, không có `available` âm |
| 3 | Đơn nhiều dòng variant | Reserve | Khoá các variant theo thứ tự `variantId` tăng dần để tránh deadlock chéo |

### REQ-INV-005 — Tự động hết hạn giữ chỗ

**Nguồn:** `FEAT-INV-002`, `FEAT-INV-004`
**Ưu tiên:** P0

TRONG KHI một `StockReservation` ở trạng thái `HELD` và đã qua `expiresAt`, HỆ THỐNG PHẢI tự động release trong
job chạy mỗi phút — giảm `reserved` đúng bằng số đã giữ, chuyển `StockReservation` sang `RELEASED`, ghi
`InventoryLedger`, và phát `EVT-inventory.released`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `StockReservation` `HELD`, `expiresAt` đã qua 2 phút, đơn chưa thanh toán | Job chạy | `reserved` giảm về đúng số đã giữ, trạng thái thành `RELEASED`, phát `inventory.released` |
| 2 | `StockReservation` `HELD`, còn 5 phút mới hết hạn | Job chạy | Không đụng tới bản ghi này |
| 3 | Người dùng đóng trình duyệt giữa chừng, không huỷ đơn tường minh | Sau 15 phút | Tồn kho vẫn được giải phóng đúng hạn, không bị giữ vĩnh viễn |

### REQ-INV-006 — Unwanted: hết hạn giữ chỗ không được release nhầm reservation đã commit

**Nguồn:** `FEAT-INV-002`, `FEAT-INV-003`, `FEAT-INV-004`
**Ưu tiên:** P0

NẾU job hết hạn quét tới một `StockReservation` đã chuyển sang `COMMITTED` (do thanh toán thành công xảy ra gần
đúng lúc hết hạn), THÌ HỆ THỐNG PHẢI bỏ qua bản ghi đó — điều kiện release chỉ khớp `status = 'HELD' AND expiresAt
< now()`, không release theo `reservedDelta` mù. Release phải **idempotent**: gọi hai lần chỉ có tác dụng một lần.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `StockReservation` chuyển `HELD → COMMITTED` đúng lúc job hết hạn quét tới | Job chạy cùng lúc lời gọi `InventoryService.commit()` | Job không release — `UPDATE StockReservation SET status = 'RELEASED' WHERE id = ? AND status = 'HELD'` trả `rowCount = 0` |
| 2 | `InventoryService.release()` được gọi hai lần cho cùng `orderId` (huỷ đơn + job hết hạn cùng chạy) | Cả hai đường gọi tới | Chỉ lần đầu làm giảm `reserved`; lần sau kiểm `status` đã là `RELEASED`, trả về thành công không đổi gì thêm |
| 3 | `StockReservation` đã `RELEASED` | Đơn bị huỷ lại lần nữa (webhook lặp) | Không giảm `reserved` thêm lần nữa, không ghi `InventoryLedger` trùng |

---

## 3. Commit khi thanh toán thành công

### REQ-INV-007 — Commit tồn kho khi thanh toán thành công

**Nguồn:** `FEAT-INV-003`
**Ưu tiên:** P0

KHI module `order` gọi `InventoryService.commit()` qua DI với `orderId` sau khi nhận `EVT-payment.succeeded` (từ
module `payment-vnpay`, qua `EventEmitter2` hoặc lời gọi trực tiếp), HỆ THỐNG PHẢI trừ vĩnh viễn: `onHand -= qty`,
`reserved -= qty` cho từng dòng bằng `UPDATE … WHERE` nguyên tử, chuyển `StockReservation` từ `HELD` sang
`COMMITTED`, ghi `InventoryLedger` (`changeType = COMMIT`), và phát `EVT-inventory.committed`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `StockReservation` `HELD` với 2 dòng variant | Commit | `onHand` và `reserved` cùng giảm đúng số lượng mỗi dòng, trạng thái thành `COMMITTED`, phát `inventory.committed` |
| 2 | Commit làm `available` tính lại không đổi (`onHand` và `reserved` giảm cùng lúc) | Kiểm tra sau commit | `available` trước và sau commit bằng nhau, chỉ `onHand` giảm thật |

### REQ-INV-008 — Unwanted: commit lặp lại không trừ kho hai lần

**Nguồn:** `FEAT-INV-003`
**Ưu tiên:** P0

NẾU `InventoryService.commit()` được gọi trùng, hoặc listener của `EVT-payment.succeeded` chạy lại cho cùng
`orderId` (VNPay gửi lại IPN nhiều lần), THÌ HỆ THỐNG PHẢI không trừ `onHand` thêm lần nữa — kiểm
`StockReservation.status` trước khi commit,
`status != 'HELD'` thì trả kết quả cũ, ghi vào `InventoryLedger` bằng `referenceKey = orderId:commit` unique.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `StockReservation` đã `COMMITTED` | Gọi `inventory.commit` lại với cùng `orderId` | Không trừ thêm `onHand`, trả về idempotent success |
| 2 | Ghi `InventoryLedger` với `referenceKey = orderId:commit` đã tồn tại | Insert lại | Vi phạm `@@unique([variantId, referenceKey, changeType])`, bắt lỗi `P2002` và bỏ qua, không văng `500` |

---

## 4. Release khi huỷ / hết hạn / hoàn tiền

### REQ-INV-009 — Release tồn kho khi huỷ đơn hoặc hoàn tiền

**Nguồn:** `FEAT-INV-004`
**Ưu tiên:** P0

KHI module `order` gọi `InventoryService.release()` qua DI do đơn bị huỷ trước khi thanh toán, hoặc do
`EVT-payment.refunded` sau khi đã commit, HỆ THỐNG PHẢI cộng lại đúng số lượng đã giữ/đã trừ: nếu `StockReservation` đang `HELD` thì giảm
`reserved`; nếu đã `COMMITTED` (hoàn hàng) thì cộng lại `onHand`, ghi `InventoryLedger` (`changeType = RELEASE`),
và phát `EVT-inventory.released`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn `HELD`, người mua huỷ trước khi thanh toán | Release | `reserved` giảm về mức trước reserve, `StockReservation` thành `RELEASED`, phát `inventory.released` |
| 2 | Đơn `COMMITTED`, hoàn tiền toàn phần | Release do hoàn hàng | `onHand` cộng lại đúng số lượng hoàn, ghi ledger `RELEASE` với `onHandDelta` dương |
| 3 | Đơn hoàn một phần | Release một phần số lượng | Chỉ dòng variant và số lượng được hoàn mới cộng lại, các dòng khác giữ nguyên |

### REQ-INV-010 — Unwanted: release gọi lặp chỉ có tác dụng một lần

**Nguồn:** `FEAT-INV-004`
**Ưu tiên:** P0

NẾU `InventoryService.release()` được gọi nhiều lần cho cùng `orderId` (xử lý lại sự kiện `order.cancelled`, job
hết hạn và huỷ tay trùng thời điểm), THÌ HỆ THỐNG PHẢI chỉ cộng lại tồn kho đúng một lần — điều kiện `UPDATE` kiểm
`status IN ('HELD', 'COMMITTED')` trước khi chuyển `RELEASED`, lần gọi sau trả `rowCount = 0` và coi là thành công
không đổi gì thêm.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `StockReservation` đã `RELEASED` | Gọi lại `inventory.release` | Không cộng thêm `reserved`/`onHand`, không ghi `InventoryLedger` trùng, trả `200` |
| 2 | Job hết hạn và huỷ tay chạy gần như đồng thời trên cùng đơn | Cả hai cùng gọi release | Chỉ một trong hai thắng qua `UPDATE … WHERE status IN (...)`, bên còn lại no-op |

---

## 5. Nhật ký biến động tồn kho

### REQ-INV-011 — Ghi `InventoryLedger` bất biến cho mọi biến động

**Nguồn:** `FEAT-INV-005`
**Ưu tiên:** P0

HỆ THỐNG PHẢI ghi một dòng `InventoryLedger` trong **cùng transaction** với mọi thay đổi `onHand`/`reserved`
(`RESERVE`, `COMMIT`, `RELEASE`, `ADJUST_MANUAL`, `ADJUST_RECONCILE`), lưu `onHandAfter`/`reservedAfter` là số dư
sau thay đổi. `InventoryLedger` chỉ `INSERT`, không bao giờ `UPDATE` hay `DELETE`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Reserve thành công | Sau transaction | Có đúng 1 dòng `InventoryLedger` mới với `changeType = RESERVE`, `reservedDelta > 0` |
| 2 | Seller xem lịch sử biến động của một variant | Gọi API ledger | Trả danh sách sắp theo `createdAt` giảm dần, không sửa được từng dòng |
| 3 | Cùng thao tác nguồn gọi lại (idempotency) | Insert ledger với `referenceKey` đã tồn tại | Bị chặn bởi unique index, không tạo dòng trùng |

---

## 6. Điều chỉnh tồn thủ công

### REQ-INV-012 — Điều chỉnh tồn thủ công kèm lý do

**Nguồn:** `FEAT-INV-006`
**Ưu tiên:** P1

KHI seller gửi yêu cầu điều chỉnh `onHand` của một variant thuộc shop mình kèm `reason` bắt buộc, HỆ THỐNG PHẢI
cập nhật `onHand` bằng `UPDATE … WHERE` nguyên tử, ghi `InventoryLedger` (`changeType = ADJUST_MANUAL`,
`actorId = userId`, `reason`), và phát `EVT-inventory.adjusted`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Seller nhập hàng thêm 20 đơn vị, lý do "Nhập kho đợt mới" | Gửi điều chỉnh `+20` | `onHand` tăng 20, ledger ghi `onHandDelta = +20`, `reason` lưu đúng, phát `inventory.adjusted` |
| 2 | Seller không nhập `reason` | Gửi điều chỉnh | Zod validation chặn ở tầng contract, trả `400`, không tới được DB |
| 3 | Seller gửi điều chỉnh cho variant của shop khác | Gửi điều chỉnh | Trả `404` (ngoài phạm vi dữ liệu, không phải `403`) |

### REQ-INV-013 — Unwanted: điều chỉnh phá vỡ bất biến tồn kho

**Nguồn:** `FEAT-INV-006`, `FEAT-INV-010`
**Ưu tiên:** P0

NẾU điều chỉnh khiến `onHand < 0` hoặc `onHand < reserved` (giảm tồn thấp hơn số đang giữ chỗ cho đơn chưa thanh
toán), THÌ HỆ THỐNG PHẢI từ chối, trả `409 INVENTORY_ADJUST_INVALID`, không thay đổi gì và không ghi ledger — ràng
buộc `CHECK ("onHand" >= 0 AND "reserved" <= "onHand")` là lớp chặn cuối ở tầng DB.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `onHand = 5, reserved = 3` | Seller điều chỉnh `onHand = -10` (giảm 15) | `UPDATE` vi phạm `CHECK`, transaction rollback, trả `409` |
| 2 | `onHand = 10, reserved = 8` | Seller điều chỉnh `onHand = 5` (thấp hơn `reserved`) | Bị chặn bởi `CHECK reserved <= onHand`, trả `409 INVENTORY_ADJUST_INVALID` |

---

## 7. Cảnh báo sắp hết hàng

### REQ-INV-014 — Cảnh báo khi tồn khả dụng chạm ngưỡng

**Nguồn:** `FEAT-INV-007`
**Ưu tiên:** P1

TRONG KHI `available` của một variant giảm xuống bằng hoặc dưới `lowStockThreshold` sau bất kỳ biến động nào
(`RESERVE`, `COMMIT`, `ADJUST_MANUAL`), HỆ THỐNG PHẢI phát `EVT-inventory.low-stock` đúng một lần cho lần đầu
chạm ngưỡng, không phát lặp lại cho tới khi `available` phục hồi lên trên ngưỡng rồi lại giảm xuống.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `lowStockThreshold = 5`, `available` giảm từ 6 xuống 5 | Sau reserve | Phát `inventory.low-stock`, `notification-service` gửi email/in-app cho seller |
| 2 | `available` giảm tiếp từ 5 xuống 3 | Sau reserve tiếp | Không phát lại `inventory.low-stock` (đã cảnh báo ở lần chạm ngưỡng trước) |
| 3 | `available` phục hồi lên 8 rồi giảm lại xuống 4 | Hai lần giảm cách nhau | Phát `inventory.low-stock` lại đúng một lần cho lần chạm ngưỡng thứ hai |

---

## 8. Tồn kho flash sale

### REQ-INV-015 — Tồn kho riêng cho campaign flash sale

**Nguồn:** `FEAT-INV-008`
**Ưu tiên:** P1

NƠI CÓ variant được gắn vào một `PromotionCampaign` đang `ACTIVE` với `limitQty` riêng, HỆ THỐNG PHẢI kiểm và trừ
theo hạn mức campaign (`Campaign.soldQty`, ở `promotion-service`) **trước**, chỉ gọi `inventory.reserve` của
`catalog-service` sau khi qua được lớp campaign — tồn kho thường (`InventoryItem.onHand`) không bị giữ chỗ thay
cho hạn mức flash sale.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Variant có `limitQty = 100` cho campaign, tồn thường `onHand = 500` | Đặt hàng qua trang flash sale | Trừ theo `Campaign.soldQty` trước (Redis `DECR` lọc, Postgres `UPDATE … WHERE` chốt), reserve tồn kho thường theo REQ-INV-002 sau khi qua được |
| 2 | Campaign đã hết `limitQty` | Đặt hàng qua trang flash sale dù tồn thường còn | Trả `SOLD_OUT` ở lớp campaign, không gọi tới `inventory.reserve` |
| 3 | Campaign kết thúc (`status != ACTIVE`) | Đặt hàng giá thường (ngoài flash sale) | Reserve theo tồn kho thường bình thường, không qua lớp campaign |

---

## 9. Ràng buộc chống bán vượt tồn ở mức DB

### REQ-INV-016 — Ràng buộc `CHECK` là lớp chặn cuối

**Nguồn:** `FEAT-INV-010`
**Ưu tiên:** P0

HỆ THỐNG PHẢI có ràng buộc `CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand")` trên
`InventoryItem` ở tầng migration, độc lập với mọi kiểm tra ở tầng ứng dụng — kể cả khi logic nghiệp vụ có lỗi,
DB vẫn từ chối trạng thái tồn kho âm hoặc `reserved` vượt `onHand`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Một đoạn code mới (do lỗi lập trình) chạy `UPDATE` không kiểm điều kiện | `reserved` sẽ vượt `onHand` | DB từ chối câu lệnh bằng lỗi vi phạm `CHECK`, transaction rollback |
| 2 | Migration được áp dụng | Kiểm tra schema | Ràng buộc tồn tại trên bảng `InventoryItem`, xác nhận bằng test tích hợp cố ý vi phạm |

---

## 10. Báo cáo tồn kho

### REQ-INV-017 — Cung cấp dữ liệu cho báo cáo tồn kho và giá trị tồn

**Nguồn:** `FEAT-INV-009`
**Ưu tiên:** P2

HỆ THỐNG PHẢI cung cấp `InventoryService.getSnapshot()` (gọi qua DI, tồn hiện tại theo variant/shop) và phát đủ
`EVT-inventory.adjusted` / `EVT-inventory.committed` / `EVT-inventory.released` mang giá trị `variantId`,
`onHandAfter`, `reservedAfter` để `analytics-service` tổng hợp báo cáo tồn kho và giá trị tồn (`onHand × price`)
mà không cần query chéo phần schema module `catalog`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `analytics-service` cần tồn kho hiện tại của một shop | Gọi `InventoryService.getSnapshot(shopId)` qua DI | Nhận danh sách `(variantId, onHand, reserved, available)`, không tự ý query chéo bảng của module `catalog` |
| 2 | Biến động tồn kho xảy ra | Sự kiện phát ra | `analytics-service` cập nhật `DailyRollup` từ `onHandAfter` trong payload, không cần gọi lại `getSnapshot()` |

---

## Tự kiểm

- `FEAT-INV-001` → `REQ-INV-001`
- `FEAT-INV-002` → `REQ-INV-002`, `REQ-INV-003`, `REQ-INV-004`, `REQ-INV-005`, `REQ-INV-006`
- `FEAT-INV-003` → `REQ-INV-007`, `REQ-INV-008`
- `FEAT-INV-004` → `REQ-INV-005`, `REQ-INV-006`, `REQ-INV-009`, `REQ-INV-010`
- `FEAT-INV-005` → `REQ-INV-011`
- `FEAT-INV-006` → `REQ-INV-012`, `REQ-INV-013`
- `FEAT-INV-007` → `REQ-INV-014`
- `FEAT-INV-008` → `REQ-INV-015`
- `FEAT-INV-009` → `REQ-INV-017`
- `FEAT-INV-010` → `REQ-INV-003`, `REQ-INV-004`, `REQ-INV-013`, `REQ-INV-016`

Toàn bộ 10 `FEAT-INV-*` đều có ít nhất một `REQ-INV-*`. Không có feature nào bị bỏ sót.
