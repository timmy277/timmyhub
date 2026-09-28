---
title: Auth frontend — NextAuth v5 (Auth.js)
status: review
owner: FE Lead
updated: 2026-09-28
related: [docs/01-architecture/adr/ADR-0005-nextauth.md, docs/01-architecture/security.md, docs/03-specs/identity-auth/design.md, docs/03-specs/identity-auth/requirements.md]
---

# Auth frontend — NextAuth v5 (Auth.js)

> NextAuth chỉ là **lớp quản lý phiên ở frontend**; `identity-service` vẫn là nguồn sự thật cho user/role/permission
> (ADR-0005). Access và refresh token của backend sống **bên trong** JWT mã hoá JWE của NextAuth — không storage nào
> ở client giữ token, kể cả cookie thường (REQ-IDN-022, REQ-IDN-023).
>
> Bản cũ tự set cookie `user_roles`/`user_permissions` bằng `js-cookie` — đọc và **sửa được** từ JavaScript. Bản này
> không có đường nào để JS đọc role/permission: session callback chỉ bóc `id`, `email` và access token (để giữ trong
> RAM cho interceptor).

---

## 1. Bản đồ file

| File | Việc |
|---|---|
| `src/lib/auth.ts` | Cấu hình NextAuth: Credentials provider (`authorize` gọi backend), `jwt`/`session` callback, refresh server-side. Chỉ import ở phía server (route handler, proxy, Server Component) |
| `src/app/api/auth/[...nextauth]/route.ts` | Route handler `/api/auth/*` |
| `src/proxy.ts` | Lớp chặn route: `auth()` của NextAuth (giải mã JWT ở edge), gắn `x-original-path` |
| `src/app/(protected)/layout.tsx` | Lớp xác minh thứ hai + khung sidebar/header |
| `src/lib/auth-session.ts` | Chốt chặn duy nhất cho `getSession` phía client (`next-auth/react`) |
| `src/services/api-client.ts` | Instance axios duy nhất + interceptor (gắn Bearer, tự refresh khi 401) |
| `src/utils/refresh-lock.ts` | Khoá refresh **giữa các tab** (Web Locks) |
| `src/utils/safe-path.ts` | Lọc open-redirect cho `callbackUrl` (REQ-IDN-033) |
| `src/components/providers/session-token-watcher.tsx` | Giữ access token trong RAM + hẹn refresh trước hạn |
| `src/hooks/use-login.ts`, `src/hooks/use-logout.ts` | Mutation đăng nhập / đăng xuất |
| `src/features/login/actions.ts` | Server action thu hồi refresh token ở backend khi logout |
| `src/constants/auth.ts` | TTL, margin refresh, tên cookie phiên, mã lỗi riêng của FE |

## 2. Token nằm ở đâu

| Nơi | Chứa gì | Ai đọc được |
|---|---|---|
| Cookie `authjs.session-token` (prod: `__Secure-authjs.session-token`) | JWT **mã hoá JWE** (A256CBC-HS512) chứa access token, refresh token, roles | Chỉ server giải mã bằng `AUTH_SECRET`. Thuộc tính: `HttpOnly`, `SameSite=Lax`, `Path=/`, thêm `Secure` khi chạy HTTPS |
| Cookie `authjs.csrf-token` (prod: `__Host-authjs.csrf-token`) | CSRF token của NextAuth | `HttpOnly` |
| `GET /api/auth/session` | `user.id`, `user.email`, `expires`, `accessToken` | Client JS — **không** có refresh token, **không** có roles |
| RAM trong tab | access token để gắn `Authorization: Bearer` | Trang đang mở; F5 làm mất, tự phục hồi qua interceptor |
| DB `identity-service` | refresh token (hash), device, roles, permission | Chỉ backend |

Không có token nào trong `localStorage` / `sessionStorage` / cookie thường.

## 3. Luồng đăng nhập

```
LoginForm → LoginSchema (Zod, contracts — nguồn validation duy nhất)
  → signIn('credentials', { redirect: false })        [next-auth/react, POST /api/auth/callback/credentials]
    → NextAuth route handler → authorize() trong src/lib/auth.ts
      → LoginSchema.safeParse (validate lại ở server)
      → POST http://localhost:3001/v1/auth/login      [server-side nên KHÔNG dính CORS]
        → backend: bcrypt compare → access token (JWT RS256, 15 phút)
          + refresh token (random 256-bit, hash lưu DB, 30 ngày, gắn Device)
  → jwt callback nhét access/refresh token + roles + hạn vào payload
  → NextAuth mã hoá payload thành JWE → Set-Cookie authjs.session-token (HttpOnly)
  → signIn trả { error?, code? } cho form (lỗi thì toast theo mã, xem §7)
  → onSuccess: điều hướng về resolveSafeCallbackUrl(callbackUrl, '/')
```

## 4. Refresh phiên — ba đường vào, một cửa khoá

| Đường | Ai kích hoạt | Việc xảy ra |
|---|---|---|
| Chủ động | `SessionTokenWatcher` hẹn `update()` trước khi access token hết hạn 30 giây | POST `/api/auth/session` → jwt callback thấy sắp hết hạn → gọi `POST /v1/auth/refresh` → cookie mới → session trả token mới → RAM cập nhật |
| 401 đột ngột | Interceptor axios (F5 mất RAM, tab ngủ lâu…) | `getSession()` (trong khoá cross-tab) → server refresh → retry đúng **một lần** với token mới vừa lấy |
| Nhiều tab | Hai tab cùng thấy token sắp hết hạn | Khoá Web Locks `timmyhub-auth-refresh`: tab thua **đợi** tab thắng xoay token xong rồi mới đọc session (cookie mới đã nằm trong cookie jar dùng chung) |

