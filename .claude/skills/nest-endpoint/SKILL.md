---
name: nest-endpoint
description: Thêm hoặc sửa một endpoint/handler backend TimmyHub (NestJS microservice + Prisma + RabbitMQ) — DTO zod, phân quyền 4 lớp, phạm vi dữ liệu, audit, idempotency, phát event qua outbox, Swagger, test. Dùng khi được yêu cầu thêm API, sửa service backend, thêm message handler hoặc consumer event.
---

# Thêm endpoint backend

## Trước khi viết

1. Xác định endpoint thuộc **service nào** (`docs/01-architecture/service-catalog.md`). Một service chỉ đụng database
   của chính nó — cần dữ liệu domain khác thì gọi RPC hoặc nghe event, **không** query chéo database.
2. Tìm spec: `docs/03-specs/<domain>/design.md`. Không có spec mà là tính năng mới thì viết spec trước
   (skill `spec-domain`).
3. Endpoint chạm tồn kho / tiền / voucher → đọc `docs/01-architecture/concurrency-and-consistency.md` trước.

## Khung bắt buộc của một handler

```ts
@Post('orders/:id/cancel')
@Roles(Role.USER, Role.ADMIN)
@Permissions('order:order:cancel')
@AuditAction('ORDER_CANCEL', { entity: 'Order' })
@ApiOperation({ summary: 'Huỷ đơn hàng' })
async cancel(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,          // sinh từ zod schema trong @timmyhub/contracts
    @CurrentUser() user: AuthUser,
) {
    return this.orders.cancel(id, dto, user)
}
```

| Lớp | Bắt buộc |
|---|---|
| Xác thực | Guard toàn cục; endpoint công khai phải `@Public()` **có chú thích lý do** |
| Vai trò | `@Roles(...)` |
| Quyền | `@Permissions('module:resource:action[:any]')` — quyền phải tồn tại trong seed, nếu không app từ chối khởi động |
| Bản ghi / trường | CASL trong service; lọc phạm vi bằng `whereForScope(user, …)` **trong câu truy vấn** |
| Validation | zod, dùng lại schema chung với FE; không dùng class-validator |
| Audit | `@AuditAction` cho mọi thao tác ghi |
| Tài liệu | `@ApiOperation` + kiểu trả về; mã lỗi có trong danh mục error code |

## Quy tắc trong service

- **Phạm vi dữ liệu lọc trong truy vấn**, không lọc sau khi lấy về.

    ❌ BAD
    ```ts
    const orders = await this.prisma.order.findMany()
    return orders.filter(o => o.shopId === user.shopId)
    ```

    ✅ GOOD
    ```ts
    return this.prisma.order.findMany({ where: whereForScope(user, { status }) })
    ```

- **Trừ số lượng / số dư luôn là `UPDATE … WHERE` nguyên tử**, kèm ràng buộc `CHECK` ở database. Không đọc rồi ghi.
- **Ghi nhiều bảng → một transaction.** Phát event trong cùng transaction bằng **outbox**, không gọi `amqp.publish`
  giữa chừng (transaction rollback thì event đã bay đi mất).
- **Endpoint gây tác dụng phụ không lặp lại được** (thanh toán, tạo đơn, rút tiền) phải nhận `Idempotency-Key`.
- **Tiền** là `Decimal @db.Decimal(14,2)`; ra API và event payload là **chuỗi**, kèm trường `currency`.
- Lỗi ném bằng exception có `code` để FE dịch được; không trả câu tiếng Việt cứng từ backend
  (`docs/01-architecture/i18n-backend.md`).
- Việc chậm (gửi mail, đánh index, transcode, tổng hợp) **không** nằm trong đường xử lý request — đẩy sang consumer
  event hoặc job BullMQ.

## Event

- Tên theo `<domain>.<entity>.<hành động quá khứ>`, phải có sẵn trong `docs/01-architecture/event-catalog.md`.
- Payload có schema zod trong `@timmyhub/contracts`, có `eventId`, `occurredAt`, `version`.
- Consumer **idempotent** qua bảng `processed_events`; xử lý lại cùng `eventId` không được đổi trạng thái lần hai.
- Consumer lỗi → DLQ có ngữ cảnh, không nuốt lỗi im lặng.

## Test

| Mức | Bắt buộc khi |
|---|---|
| Unit | Có logic nghiệp vụ, tính toán, chuyển trạng thái |
| Tích hợp (testcontainers + Postgres thật) | Có truy vấn Prisma, transaction, ràng buộc DB |
| Đồng thời | Endpoint chạm tồn kho/tiền — bắn N request song song, khẳng định đúng một thành công |
| Phân quyền | Ít nhất một ca đúng quyền, một ca sai vai, một ca đúng vai nhưng sai phạm vi (phải ra `404`, không phải `403`) |

## Tự kiểm trước khi mở PR

- [ ] Đủ `@Roles` + `@Permissions`, quyền đã có trong seed
- [ ] Phạm vi dữ liệu lọc trong truy vấn
- [ ] Ghi dữ liệu có `@AuditAction`
- [ ] Không query database của service khác
- [ ] Event phát qua outbox, tên khớp event catalog
- [ ] Idempotent nếu tác dụng phụ không lặp lại được
- [ ] Không có việc chậm trong đường request
- [ ] Swagger đủ; lỗi có `code` dịch được
- [ ] Có test phân quyền và (nếu chạm tồn kho/tiền) test đồng thời
