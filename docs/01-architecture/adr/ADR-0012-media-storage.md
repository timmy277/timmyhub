---
title: ADR-0012 — Supabase Storage (upload) + Cloudflare R2 (phát) qua interface MediaStorageProvider
status: accepted
owner: Backend Lead
updated: 2026-09-16
related: [docs/01-architecture/media-video-pipeline.md, docs/01-architecture/adr/ADR-0014-video-pipeline.md, docs/05-infra/environments.md]
---

# ADR-0012 — Supabase Storage (upload) + Cloudflare R2 (phát) qua interface `MediaStorageProvider`

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Backend Lead

## Bối cảnh

Bản gốc dùng Supabase Storage cho mọi thứ — cả nhận upload lẫn phát file cho người xem. Điều này chạy được với ảnh và
file nhỏ, nhưng khi mở rộng sang video (ADR-0014), băng thông ra của Supabase đắt hơn CDN chuyên dụng nhiều lần —
không phù hợp để phát nội dung xem nhiều lần như video/HLS. Cần tách rõ hai vai trò: **nhận upload** (cần tốt ở
resumable upload, không cần rẻ vì lưu tạm) và **phát nội dung công khai** (cần rẻ/miễn phí egress vì đọc rất nhiều
lần).

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ nguyên: Supabase cho cả upload và phát | Không đổi gì | Băng thông phát video qua Supabase đắt gấp ~25 lần R2 ở cùng quy mô (đo ở ADR-0014: ~10 USD/tháng so với ~0,4 USD/tháng ở mức 1.000 phút lưu / 10.000 phút xem) |
| B. Tự host MinIO cho cả hai vai trò | Kiểm soát hoàn toàn, không phụ thuộc nhà cung cấp ngoài | Phải tự vận hành object storage có độ sẵn sàng cao — chi phí vận hành không đáng để đổi lấy khi các dịch vụ quản lý sẵn đã đủ rẻ |
| **C. Tách vai trò: Supabase Storage nhận upload qua tus, Cloudflare R2 phát nội dung công khai** | Mỗi dịch vụ làm đúng việc nó mạnh: Supabase có tus resumable upload tới 50 GB sẵn dùng; R2 có gói miễn phí 10 GB + **egress bằng 0** — đúng nhu cầu phát nhiều lần; cả hai tương thích S3 API nên đổi nhà cung cấp sau này chỉ là đổi implementation, không đổi interface | Hai nhà cung cấp thay vì một — thêm một điểm cấu hình, một bộ credential cần quản lý |

## Quyết định

Chọn **C**. Định nghĩa interface `MediaStorageProvider` (upload, đọc, xoá, sinh signed URL) và `VideoTranscodeProvider`
(ADR-0014) tách khỏi tầng nghiệp vụ. Production/staging dùng Supabase (upload) + R2 (phát); môi trường dev local dùng
MinIO cho cả hai vai trò để không phụ thuộc dịch vụ ngoài khi phát triển offline.

## Hệ quả

- Đổi nhà cung cấp lưu trữ ở bất kỳ vai trò nào là đổi một class implement interface, không sửa code nghiệp vụ ở
  `media-service` hay `content-service`.
- Ảnh (không qua transcode) vẫn qua Supabase cho cả upload lẫn phát nếu khối lượng đọc thấp; chỉ **video** bắt buộc
  qua R2 ở bước phát vì chênh lệch chi phí đáng kể. Ngưỡng cụ thể khi nào chuyển ảnh sang R2: `media-video-pipeline.md`.
- Chi tiết kiến trúc, sơ đồ, và bảng chi phí đầy đủ: `docs/01-architecture/media-video-pipeline.md`.
