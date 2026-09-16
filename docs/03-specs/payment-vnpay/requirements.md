---
title: Requirements — payment-vnpay
status: draft
owner: Backend Lead
updated: 2026-09-16
related: [docs/00-overview/feature-inventory.md, docs/01-architecture/service-catalog.md, docs/01-architecture/event-catalog.md, docs/01-architecture/concurrency-and-consistency.md, docs/02-domain/schemas/payment-service.prisma.md, docs/03-specs/payment-vnpay/design.md, docs/03-specs/payment-vnpay/tasks.md]
---

# Requirements — `payment-vnpay` (mã `PAY`)

Phạm vi tài liệu này: tạo URL thanh toán VNPay, xử lý `return` URL, xử lý IPN, thanh toán COD, hoàn tiền, đối soát,
hết hạn thanh toán và thử lại. **Không** đặc tả ví seller/buyer, sổ giao dịch ví, rút tiền hay hoa hồng — các mục đó
thuộc domain `wallet-settlement` (mã `WAL`), spec riêng sau (xem `docs/00-overview/feature-inventory.md` §10).

Mọi requirement dưới đây truy vết về `FEAT-PAY-*` trong
[feature-inventory.md §9](../../00-overview/feature-inventory.md#9-payment-vnpay-thanh-toán).

---

### REQ-PAY-001 — Tạo URL thanh toán VNPay có chữ ký

**Nguồn:** `FEAT-PAY-001`
**Ưu tiên:** P0

KHI người mua chọn phương thức thanh toán VNPay cho một đơn ở trạng thái chờ thanh toán, HỆ THỐNG PHẢI tạo một
`PaymentAttempt` mới với `txnRef` duy nhất, ký `vnp_SecureHash` bằng `VNP_HASH_SECRET`, và trả về URL chuyển hướng
tới cổng VNPay.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn `ORD-001` ở trạng thái chờ thanh toán, chưa có `PaymentAttempt` nào đang `PENDING` | Gọi `POST /payments/vnpay/create-url` kèm `Idempotency-Key` | Trả `200` với URL VNPay hợp lệ, `PaymentAttempt` mới được tạo, `txnRef` duy nhất trong toàn hệ thống |
| 2 | Đơn `ORD-001` đã có `PaymentAttempt` đang `PENDING` chưa hết hạn | Gọi lại `create-url` với cùng đơn | Trả về URL của `PaymentAttempt` đang chờ, **không** tạo `txnRef` mới |
| 3 | Đơn `ORD-002` không tồn tại hoặc không thuộc về người gọi | Gọi `create-url` với `orderId` đó | Trả `404`, không lộ việc đơn có tồn tại hay không |

---

### REQ-PAY-002 — Xử lý `return` URL, chỉ hiển thị

**Nguồn:** `FEAT-PAY-002`
**Ưu tiên:** P0

KHI trình duyệt người dùng được VNPay chuyển hướng về `return` URL, HỆ THỐNG PHẢI xác minh `vnp_SecureHash` của
tham số trả về để hiển thị **tạm thời** kết quả cho người dùng, và HỆ THỐNG PHẢI **không** dùng dữ liệu từ `return`
để chốt trạng thái `Payment` hay đơn hàng.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người dùng thanh toán xong trên VNPay, `vnp_ResponseCode = 00` | VNPay chuyển hướng về `return` với chữ ký hợp lệ | FE hiển thị "Đang xác nhận thanh toán", **không** hiển thị "Thanh toán thành công" cho tới khi có xác nhận từ hệ thống (poll trạng thái `Payment` qua API, nguồn là IPN) |
| 2 | `vnp_SecureHash` trên `return` không khớp | VNPay chuyển hướng về `return` với chữ ký sai | HỆ THỐNG PHẢI hiển thị màn hình lỗi chung chung cho người dùng, ghi log cảnh báo, không chốt bất kỳ trạng thái nào |
| 3 | IPN đã xử lý xong trước khi người dùng quay lại `return` | Người dùng tới `return` sau IPN | Trang `return` đọc trạng thái `Payment` hiện tại (đã `COMPLETED` do IPN) và hiển thị đúng kết quả cuối cùng |

---

### REQ-PAY-003 — Xử lý IPN idempotent, là nguồn sự thật của trạng thái thanh toán

**Nguồn:** `FEAT-PAY-003`, `FEAT-PAY-005`
**Ưu tiên:** P0

KHI VNPay gọi endpoint IPN (`server-to-server`), HỆ THỐNG PHẢI xác minh chữ ký, khoá xử lý theo `vnp_TxnRef`, ghi
`Payment.status`, `PaymentAttempt.status`, `PaymentAttempt.ipnPayload` và `OutboxEvent` trong **cùng một
transaction**, rồi trả về mã phản hồi VNPay yêu cầu (`{RspCode, Message}`).

| # | Given | When | Then |
|---|---|---|---|
| 1 | `PaymentAttempt` đang `PENDING`, IPN có `vnp_ResponseCode = 00`, chữ ký hợp lệ | Nhận IPN lần đầu | `Payment.status → COMPLETED`, `paidAt` được ghi, phát `EVT-payment.succeeded` qua outbox, trả `RspCode = 00` |
| 2 | `PaymentAttempt` đang `PENDING`, IPN có `vnp_ResponseCode ≠ 00` | Nhận IPN báo thất bại | `Payment.status → FAILED`, phát `EVT-payment.failed`, trả `RspCode = 00` (đã nhận, không retry vô ích) |
| 3 | `orderId` trong IPN không khớp số tiền `vnp_Amount` với `Payment.amount` | Nhận IPN có số tiền sai lệch | HỆ THỐNG PHẢI từ chối chốt trạng thái, trả `RspCode = 04` (invalid amount), ghi log cảnh báo đối soát |

---

### REQ-PAY-004 — Chữ ký IPN sai bị từ chối

**Nguồn:** `FEAT-PAY-004`
**Ưu tiên:** P0

NẾU `vnp_SecureHash` của một request IPN không khớp giá trị tính lại bằng `VNP_HASH_SECRET`, THÌ HỆ THỐNG PHẢI từ
chối request, **không** ghi hay đổi bất kỳ `Payment`/`PaymentAttempt` nào, trả `RspCode = 97` (invalid checksum) và
ghi log cảnh báo bảo mật kèm IP nguồn.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Request IPN có đủ tham số nhưng `vnp_SecureHash` bị sửa | Xác minh chữ ký | Trả `RspCode = 97`, không đụng tới DB nghiệp vụ, không phát event |
| 2 | Request IPN thiếu tham số bắt buộc để tính lại chữ ký | Xác minh chữ ký | Trả `RspCode = 99` (unknown error), ghi log, không xử lý tiếp |
| 3 | 50 request IPN với chữ ký sai gửi liên tục từ một IP trong 1 phút | Rate limit ở gateway kích hoạt | IP bị chặn tạm thời theo cấu hình rate limit chung, không ảnh hưởng IPN hợp lệ từ VNPay |

---

### REQ-PAY-005 — IPN đến trùng lặp phải idempotent

**Nguồn:** `FEAT-PAY-003`
**Ưu tiên:** P0

NẾU IPN với `vnp_TxnRef` đã được xử lý xong trước đó (đã có `PaymentAttempt.ipnReceivedAt` khác null hoặc
`Payment.status` đã ở trạng thái cuối), THÌ HỆ THỐNG PHẢI trả cùng mã phản hồi thành công cho VNPay mà **không**
ghi lại `Payment`, **không** phát lại event nghiệp vụ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `PaymentAttempt` với `txnRef = X` đã `COMPLETED`, đã phát `EVT-payment.succeeded` | VNPay gửi lại đúng IPN cho `txnRef = X` lần 2 | Trả `RspCode = 00` ngay, không ghi thêm `WalletTransaction`/event, không đổi `paidAt` |
| 2 | 10 request IPN trùng `vnp_TxnRef = X` gửi song song (retry mạng của VNPay) | Xử lý đồng thời | Đúng **một** request thắng và ghi trạng thái; 9 request còn lại nhận diện đã xử lý (qua unique `vnp_TxnRef` trên `Payment` hoặc khoá theo `txnRef`) và trả thành công mà không ghi trùng |
| 3 | IPN trùng đến nhưng `Payment` đang bị một transaction khác khoá (đang xử lý lần đầu) | Nhận IPN trùng đúng lúc giao dịch đầu chưa commit | HỆ THỐNG PHẢI chờ/khoá theo `vnp_TxnRef` (transaction tuần tự), không tạo hai bản ghi song song, không đọc-rồi-ghi |

---

### REQ-PAY-006 — Người dùng đóng tab trước khi VNPay redirect về

**Nguồn:** `FEAT-PAY-002`, `FEAT-PAY-009`
**Ưu tiên:** P0

NẾU người dùng đóng tab/thoát ứng dụng sau khi đã thanh toán trên VNPay nhưng trước khi `return` URL được tải,
THÌ HỆ THỐNG PHẢI vẫn chốt trạng thái đơn hàng đúng đắn dựa trên IPN (không phụ thuộc `return`), và người dùng phải
xem được kết quả thật khi quay lại trang đơn hàng bất kỳ lúc nào sau đó.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người dùng thanh toán thành công trên VNPay rồi đóng tab ngay, không tới `return` | VNPay vẫn gửi IPN như bình thường | `Payment.status → COMPLETED` qua IPN, đơn chuyển sang trạng thái đã thanh toán; người dùng mở lại trang "Đơn hàng của tôi" thấy đúng trạng thái |
| 2 | Người dùng đóng tab khi đang ở trang chờ chuyển hướng VNPay (chưa thanh toán) | Không có giao dịch nào phát sinh phía VNPay | `PaymentAttempt` giữ nguyên `PENDING` cho tới khi hết hạn (REQ-PAY-007), không có IPN nào tới |
| 3 | Người dùng quay lại đơn hàng bằng trang chi tiết đơn (không qua `return`) trong lúc IPN chưa tới | Truy vấn trạng thái đơn | Hiển thị trạng thái "Đang chờ xác nhận thanh toán", không suy đoán thành công/thất bại |

---

### REQ-PAY-007 — Thanh toán quá hạn (session timeout)

**Nguồn:** `FEAT-PAY-009`
**Ưu tiên:** P0

TRONG KHI một `PaymentAttempt` ở trạng thái `PENDING` quá 15 phút kể từ lúc tạo mà chưa nhận được IPN, HỆ THỐNG
PHẢI tự động chuyển `Payment` sang `FAILED`/hết hạn, phát `EVT-payment.expired`, và phối hợp với `order-service` để
huỷ đơn cùng giải phóng tồn kho đã giữ.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `PaymentAttempt` tạo lúc `T`, đến `T + 15 phút` vẫn `PENDING`, chưa có IPN | Job hết hạn chạy (mỗi phút) | `Payment.status → FAILED`, phát `EVT-payment.expired`, đơn hàng liên quan chuyển `CANCELLED`, tồn kho được release |
| 2 | IPN hợp lệ tới đúng lúc job hết hạn cũng đang xử lý cùng `PaymentAttempt` | Hai tiến trình chạm cùng bản ghi | Khoá theo `txnRef`/trạng thái đảm bảo chỉ một nhánh thắng: nếu IPN tới trước khi job hết hạn commit thì kết quả cuối là `COMPLETED`, không bị job ghi đè thành hết hạn |
| 3 | `PaymentAttempt` đã hết hạn (`FAILED`) nhưng IPN trễ vẫn tới sau đó | Nhận IPN trễ báo thành công | HỆ THỐNG PHẢI ghi log bất thường, **không** tự ý chuyển tiền thành công cho một đơn đã huỷ; xử lý thủ công qua nhật ký đối soát (REQ-PAY-010), không tự động cộng ví |

---

### REQ-PAY-008 — Thanh toán khi nhận hàng (COD)

**Nguồn:** `FEAT-PAY-006`
**Ưu tiên:** P0

NƠI CÓ phương thức thanh toán COD được chọn khi đặt đơn, HỆ THỐNG PHẢI tạo `Payment` với `method = COD`,
`status = PENDING`, không tạo `PaymentAttempt` VNPay, và chuyển `status → COMPLETED` khi `order-service` báo đơn đã
giao thành công và thu tiền.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Người mua chọn COD lúc checkout | Đơn được tạo | `Payment.method = COD`, `Payment.status = PENDING`, không có `vnpayTxnRef` |
| 2 | Đơn COD được giao thành công, shipper xác nhận đã thu tiền | Nhận `order.delivered`/xác nhận thu COD | `Payment.status → COMPLETED`, `paidAt` được ghi, phát `EVT-payment.succeeded` với `provider = COD` |
| 3 | Đơn COD bị huỷ trước khi giao | Đơn chuyển `CANCELLED` | `Payment.status → FAILED`, không phát `EVT-payment.succeeded` |

---

### REQ-PAY-009 — Hoàn tiền (một phần / toàn phần)

**Nguồn:** `FEAT-PAY-007`
**Ưu tiên:** P1

KHI admin phê duyệt yêu cầu hoàn tiền cho một `Payment` đã `COMPLETED`, HỆ THỐNG PHẢI ghi nhận số tiền hoàn (không
vượt quá số đã thanh toán trừ số đã hoàn trước đó), cập nhật `Payment.status` thành `REFUNDED` hoặc
`PARTIALLY_REFUNDED`, và phát `EVT-payment.refunded`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `Payment` `COMPLETED`, số tiền `500,000 VND`, chưa hoàn lần nào | Admin duyệt hoàn `500,000 VND` (toàn phần) | `Payment.status → REFUNDED`, phát `EVT-payment.refunded` với `amount = "500000.00"` |
| 2 | `Payment` `COMPLETED`, `500,000 VND` | Admin duyệt hoàn `200,000 VND` (một phần) | `Payment.status → PARTIALLY_REFUNDED`, tổng đã hoàn được theo dõi, vẫn có thể hoàn thêm tối đa `300,000 VND` |
| 3 | `Payment` đã `REFUNDED` toàn phần | Admin thử duyệt hoàn thêm | HỆ THỐNG PHẢI từ chối với `409`, không tạo bút toán hoàn tiền vượt số đã thu |

> Bút toán ghi có/ghi nợ vào ví thuộc domain `wallet-settlement` — spec sau. Ở đây chỉ đặc tả việc `Payment` ghi
> nhận trạng thái hoàn tiền và phát event; consumer ví xử lý `EVT-payment.refunded` để tạo `WalletTransaction`.

---

### REQ-PAY-010 — Đối soát định kỳ với sao kê VNPay

**Nguồn:** `FEAT-PAY-008`
**Ưu tiên:** P1

TRONG KHI job đối soát hằng ngày chạy, HỆ THỐNG PHẢI tải sao kê giao dịch từ VNPay theo ngày, so khớp từng
`vnp_TxnRef` với `Payment`/`PaymentAttempt` nội bộ, và báo cáo mọi sai lệch (thiếu ở một bên, số tiền khác nhau,
trạng thái khác nhau) cho admin.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Mọi giao dịch trong ngày khớp giữa sao kê VNPay và nội bộ | Job đối soát chạy | Báo cáo "khớp 100%", không cảnh báo |
| 2 | VNPay có một giao dịch thành công nhưng hệ thống chưa từng nhận IPN tương ứng | Job đối soát chạy | Ghi nhận sai lệch loại "thiếu IPN", tạo cảnh báo cho admin xử lý thủ công, **không** tự động cộng tiền |
| 3 | Hệ thống có `Payment.COMPLETED` nhưng VNPay báo giao dịch đó không tồn tại/thất bại | Job đối soát chạy | Ghi nhận sai lệch loại "nghi ngờ gian lận", đánh dấu ưu tiên cao cho admin |

---

### REQ-PAY-011 — Nhật ký giao dịch thanh toán cho admin tra cứu

**Nguồn:** `FEAT-PAY-010`
**Ưu tiên:** P1

HỆ THỐNG PHẢI cung cấp cho admin danh sách `PaymentAttempt` có thể lọc theo `orderId`, `txnRef`, khoảng thời gian,
trạng thái, kèm toàn bộ `ipnPayload` đã nhận để phục vụ tra soát khiếu nại.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Có 3 `PaymentAttempt` cho cùng một đơn (thử lại nhiều lần) | Admin tra cứu theo `orderId` | Trả về cả 3 lần thử, sắp theo thời gian, mỗi bản ghi có trạng thái và `ipnPayload` nếu có |
| 2 | Admin không có quyền `payment:attempt:read:any` | Gọi API tra cứu | Trả `403` (đây là kiểm tra permission, không phải phạm vi dữ liệu — khác với quy tắc `404` cho tài nguyên ngoài phạm vi) |
| 3 | Admin lọc theo khoảng thời gian không có giao dịch nào | Gọi API tra cứu | Trả danh sách rỗng kèm tổng số `0`, không lỗi |

---

### REQ-PAY-012 — Thử lại thanh toán cho đơn chưa thanh toán

**Nguồn:** `FEAT-PAY-011`
**Ưu tiên:** P1

NƠI CÓ đơn ở trạng thái chưa thanh toán (đã hết hạn lần thử trước hoặc lần trước thất bại) và đơn chưa bị huỷ,
HỆ THỐNG PHẢI cho phép người mua tạo một `PaymentAttempt` mới cho cùng `Payment`/`orderId`, dùng `txnRef` mới, giữ
nguyên `Payment.orderId` duy nhất.

| # | Given | When | Then |
|---|---|---|---|
| 1 | `Payment` của đơn `ORD-003` đang `FAILED` (lần thử trước hết hạn), đơn chưa `CANCELLED` | Người mua bấm "Thanh toán lại" | Tạo `PaymentAttempt` mới với `txnRef` mới, `Payment.status → PENDING`, trả URL VNPay mới |
| 2 | Đơn `ORD-003` đã bị huỷ (quá số lần thử hoặc hết hạn xử lý đơn) | Người mua bấm "Thanh toán lại" | Trả `409` với thông báo đơn đã huỷ, không tạo `PaymentAttempt` mới |
| 3 | `Payment` đang `COMPLETED` | Người mua thử gọi API thử lại | Trả `409`, không tạo `PaymentAttempt` trùng cho đơn đã thanh toán |

---

### REQ-PAY-013 — `Idempotency-Key` bắt buộc cho mọi thao tác khởi tạo thanh toán

**Nguồn:** `FEAT-PAY-001`, `FEAT-PAY-006`, `FEAT-PAY-011`

**Ưu tiên:** P0

HỆ THỐNG PHẢI yêu cầu header `Idempotency-Key` trên `create-payment-url`, khởi tạo `Payment` COD, và thử lại thanh
toán; theo luật cứng #5 (`CLAUDE.md`), bấm đúp hoặc gửi lại request do mất mạng **không** được tạo thêm giao dịch.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Client gửi `POST create-payment-url` với `Idempotency-Key = K` lần đầu | Xử lý thành công | Lưu `(K, userId, hash(body)) → response`, trả `200` |
| 2 | Client gửi lại đúng `Idempotency-Key = K`, cùng nội dung, trong TTL | Xử lý lần 2 | Trả lại chính xác response đã lưu, **không** tạo `PaymentAttempt` thứ hai |
| 3 | Client gửi `Idempotency-Key = K` đã dùng nhưng với `orderId`/nội dung khác | Xử lý | Trả `422 IDEMPOTENCY_KEY_REUSED` |
| 4 | Client gọi `create-payment-url` không kèm `Idempotency-Key` | Gateway/validation kiểm tra header | Trả `400`, từ chối xử lý trước khi chạm tới nghiệp vụ |
