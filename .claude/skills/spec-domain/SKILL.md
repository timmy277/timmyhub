---
name: spec-domain
description: Viết hoặc cập nhật spec cho một domain của TimmyHub trong docs/03-specs/<domain>/ — requirements.md kiểu EARS, design.md, tasks.md, với ID truy vết REQ-*/TASK-* nối về FEAT-*. Dùng khi được yêu cầu "viết spec", "thêm requirement", "đặc tả domain", hoặc khi thêm tính năng mới cần có spec trước.
---

# Viết spec domain

## Trước khi viết

1. Đọc `docs/00-overview/feature-inventory.md`, lọc các `FEAT-<MÃ>-*` của domain đang làm. **Mọi** feature ở đó phải
   được phủ bởi ít nhất một `REQ-*`. Không bịa feature không có trong inventory — muốn thêm thì thêm vào inventory trước
   và cập nhật lại số tổng.
2. Đọc `docs/01-architecture/service-catalog.md` để biết domain này nằm trong service nào, database nào.
3. Đọc `docs/01-architecture/event-catalog.md` để lấy đúng tên event, không tự đặt tên mới.
4. Nếu domain chạm tồn kho/tiền/voucher: đọc `docs/01-architecture/concurrency-and-consistency.md` trước khi viết design.

## requirements.md

Front-matter chuẩn (`title`, `status`, `owner`, `updated`, `related`), rồi mỗi requirement theo khuôn:

```markdown
### REQ-ORD-012 — Xác nhận đã giao hàng

**Nguồn:** `FEAT-ORD-018`
**Ưu tiên:** P0

KHI hãng vận chuyển báo trạng thái `delivered`, HỆ THỐNG PHẢI chuyển đơn sang `DELIVERED`, ghi `OrderStatusHistory`,
và phát `EVT-order.delivered`.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Đơn ở `SHIPPING` | Nhận webhook `delivered` | Đơn thành `DELIVERED`, người mua nhận thông báo |
| 2 | Đơn đã ở `DELIVERED` | Nhận lại cùng webhook | Không đổi gì, trả 200 (idempotent) |
| 3 | Đơn ở `CANCELLED` | Nhận webhook `delivered` | Giữ nguyên, ghi cảnh báo, không phát event |
```

Đúng **một** mẫu EARS cho mỗi requirement:

| Mẫu | Cú pháp |
|---|---|
| Ubiquitous | `HỆ THỐNG PHẢI <hành vi>.` |
| Event-driven | `KHI <sự kiện>, HỆ THỐNG PHẢI <hành vi>.` |
| State-driven | `TRONG KHI <trạng thái>, HỆ THỐNG PHẢI <hành vi>.` |
| Optional | `NƠI CÓ <tính năng tuỳ chọn>, HỆ THỐNG PHẢI <hành vi>.` |
| Unwanted | `NẾU <điều kiện lỗi>, THÌ HỆ THỐNG PHẢI <hành vi xử lý>.` |

Bắt buộc có ít nhất một requirement mẫu **Unwanted** cho mỗi luồng nghiệp vụ chính — đường lỗi là phần hay bị bỏ quên nhất.

## design.md

Các mục theo thứ tự: mô hình dữ liệu (Prisma) → API (bảng endpoint + permission) → event phát/nghe → sequence diagram
cho luồng chính → trường hợp biên → điểm tranh chấp đồng thời → ảnh hưởng tới domain khác.

Bắt buộc:
- Mọi endpoint ghi rõ permission `module:resource:action[:any]` và phạm vi dữ liệu.
- Mọi phép trừ số lượng/số dư viết dạng `UPDATE … WHERE` nguyên tử, kèm ràng buộc DB tương ứng.
- Tiền là `Decimal @db.Decimal(14,2)`, trong event payload là **chuỗi**.
- Có cặp ❌ BAD / ✅ GOOD cho ít nhất một quy tắc dễ làm sai.

## tasks.md

```markdown
- [ ] **TASK-ORD-021** Thêm bước chuyển `SHIPPING → DELIVERED` vào state machine
    - Ref: `REQ-ORD-012`, `REQ-ORD-013`
    - Ước lượng: 1.5 ngày · Vai: BE
    - Xong khi: test tích hợp phủ cả đường hợp lệ và đường bị chặn; `order.delivered` phát đúng một lần
```

Task > 3 ngày công thì chẻ nhỏ. Mỗi task ref ít nhất một `REQ-*`.

## Kiểm lại trước khi kết thúc

- Mọi `FEAT-*` của domain → có `REQ-*`; mọi `REQ-*` → có `TASK-*`; mọi `TASK-*` → có `Ref:`.
- Mọi link markdown tương đối trỏ tới file có thật.
- Văn xuôi tiếng Việt, identifier tiếng Anh. Thụt lề 4 space, LF.
- Mermaid mở preview không lỗi.
