---
title: ADR-0008 — next-intl thay i18next, locale trên URL
status: accepted
owner: Frontend Lead
updated: 2026-09-16
related: [docs/04-frontend/i18n.md, .claude/skills/i18n-strings/SKILL.md]
---

# ADR-0008 — next-intl thay i18next, locale trên URL

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Frontend Lead

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

## Hệ quả

- Backend **không** trả câu tiếng Việt cho lỗi nghiệp vụ — trả `code` + tham số, frontend tự dịch qua next-intl (đã
  ghi thành luật cứng #17 nhánh liên quan trong `CLAUDE.md`, chi tiết ở `docs/01-architecture/i18n-backend.md`).
- SEO: `hreflang` + `x-default` bắt buộc cho mọi route công khai — chi tiết `docs/04-frontend/seo.md`.
- Thêm ngôn ngữ mới là việc thêm thư mục `messages/<locale>/`, không đổi code — nếu phải sửa code khi thêm ngôn ngữ
  thì kiến trúc i18n đang sai.
