---
name: code-review
description: Rà soát code TimmyHub trước khi merge — đúng đắn, đua tranh, phân quyền và phạm vi dữ liệu, tiền tệ, ranh giới service, hiệu năng, bảo mật, test. Dùng khi được yêu cầu "review code", "kiểm tra PR", "code này ổn chưa", hoặc sau khi vừa viết xong một thay đổi lớn.
---

# Rà soát code

Chỉ báo cáo lỗi **chứng minh được**: mỗi mục phải nêu **kịch bản hỏng cụ thể** (đầu vào/trạng thái → kết quả sai).
Không có kịch bản thì không phải lỗi, cùng lắm là gợi ý. Xếp theo mức nghiêm trọng, nghiêm trọng nhất lên đầu.

## 0. Phạm vi

```bash
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Đọc diff **và** file xung quanh — phần lớn lỗi nặng nằm ở chỗ code mới tương tác với code cũ, không nằm trong dòng đã đổi.

## 1. Thứ tự soi (dừng sớm ở mục nào cũng phải ghi lại)

### 1.1 Đúng đắn và đua tranh

- Đọc-rồi-ghi trên dữ liệu tranh chấp (tồn kho, ví, voucher, điểm) → phải là `UPDATE … WHERE` nguyên tử,
  khoá bi quan, hoặc khoá lạc quan có `version`. Xem `docs/01-architecture/concurrency-and-consistency.md`.
- Giao dịch có bao đúng phạm vi? Gọi mạng/HTTP **bên trong** transaction là lỗi.
- Webhook/IPN (VNPay) có idempotent không? Gọi lại hai lần có cộng tiền hai lần không?
- Chuyển trạng thái có kiểm trạng thái nguồn không, hay ghi đè mù?
- Điều kiện biên: danh sách rỗng, số 0, giá trị `null`, số âm, chuỗi quá dài, trang cuối.

### 1.2 Tiền

- Có `Number(price)`, `parseFloat`, `price * qty`, `+`/`-` trực tiếp trên tiền không? → lỗi, không thương lượng.
- Làm tròn có đúng một lần ở cuối không? Chia tiền có dùng `allocate` không (tổng phần chia phải bằng tổng gốc)?
- Số tiền có luôn đi kèm `currency` không?

### 1.3 Phân quyền và phạm vi dữ liệu

- Đủ 4 lớp: xác thực → role → permission → phạm vi.
- Lọc phạm vi nằm **trong** câu truy vấn, không `.filter()` sau khi lấy về.
- Tài nguyên ngoài phạm vi trả `404`, không phải `403`.
- ID lấy từ body/query có bị tin tưởng mù không (IDOR)?

### 1.4 Ranh giới service

- Có query sang database của service khác không?
- Event phát qua outbox trong cùng transaction, hay `publish()` trần sau khi commit?
- Consumer có idempotent (`processed_events`) không? Xử lý trùng có an toàn không?
- Tên event đúng danh mục trong `docs/01-architecture/event-catalog.md`, không tự chế tên mới.

### 1.5 Hiệu năng

- N+1 truy vấn (vòng lặp có `await prisma...` bên trong).
- Thiếu index cho cột dùng trong `where`/`orderBy` của truy vấn nóng.
- `findMany` không giới hạn, không phân trang.
- Việc chậm (mail, ảnh, transcode, index) nằm trong đường xử lý request thay vì BullMQ.
- FE: fetch trong `useEffect`, render lại cả danh sách, thư viện nặng không nạp động.

### 1.6 Bảo mật

- Bí mật hardcode; log in ra token, mật khẩu, số thẻ, `Authorization`.
- SQL thô nối chuỗi; `dangerouslySetInnerHTML` với nội dung chưa qua sanitize ở backend.
- Thiếu rate limit ở endpoint đăng nhập/gửi OTP/upload.
- Upload: không kiểm magic bytes, tin `Content-Type`, cho client tự chọn đường dẫn.
- Thông báo lỗi tiết lộ chi tiết nội bộ ra ngoài.

### 1.7 Chất lượng

- `any`, `@ts-ignore`, ép kiểu che lỗi thật.
- Validation không qua zod, hoặc schema FE/BE lệch nhau.
- Chuỗi hiển thị hardcode.
- Trùng lặp một đoạn logic đã có ở `shared/`.
- Tên biến/hàm không nói đúng việc nó làm.

### 1.8 Test

- Thay đổi có hành vi mới mà không có test?
- Luồng tiền, tồn kho, phân quyền có test **đua tranh** (chạy song song) không? Đây là loại test hay bị bỏ nhất.
- Test có khẳng định đúng thứ cần khẳng định, hay chỉ kiểm `status === 200`?

## 2. Mức nghiêm trọng

| Mức | Nghĩa |
|---|---|
| **Chặn merge** | Mất tiền, rò rỉ dữ liệu, hỏng dữ liệu, vượt quyền, oversell |
| **Cần sửa** | Sai ở trường hợp biên, thiếu test cho luồng rủi ro, hiệu năng kém rõ rệt |
| **Gợi ý** | Dễ đọc hơn, gọn hơn — người viết tự quyết |

## 3. Mẫu báo cáo

```
| Mức | Vị trí | Vấn đề | Kịch bản hỏng | Cách sửa |
|---|---|---|---|---|
| Chặn merge | order.service.ts:118 | Đọc tồn kho rồi mới trừ | Hai đơn cùng lúc trên sản phẩm còn 1 → bán được 2 | `UPDATE … SET stock = stock - :q WHERE id = :id AND stock >= :q`, kiểm số dòng bị ảnh hưởng |
```

Kết thúc bằng một câu kết luận rõ: **merge được** / **sửa rồi merge** / **cần thiết kế lại phần X**.

## 4. Tự kiểm

- [ ] Mỗi lỗi có kịch bản hỏng cụ thể, không phải cảm giác
- [ ] Đã đọc code xung quanh, không chỉ dòng đã đổi
- [ ] Không nhắc lại thứ ESLint/Prettier đã tự bắt
- [ ] Đã nói rõ cái gì **đúng** rồi, không chỉ liệt kê lỗi
- [ ] Không tự sửa code khi chưa được yêu cầu