Vì sao phải khoá cross-tab (design.md §5): backend xoay token bằng compare-and-swap, request thua trong một race
thật nhận `REFRESH_TOKEN_REUSED` và **bị thu hồi toàn bộ phiên** (REQ-IDN-006). Mutex trong RAM không qua được tab
nên chỉ Web Locks mới chặn được race này.

Xử lý kết quả refresh trong jwt callback:

| Backend trả | Xử lý |
|---|---|
| 200 | Thay access + refresh token mới, cập nhật `accessExpiresAt` |
| 401 (`REFRESH_TOKEN_REUSED` / `_EXPIRED` / `_INVALID`) | Phiên hết hiệu lực thật → xoá sạch token; mọi lần đọc session sau trả `null`, proxy điều hướng về login |
| Không phản hồi / 5xx | **Giữ nguyên phiên** và thử lại ở lần đọc session sau — backend sập một nhịp không được làm đăng xuất người dùng |

`accessExpiresAt` chỉ mang **một** nghĩa: hạn của access token. Không dùng nó làm backoff.

## 5. Điều hướng và `callbackUrl`

Tên tham số thống nhất là `callbackUrl` (REQ-IDN-032), do proxy sinh ra, không phải do client truyền lên khi vào
trang protected. Mọi chỗ điều hướng theo `callbackUrl` đều qua `resolveSafeCallbackUrl` (REQ-IDN-033) — resolve bằng
URL chuẩn rồi so **origin**, không so tiền tố chuỗi: `/\evil.com` và `\/evil.com` được trình duyệt hiểu là
`//evil.com` nên cách so `startsWith('/')` sẽ lọt lưới.

| Tình huống | Kết quả |
|---|---|
| Chưa đăng nhập vào trang protected | Proxy đá về `/login?callbackUrl=<đường dẫn gốc>` |
| Đã đăng nhập mà vào `/login` | Trang login tự `router.replace` về đích cũ (`getSession()` — chỉ tin phiên đã xác minh phía server, không tin cache) |
| Đăng nhập thành công | Về đúng `callbackUrl` nếu là đường dẫn tương đối, ngược lại về `/` |
| `callbackUrl` là URL ngoài (`https://evil.example.com`, `//evil.com`, `/\evil.com`) | Bỏ qua, về `/` |

## 6. Đăng xuất

1. `revokeSessionAction` (server action) đọc JWT từ cookie, lấy refresh token rồi gọi `POST /v1/auth/logout` — chỉ xoá
   cookie là chưa đủ: refresh token vẫn `ACTIVE` 30 ngày trong DB (REQ-IDN-007).
2. `signOut()` phía client xoá cookie HttpOnly **và** reset SessionProvider về `unauthenticated`.
3. `router.push('/login')` trong `onSettled` — luôn về login kể cả bước 1 lỗi.

## 7. Mã lỗi hiển thị cho người dùng

`authorize` ném `CredentialsSignin` với `code` lấy từ phản hồi backend; `next-auth/react` trả `code` đó cho form,
form dịch qua catalog `api` (dùng chung với backend, `i18n/request.ts`).

| Mã | Thông điệp | Ghi chú |
|---|---|---|
| `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng | Backend trả cùng mã cho "email không tồn tại" và "sai mật khẩu" — không tiết lộ email có tồn tại hay không |
| `ACCOUNT_LOCKED` (423) | Tài khoản đang bị tạm khoá | Khoá 15 phút sau 5 lần sai (REQ-IDN-004/028) |
| `ACCOUNT_BANNED` (403) | Tài khoản đã bị khoá vĩnh viễn | |
| `BACKEND_UNAVAILABLE` | Không kết nối được máy chủ | Mã riêng của FE (`constants/auth.ts`), backend không trả mã này |

## 8. Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `AUTH_SECRET` | Có (production) | Khoá mã hoá JWE. Thiếu ở production là NextAuth throw `MissingSecret`. Dev có thể để giá trị tạm nhưng **đổi secret là mọi phiên cũ chết** |
| `NEXT_PUBLIC_API_URL` | Có | Base URL backend (`http://localhost:3001` khi dev) |
| `AUTH_URL`, `AUTH_TRUST_HOST` | Khi self-host | Cần cho môi trường không phải Vercel hoặc khi Host header không đáng tin |

Middleware đọc `AUTH_SECRET`/`NEXT_PUBLIC_API_URL` ở edge runtime; Next inline biến lúc **build** nên đổi giá trị
phải build lại (dev thì khởi động lại `next dev`).

## 9. Chưa có / việc còn lại

- SSO Google/Facebook: provider chưa nối, nút trên form báo "tính năng chưa được kết nối".
- 2FA (REQ-IDN-030/031): login hiện chưa xử lý phản hồi `TWO_FACTOR_REQUIRED` kèm `challengeId`.
- Chặn theo role cho `/seller/*` (REQ-IDN-023 kịch bản 2): proxy đã có `request.auth` nhưng chưa map role → route.
- `POST /v1/auth/logout-all` (REQ-IDN-008) chưa có UI.
- Chưa tính năng nào gọi `apiClient` (trang `/users` còn dùng mock) nên đường "401 → refresh → retry" chưa được chạy
  thật lần nào; khi nối API thật nên kiểm tra đường này trước.
