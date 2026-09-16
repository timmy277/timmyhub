---
name: prisma-schema
description: Thêm hoặc sửa mô hình dữ liệu TimmyHub — model Prisma theo database-per-service, kiểu dữ liệu tiền/thời gian, index, khoá lạc quan, bảng outbox/processed_events, và migration an toàn khi đã có dữ liệu. Dùng khi được yêu cầu "thêm bảng", "sửa schema", "thêm trường", "viết migration", hoặc khi thiết kế dữ liệu cho một tính năng mới.
---

# Thay đổi mô hình dữ liệu

## 1. Trước khi sửa schema

1. Trường này thuộc **service nào**? Một bảng chỉ thuộc một service (`docs/01-architecture/service-catalog.md`).
   Cần dữ liệu của service khác thì sao chép **ảnh chụp** (snapshot) vào bảng của mình qua event, **không** khoá ngoại
   xuyên database.
2. Cập nhật `docs/02-domain/schemas/<service>.prisma.md` cùng lúc với schema thật — hai nơi lệch nhau là nguồn lỗi lâu dài.
3. Thay đổi có sinh event mới không? Nếu có thì khai trong `docs/01-architecture/event-catalog.md` trước.

## 2. Quy ước kiểu dữ liệu

| Loại | Kiểu | Lý do |
|---|---|---|
| Khoá chính | `String @id @default(cuid())` | Không lộ số lượng bản ghi, ghép được giữa các service |
| Tiền | `Decimal @db.Decimal(14,2)` | **Cấm** `Float`/`Int` cho tiền |
| Số lượng, tồn kho | `Int` | |
| Tỉ lệ, phần trăm | `Decimal @db.Decimal(5,2)` | |
| Thời gian | `DateTime @db.Timestamptz(3)` | Luôn lưu UTC, đổi múi giờ ở tầng hiển thị |
| Trạng thái | `enum` | Không dùng chuỗi tự do |
| JSON có cấu trúc | `Json` + zod schema kèm theo | Phải có schema kiểm được, không phải bãi rác |
| Xoá mềm | `deletedAt DateTime?` | Chỉ khi nghiệp vụ thật sự cần; kèm index một phần |

Bắt buộc mọi model: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.

## 3. Index

- Mọi khoá ngoại có index.
- Truy vấn danh sách nóng: index tổ hợp **theo đúng thứ tự** `where` rồi `orderBy`
  (ví dụ `@@index([sellerId, status, createdAt(sort: Desc)])`).
- Trường tra cứu duy nhất (`slug`, `email`, `orderCode`) dùng `@@unique`, không chỉ index.
- Không thêm index "cho chắc" — mỗi index làm chậm ghi. Thêm vì một truy vấn cụ thể, ghi tên truy vấn đó vào comment.

## 4. Đua tranh

| Tình huống | Cách làm |
|---|---|
| Trừ tồn kho, trừ số dư ví, trừ lượt voucher | `UPDATE … SET x = x - n WHERE id = ? AND x >= n`, kiểm số dòng bị ảnh hưởng |
| Bản ghi bị sửa đồng thời bởi nhiều người | Thêm `version Int @default(0)`, `WHERE version = ?` rồi tăng |
| Chuỗi thao tác phải cùng thành/bại | `prisma.$transaction`, **không** gọi mạng bên trong |
| Chống tạo trùng do bấm hai lần | `@@unique` trên khoá nghiệp vụ + bảng `idempotency_keys` |

## 5. Bảng hạ tầng bắt buộc trong mỗi service DB

```prisma
model OutboxEvent {
    id            String    @id @default(cuid())
    eventName     String                              // ví dụ: order.paid
    payload       Json
    occurredAt    DateTime  @default(now())
    publishedAt   DateTime?
    attempts      Int       @default(0)

    @@index([publishedAt, occurredAt])
}

model ProcessedEvent {
    eventId     String   @id
    handlerName String
    processedAt DateTime @default(now())

    @@unique([eventId, handlerName])
}
```

Phát event là **ghi vào `OutboxEvent` trong cùng transaction** với thay đổi nghiệp vụ; một tiến trình riêng đọc và
đẩy lên RabbitMQ. Không `publish()` trực tiếp trong service.

## 6. Migration an toàn

Thứ tự khi đổi cấu trúc trên bảng đã có dữ liệu — **không bao giờ gộp thành một bước**:

1. Thêm cột mới `NULL` (tương thích ngược).
2. Triển khai code ghi **cả hai** cột cũ và mới.
3. Backfill theo lô, có thể tạm dừng và chạy lại được.
4. Chuyển code sang đọc cột mới.
5. Đặt `NOT NULL` / thêm ràng buộc.
6. Xoá cột cũ ở một lần phát hành sau.

Quy tắc kèm theo:

- Luôn `prisma migrate dev` → file migration được commit. **Cấm** `db push --accept-data-loss` (lỗi của bản cũ).
- Đọc file SQL sinh ra trước khi commit; `DROP`/`ALTER … NOT NULL`/đổi kiểu phải được nhìn tận mắt.
- Thêm index trên bảng lớn dùng `CREATE INDEX CONCURRENTLY` (viết tay trong file migration).
- Đổi tên bảng/cột là xoá + tạo mới trong mắt Prisma — phải làm theo 6 bước trên.
- Migration phải thử trên bản sao dữ liệu staging, ghi lại thời gian chạy nếu > 1 giây.
- Seed dữ liệu tham chiếu (permission, tỉnh/huyện/xã, cấu hình) nằm trong `prisma/seeds/`, chạy lại được nhiều lần
  (`upsert`), không phụ thuộc thứ tự.

## 7. Bàn giao

- [ ] `docs/02-domain/schemas/<service>.prisma.md` đã cập nhật khớp schema thật
- [ ] Không có khoá ngoại xuyên database
- [ ] Tiền dùng `Decimal(14,2)`; thời gian dùng `Timestamptz`
- [ ] Index tổ hợp khớp truy vấn thật, có comment nêu truy vấn đó
- [ ] Trường tranh chấp có cách cập nhật nguyên tử hoặc `version`
- [ ] File migration đã đọc bằng mắt, không có `DROP` ngoài ý muốn
- [ ] Đã thử `migrate reset` + seed chạy sạch từ đầu
