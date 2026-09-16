---
title: ADR-0014 — Tự transcode video bằng ffmpeg worker thay vì dùng dịch vụ video ngoài
status: accepted
owner: Tech Lead
updated: 2026-09-16
related: [docs/01-architecture/media-video-pipeline.md, docs/01-architecture/technology-radar.md, docs/04-frontend/editor-and-uploader.md]
---

# ADR-0014 — Đường xử lý video

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Tech Lead (người dùng đã duyệt phương án ffmpeg)

## Bối cảnh

`video-ads` và phần video của `content-post` là phạm vi mới của timmy-hub và **không chạy được** trên cách làm của bản
cũ: một file MP4 tối đa 50 MB upload bằng một request, lưu nguyên vẹn, phát thẳng bằng `<video src>`. Không có upload
nối lại được, không có HLS, không có thumbnail.

Ta cần: upload chịu được mạng di động đứt quãng, phát thích ứng theo băng thông, có poster, và chi phí phát dự đoán được.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược | Chi phí ước tính (1.000 phút lưu / 10.000 phút xem mỗi tháng) |
|---|---|---|---|
| **A. ffmpeg worker tự host + R2** | Rẻ nhất; kiểm soát hoàn toàn ladder, watermark, đặt tên file; không khoá nhà cung cấp; egress R2 = 0 | Phải vận hành worker, hàng đợi, đĩa tạm, giám sát; tự chịu trách nhiệm khi lỗi | ≈ 0,4 USD + tiền máy worker |
| B. Cloudflare Stream | Không phải vận hành gì; ingest và encode miễn phí; có player sẵn | **Không có gói miễn phí**; khoá vào nhà cung cấp; ít kiểm soát ladder | 15 USD |
| C. Bunny Stream | Rẻ, encode gói trong giá lưu trữ | Nhà cung cấp nhỏ hơn; tài liệu và hệ sinh thái mỏng hơn | ≈ 1,4 USD |
| D. Mux | Bộ tính năng và số liệu đầy đủ nhất | Đắt hơn một bậc lớn về phát | ≈ 90 USD |
| E. Giữ nguyên MP4 phát thẳng | Không tốn công | Không giải quyết được vấn đề nào; băng thông Supabase đắt hơn cả HLS trên CDN | — |

Thứ tự chi phí giữ nguyên khi nhân quy mô lên 100 lần; ở 100.000 phút xem/tháng: A ≈ 4 USD, B ≈ 105 USD, D ≈ 900 USD.

## Quyết định

Chọn **A**: ffmpeg worker chạy trên BullMQ (Upstash Redis TCP), sinh HLS ladder 360p/720p (+1080p cho quảng cáo trả phí),
lưu lên object storage tương thích S3 và phát qua CDN với egress bằng 0.

Upload dùng **tus** qua Supabase Storage — Supabase đã hỗ trợ sẵn tus tới 50 GB, không cần tự dựng server tus.
Supabase **không** có transcode nên phần đó ta tự làm.

Bọc sau hai interface: `MediaStorageProvider` và `VideoTranscodeProvider`, với `CloudflareStreamProvider` là bản cài dự
phòng đã có sẵn.

## Hệ quả

**Phải chấp nhận:**
- Thêm một deploy unit `media-transcode-worker` (đơn vị thứ 18), image nặng vì có ffmpeg.
- Đội phải vận hành: độ sâu hàng đợi, đĩa tạm đầy, job treo, retry sai cách.
- Ước lượng thêm ~1,5 sprint như đã ghi trong technology-radar §5.
- Chất lượng encode là trách nhiệm của ta; ladder sai thì người xem chịu.

**Được lại:**
- Chi phí phát rẻ hơn một bậc lớn, và không đổi khi lưu lượng tăng đột biến theo chiến dịch.
- Không khoá nhà cung cấp; chuyển sang dịch vụ ngoài là đổi một provider.
- Kiểm soát được watermark, tên file, chính sách riêng tư, thời hạn lưu trữ.

**Điều kiện đảo quyết định** — chuyển sang B hoặc C khi chạm bất kỳ mốc nào trong
[media-video-pipeline.md §8](../media-video-pipeline.md#8-khi-nào-bỏ-tự-host-và-chuyển-sang-dịch-vụ-ngoài):
hàng đợi p95 chờ > 10 phút kéo dài, chi phí máy vượt chi phí dịch vụ, cần DRM/live/subtitle tự động, hoặc không có
người nhận vận hành.

## Nguồn

- Cloudflare Stream — giá: <https://developers.cloudflare.com/stream/pricing/>
- Cloudflare R2 — giá và egress bằng 0: <https://developers.cloudflare.com/r2/pricing/>
- Supabase Storage — resumable upload (tus) 50 GB: <https://supabase.com/docs/guides/storage/uploads/resumable-uploads>
