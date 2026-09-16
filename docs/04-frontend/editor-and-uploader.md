---
title: Trình soạn thảo, trình tải lên và trình phát video
status: review
owner: FE Lead
updated: 2026-09-16
related: [docs/01-architecture/media-video-pipeline.md, docs/04-frontend/component-inventory.md, docs/01-architecture/security.md, docs/06-quality/performance.md]
---

# Trình soạn thảo, trình tải lên và trình phát

Ba component nặng nhất của frontend, dùng chung ở nhiều màn (mô tả sản phẩm, bài đăng, video quảng cáo, trả lời khiếu
nại). Vì nặng nên chúng có quy định riêng: **cả ba đều nạp động, không cái nào được có mặt trong gói chung.**

---

## 1. TipTap — trình soạn thảo rich text

### 1.1 Dùng ở đâu

| Màn | Bộ tính năng |
|---|---|
| Mô tả sản phẩm (seller) | Đậm/nghiêng, tiêu đề, danh sách, bảng, ảnh, link |
| Bài đăng (seller) | Thêm nhúng video, gắn thẻ sản phẩm, trích dẫn |
| Nội dung quảng cáo | Rút gọn: đậm/nghiêng, link, giới hạn ký tự |
| Trả lời khiếu nại, mô tả ticket | Tối giản: đậm/nghiêng, danh sách, ảnh đính kèm |
| Trang tĩnh (admin) | Đầy đủ + chỉnh HTML thô |

Ba mức cấu hình dùng lại: `minimal`, `standard`, `full`. Không để mỗi màn tự ghép extension — ghép lung tung thì nội
dung tạo ở màn này mở ở màn khác sẽ vỡ.

### 1.2 Quy định

| Hạng mục | Quy định |
|---|---|
| Lưu trữ | Lưu **JSON của TipTap**, không lưu chuỗi HTML. JSON kiểm được, HTML thì không |
| Render công khai | Server render từ JSON bằng `generateHTML` của TipTap **trên backend**, cache lại |
| Vệ sinh dữ liệu | Backend **luôn** làm sạch trước khi lưu (`sanitize-html` với danh sách cho phép). Không tin client, kể cả khi client đã lọc |
| Ảnh trong nội dung | Upload qua `media-service`, chèn vào là URL của ta; **cấm** ảnh `data:` nhúng thẳng và cấm hotlink ngoài |
| Giới hạn | Đếm ký tự theo văn bản thuần, không theo độ dài JSON |
| SEO | Nội dung phải có trong HTML lần đầu; không render bằng client editor ở trang công khai |
| Khả năng truy cập | Thanh công cụ là `<button>` thật, có `aria-label` và phím tắt; dùng được bằng bàn phím |
| Cộng tác | **Không** dùng TipTap Collaboration (cần Yjs + server riêng) — chưa có nhu cầu |
| Nạp | `next/dynamic` với `ssr: false` + skeleton đúng kích thước |

❌ **BAD** — nhận HTML từ client rồi cắm thẳng vào trang:

```tsx
<div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />   // XSS
```

✅ **GOOD** — backend là nơi duy nhất biến JSON thành HTML và làm sạch; frontend chỉ hiển thị chuỗi đã sạch do backend
sinh ra, kèm `rel="nofollow ugc"` cho link do người dùng nhập.

---

## 2. Uppy + tus — trình tải lên

### 2.1 Vì sao

Video 50–200 MB trên mạng 4G đứt giữa chừng là **mất trắng** với `multipart/form-data`. tus cho phép tiếp tục từ byte
đã gửi. Supabase Storage hỗ trợ tus sẵn nên không phải dựng server tus.

### 2.2 Cấu hình

