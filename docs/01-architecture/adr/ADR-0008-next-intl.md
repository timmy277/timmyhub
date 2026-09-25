---
title: ADR-0008 — next-intl thay i18next, locale trong cookie
status: accepted
owner: Frontend Lead
updated: 2026-09-25
related: [docs/04-frontend/i18n.md, docs/01-architecture/i18n-backend.md, docs/06-quality/performance-campaign.md, .claude/skills/i18n-strings/SKILL.md]
---

# ADR-0008 — next-intl thay i18next, locale trong cookie

**Trạng thái:** accepted (sửa đổi 2026-09-25) · **Ngày:** 2026-09-16 · **Người quyết:** Frontend Lead

## Bối cảnh

Bản gốc dùng i18next **chỉ ở client**, không có locale trên URL (`/vi/...` vs `/en/...`), nên: không SEO được theo
ngôn ngữ (Google index một URL duy nhất cho mọi ngôn ngữ), không chia sẻ được link đúng ngôn ngữ, và bản dịch chỉ chạy
sau khi JS tải xong (nháy nội dung mặc định trước khi dịch — layout shift).

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ i18next, thêm locale vào URL thủ công | Ít việc đổi | Vẫn dịch phía client, vẫn nháy nội dung; phải tự viết middleware định tuyến locale mà next-intl đã có sẵn |
| **B. next-intl** | Tích hợp App Router native — dịch ở Server Component, không nháy nội dung, không cần gửi JS dịch xuống client cho phần server-rendered; middleware định tuyến `/[locale]/...` có sẵn; hỗ trợ ICU MessageFormat (số nhiều, chọn giới tính) | Cần cấu trúc lại route theo `[locale]` segment — đổi cấu trúc thư mục app so với bản gốc |
| C. `react-i18next` + tự viết routing locale | Quen thuộc với người từng dùng i18next | Không tận dụng được Server Component, phải tự làm lại phần next-intl đã giải quyết |

## Quyết định

Chọn **B**. Locale nằm trên URL: `/[locale]/...`, `vi` là mặc định. Namespace theo domain
(`common`, `auth`, `product`, `cart`, `order`, `payment`, `seller`, `admin`, `content`, `error`) — chi tiết quy ước
đặt tên khoá và cách trích chuỗi: skill `i18n-strings` và `docs/04-frontend/i18n.md`.

## Sửa đổi 2026-09-25 — bỏ locale trên URL

Chủ dự án quyết định **không** dùng segment `[locale]` (`TASK-PERF-002` huỷ). Vẫn giữ next-intl (phương án B),
nhưng locale nằm trong cookie `NEXT_LOCALE`, URL giữ nguyên khi đổi ngôn ngữ (`frontend/src/i18n/request.ts`, không
dùng routing/middleware của next-intl). Tên cookie, `Locale`, `LOCALES`, `DEFAULT_LOCALE`, `isLocale` nằm ở
`@timmyhub/contracts` để BE đọc cùng cookie — chi tiết `docs/01-architecture/i18n-backend.md` §1.

Đánh đổi chấp nhận:

- Mỗi trang chỉ có **một URL**; bot tìm kiếm không mang cookie nên chỉ index bản `vi`. Không có `hreflang` cặp
  `vi`/`en` — bản `en` không SEO được. Cần SEO theo ngôn ngữ thì phải mở ADR mới quay lại locale trên URL.
- Root layout đọc cookie nên các route đang render động; tối ưu tĩnh hoá xử lý ở `TASK-PERF-003` (Cache Components),
  không qua segment locale.

## Hệ quả

- Backend **không** trả câu cố định cho lỗi nghiệp vụ — trả `code` + `messageKey` + tham số; catalog thông điệp API
  dùng chung FE/BE ở `@timmyhub/contracts`, FE nạp dưới namespace `api` (`docs/01-architecture/i18n-backend.md` §2).
- SEO: `canonical` bắt buộc cho mọi route công khai; `hreflang` không áp dụng khi locale nằm trong cookie (xem phần
  sửa đổi) — chi tiết `docs/04-frontend/seo.md`.
- Thêm ngôn ngữ mới là thêm một giá trị vào `Locale` (`@timmyhub/contracts`), một file `messages/<locale>.json` ở FE
  và một catalog `messages.<locale>.ts` — không sửa logic. Phải sửa logic khi thêm ngôn ngữ thì kiến trúc i18n đang sai.
