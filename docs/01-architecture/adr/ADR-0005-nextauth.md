---
title: ADR-0005 — NextAuth thay cơ chế cookie thủ công
status: accepted
owner: Frontend Lead
updated: 2026-09-16
related: [docs/04-frontend/auth-nextauth.md, docs/01-architecture/security.md, docs/08-handoff/migration-from-legacy.md]
---

# ADR-0005 — NextAuth thay cơ chế cookie thủ công

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Frontend Lead

## Bối cảnh

Bản gốc tự set cookie `user_roles`/`user_permissions` bằng `js-cookie` ở client — cookie **không** `HttpOnly`, đọc
được bằng JavaScript, `proxy.ts` đọc role từ cookie này ở edge để quyết định route. Đây là lỗ hổng: bất kỳ script nào
chạy trên trang (kể cả qua XSS) đều đọc và **sửa được** cookie phân quyền, tự nâng quyền phía client (dù server vẫn
kiểm tra lại, nhưng logic hiển thị UI đã dựa sai vào cookie này, và một số route dùng luôn `proxy.ts` để chặn mà không
double-check server-side).

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ cơ chế cookie thủ công, chỉ sửa thành `HttpOnly` | Ít việc phải đổi | Vẫn phải tự viết lại toàn bộ: refresh token rotation, CSRF, SSO callback, session tại edge — NextAuth đã giải hết các việc này |
| **B. NextAuth (Auth.js) v5** | Session mã hoá (JWE) hoặc session DB, `HttpOnly` mặc định; có sẵn provider Google/Facebook/Credentials; middleware đọc session ở edge an toàn; cộng đồng lớn, ít lỗ hổng tự phát minh | Phải học API riêng của NextAuth; một số tuỳ biến sâu (custom claim phức tạp) cần viết callback |
| C. Tự viết bằng `iron-session` hoặc tương đương | Nhẹ, kiểm soát hoàn toàn | Phải tự làm lại CSRF, rotation, SSO — đúng vấn đề ADR này muốn tránh |

## Quyết định

Chọn **B — NextAuth**. Session lưu trong cookie `HttpOnly` + `Secure` + `SameSite=Lax`, mã hoá JWE, không đọc được
bằng JavaScript ở client. Role/permission **không** nằm trong cookie đọc trực tiếp — nằm trong session đã mã hoá, chỉ
NextAuth server-side (và middleware chạy ở edge runtime của chính Next.js, không phải script tuỳ ý) giải mã được.

SSO Google/Facebook dùng provider có sẵn của NextAuth, không tự viết OAuth flow.

## Hệ quả

- Middleware Next.js đọc session qua `auth()` của NextAuth, **không** tự parse cookie bằng tay.
- Backend (`identity-service`) vẫn là nguồn sự thật cho user/role/permission; NextAuth chỉ là lớp quản lý phiên ở
  frontend, gọi API `identity-service` để xác thực và lấy claim.
- `callbackUrl` chuẩn hoá theo đúng tên tham số của NextAuth — bản gốc dùng `?redirect` không nhất quán ở một số nơi
  và `?callbackUrl` ở nơi khác, gây lỗi redirect sai sau đăng nhập.
- Chi tiết cấu hình, callback, middleware: `docs/04-frontend/auth-nextauth.md`.