```ts
const uppy = new Uppy({
    restrictions: {
        maxFileSize: 200 * 1024 * 1024,        // video; ảnh dùng preset khác
        allowedFileTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
        maxNumberOfFiles: 1,
    },
    autoProceed: false,
}).use(Tus, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    chunkSize: 6 * 1024 * 1024,                // BẮT BUỘC 6 MB, Supabase yêu cầu
    removeFingerprintOnSuccess: true,
    retryDelays: [0, 1000, 3000, 5000, 10000],
    headers: { authorization: `Bearer ${uploadToken}` },   // token 30 phút do media-service cấp
})
```

| Hạng mục | Quy định |
|---|---|
| `chunkSize` | **Đúng 6 MB**. Sai giá trị này thì mọi file > 6 MB lỗi — lỗi phổ biến nhất khi tích hợp |
| Token | Xin từ `POST /media/uploads` ngay trước khi upload, hạn 30 phút, gắn với một đường dẫn cố định |
| Nối lại | Bật fingerprint; mở lại trang trong 24 h thì hỏi "tiếp tục tải lên?" |
| Tiến trình | Hiện phần trăm + tốc độ + thời gian còn lại; cho huỷ; **không** khoá cả trang |
| Sau khi xong | Gọi `POST /media/videos` → nhận `202 PROCESSING`, theo dõi qua WebSocket `media:{userId}` |
| Trạng thái chờ | Nói rõ "đang xử lý video, khoảng 1–2 phút" kèm tiến trình; **không** để người dùng ngồi nhìn spinner vô hạn |
| Lỗi | Phân biệt lỗi mạng (tự thử lại) và lỗi từ chối (sai định dạng, quá lớn, nhiễm mã độc → nói rõ lý do) |
| Ảnh | Cùng Uppy nhưng preset khác: nhiều file, 10 MB, có cắt ảnh trước khi gửi |
| Nạp | `next/dynamic`, chỉ nạp khi người dùng mở khu vực upload |

---

## 3. Trình phát video

| Hạng mục | Quy định |
|---|---|
| Giao diện | `media-chrome` (web component, nhẹ, tuỳ biến bằng CSS) |
| Engine | `hls.js`; Safari dùng HLS gốc, **không** nạp `hls.js` ở Safari |
| Poster | Bắt buộc, kích thước cố định ⇒ CLS = 0 |
| `preload` | `metadata` |
| Tự phát | Chỉ ở feed dọc, tắt tiếng, khi ≥ 60% trong khung nhìn; tôn trọng `prefers-reduced-motion` |
| Phụ đề | `<track>` khi có; nút bật/tắt |
| Bàn phím | Space phát/dừng, mũi tên tua, M tắt tiếng, F toàn màn hình |
| Số liệu | Bắn sự kiện xem ở mốc 3 giây và 25/50/75/100% cho `video-ads` |
| Nạp | `next/dynamic`; trang danh sách chỉ nạp engine khi người dùng thật sự phát |

---

## 4. Ngân sách gói

| Component | Trần sau nén (gzip) | Điều kiện |
|---|---|---|
| Trình soạn thảo TipTap (`standard`) | 120 KB | Nạp động, chỉ trên màn có soạn thảo |
| Uppy + tus + dashboard | 90 KB | Nạp động, chỉ khi mở khu vực upload |
| `hls.js` + `media-chrome` | 70 KB | Nạp động, chỉ khi phát |
| Tổng thêm vào gói chung | **0 KB** | Kiểm bằng `size-limit` trong CI |

---

## 5. Checklist

- [ ] Cả ba component nạp động, `size-limit` xác nhận gói chung không tăng
- [ ] TipTap lưu JSON, backend làm sạch và sinh HTML
- [ ] Không có `dangerouslySetInnerHTML` với nội dung chưa qua backend
- [ ] `chunkSize` đúng 6 MB, đã thử ngắt mạng giữa chừng và nối lại thành công
- [ ] Client không cầm service key của storage
- [ ] Màn hình chờ transcode có thông tin thật, không spinner vô hạn
- [ ] Lỗi từ chối nói rõ lý do và cách sửa
- [ ] Trình phát có poster, dùng được bằng bàn phím, CLS = 0
