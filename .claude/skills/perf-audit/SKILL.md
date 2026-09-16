---
name: perf-audit
description: Truy tìm và sửa nguyên nhân chậm của TimmyHub — gói JS phình, LCP/CLS kém, N+1 truy vấn, index thiếu, cache sai, hàng đợi ùn. Dùng khi được yêu cầu "trang chậm", "API chậm", "tối ưu hiệu năng", "gói JS to quá", hoặc khi cổng Lighthouse/size-limit trong CI bị đỏ.
---

# Rà soát hiệu năng

**Đo trước, sửa sau.** Không tối ưu theo cảm giác. Mỗi đề xuất phải kèm: số đo trước · nguyên nhân · số đo sau.
Ngân sách chuẩn nằm ở `docs/06-quality/performance.md`; cách thi hành ở `docs/06-quality/quality-gates.md`.

## 1. Khoanh vùng trước

| Triệu chứng | Nhìn vào |
|---|---|
| Trang trắng lâu, LCP cao | Frontend: gói JS, ảnh, fetch nối tiếp ở server |
| Trang nhảy layout | CLS: ảnh/iframe không có kích thước, font swap, banner chèn muộn |
| Gõ/bấm giật | TBT, render lại thừa, bảng không ảo hoá |
| API chậm đều | Truy vấn hoặc thiếu index |
| API lúc nhanh lúc chậm | Cache miss, kết nối DB cạn, hàng xóm ồn ào |
| Chậm dồn theo thời gian | Rò rỉ bộ nhớ, hàng đợi ùn, bảng phình không dọn |

## 2. Frontend

### 2.1 Gói JS

```bash
pnpm --filter frontend build
pnpm --filter frontend size-limit
ANALYZE=true pnpm --filter frontend build     # xem cây phụ thuộc
```

Soi theo thứ tự này, đây là nguồn phình phổ biến nhất:

1. Thư viện nặng lọt vào gói chung — TipTap, Uppy, `hls.js`, `media-chrome`, AG Grid, Recharts, Motion.
   **Phải** `next/dynamic`; có test khẳng định tên chúng không xuất hiện trong chunk chung.
2. `import { x } from 'thư-viện'` kéo cả gói (date-fns, lodash, icon set) → import theo đường dẫn con.
3. `'use client'` đặt quá cao trong cây → kéo theo cả nhánh xuống client.
4. Polyfill thừa do `browserslist` quá rộng.
5. Ảnh/font nhúng base64 trong JS.

### 2.2 Core Web Vitals

| Chỉ số | Nguyên nhân hay gặp | Cách sửa |
|---|---|---|
| LCP | Ảnh hero không `priority`; fetch nối tiếp ở server; font chặn render | `next/image` + `priority`; `Promise.all` cho fetch độc lập; `font-display: swap` + preload |
| CLS | Ảnh không tỉ lệ, skeleton sai kích thước, banner chèn sau | Cố định `aspect-ratio`, skeleton bằng đúng kích thước thật |
| INP/TBT | Xử lý nặng trên luồng chính, bảng dài không ảo hoá | TanStack Virtual, chia nhỏ tác vụ, `useDeferredValue` |

Đo bằng Lighthouse **trung vị 3 lần**, bản build production, CPU throttle 4×. Một lần chạy là nhiễu.

### 2.3 Dữ liệu ở FE

- Fetch trong `useEffect` thay vì Server Component → sửa ngay.
- Query key sai làm mất cache hoặc lấy lại liên tục.
- Không phân trang: kéo hết rồi cắt ở client.
- `invalidateQueries` quét quá rộng sau mỗi thao tác nhỏ.

## 3. Backend

### 3.1 Truy vấn

```sql
EXPLAIN (ANALYZE, BUFFERS) <câu truy vấn>;
```

- `Seq Scan` trên bảng lớn → thiếu index.
- Index tồn tại nhưng không được dùng → sai thứ tự cột trong index tổ hợp, hoặc có hàm bọc quanh cột trong `where`.
- N+1: `await prisma...` bên trong vòng lặp → gộp bằng `include`/`in` một lần.
- `findMany` không `take` → luôn giới hạn và phân trang cursor.
- `count()` trên bảng lớn mỗi lần tải trang → dùng đếm xấp xỉ hoặc bỏ tổng số trang.
- Bật log truy vấn chậm của Prisma trong staging để tìm 10 truy vấn tệ nhất, sửa từ trên xuống.

### 3.2 Đường xử lý request

- Việc chậm (mail, ảnh, transcode, index tìm kiếm, tổng hợp báo cáo) **không** được nằm trong request → BullMQ.
- Gọi service khác nối tiếp mà có thể song song → `Promise.all` kèm timeout.
- Payload trả về thừa trường → chọn trường cần dùng, đừng trả cả bản ghi.
- Kết nối DB: kiểm pool có cạn không trước khi đổ lỗi cho truy vấn.

### 3.3 Cache

- Cache cái gì, hết hạn bao lâu, ai xoá — thiếu một trong ba là cache sai.
- Xoá cache theo event, không theo thời gian đoán mò.
- Cache dữ liệu riêng tư phải có khoá gồm `userId`; sai chỗ này là rò rỉ dữ liệu, không chỉ là hiệu năng.

### 3.4 Hàng đợi và worker

- Độ sâu hàng đợi và thời gian chờ p95 (`media.transcode` là hàng đợi rủi ro nhất).
- Job không có timeout, không có giới hạn số lần thử lại.
- Một worker ôm nhiều job nặng CPU cùng lúc — ffmpeg chạy 1 job / 4 vCPU.

## 4. Báo cáo

```
| Vị trí | Số đo trước | Nguyên nhân | Cách sửa | Số đo sau | Công sức |
|---|---|---|---|---|---|
| /san-pham/[slug] | LCP 4,1 s | Ảnh hero không priority + 3 fetch nối tiếp | priority + Promise.all | LCP 1,9 s | 1 giờ |
```

Xếp theo **lợi ích / công sức**. Nói rõ cái gì đã đạt ngân sách để không ai tối ưu tiếp chỗ không cần.

## 5. Tự kiểm

- [ ] Có số đo trước và sau, cùng điều kiện đo
- [ ] Không đoán nguyên nhân khi chưa `EXPLAIN` hoặc chưa mở bundle analyzer
- [ ] Đề xuất không làm hỏng tính đúng đắn (cache dữ liệu riêng tư, bỏ kiểm tra quyền để nhanh hơn)
- [ ] Nếu đạt ngân sách rồi thì nói thẳng là **không cần sửa gì**
