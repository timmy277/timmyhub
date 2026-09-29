---
title: Review dự án — tiến độ, tuân thủ luật, auth/RBAC, kiểm thử
status: review
owner: Vega (người review) · Timmy (chủ dự án)
updated: 2026-09-29
related: [CLAUDE.md, docs/00-overview/project-plan.md, docs/06-quality/quality-gates.md, docs/03-specs/rbac-permission/tasks.md]
---

# Review dự án timmy-hub — 2026-09-29

Phạm vi: cấu trúc workspace, tiến độ so với kế hoạch, tuân thủ 25 luật cứng, auth + RBAC, UI/UX, nền tảng SEO, và toàn bộ cổng kiểm thử.
Phương pháp: **đọc code thật + chạy test thật**. Mọi kết luận đều kèm `file:line` hoặc số liệu đo được. Chỗ nào chưa đo được thì ghi rõ là chưa đo.

---

## 0. Kết luận nhanh

Nền tảng tốt, kỷ luật code cao, nhưng **chưa release-ready** và **tài liệu tiến độ đang nói dối về chính dự án**.

- **Điểm mạnh thật:** 0 lỗi typecheck trên cả 3 package · 0 lỗi lint · 80/80 test backend · 62/62 smoke HTTP RBAC · 41/41 kiểm thử UI bằng Chrome thật · outbox ghi cùng transaction · phạm vi dữ liệu trả `404` chứ không `403` (đúng luật #8) · thư viện nặng đã `next/dynamic` (đúng luật #12) · không có `any`/`@ts-ignore` trong mã nguồn.
- **Rủi ro lớn nhất:** mô hình phân quyền 4 lớp **thực chất chỉ có 3**. Lớp 4 (phạm vi dữ liệu) không tồn tại dưới dạng dùng chung, và lớp 1 (`@Roles`) đã khai nhưng **không endpoint nào dùng**.
- **Bug đáng lo nhất:** refresh token hết hạn, gửi hai lần, **thu hồi toàn bộ session của người dùng** — trái yêu cầu REQ-IDN-006.
- **Vấn đề quy trình:** 15/15 task RBAC vẫn `- [ ]`, mọi spec vẫn `status: draft`, `feature-inventory.md` không có cột trạng thái ⇒ không có cách nào biết dự án đang ở đâu nếu chỉ đọc tài liệu.
- **Chưa commit gì.** Working tree đang có 28 file thay đổi.

### 0.1 Cập nhật cuối ngày 29/09 — đã vá gì

Sau review, Timmy chốt phạm vi **"bug + warning code"** (không gồm nợ kiến trúc và phần lệch tài liệu còn lại). Trạng thái từng phát hiện:

| Phát hiện | Mức | Trạng thái |
|---|---|---|
| `PermissionsGuard` fail-open (`!required → true`) | P2 | **Đã vá** — fail-closed + `@AuthenticatedOnly()` + checker chặn khởi động |
| Refresh token hết hạn ⇒ thu hồi mọi phiên | P1 | **Đã vá** — chặn trước khi xoay + test hồi quy `auth.service.spec.ts` |
| `CreatePermissionSchema` chỉ nhận hậu tố `:any` | P3 | **Đã vá** — nhận mọi scope thường; smoke RBAC 62 → 65 assertion |
| Cache quyền hiệu lực không có trần | P2 | **Đã vá** — trần 5000, đuổi entry cũ nhất |
| `(protected)` index được, thiếu `robots.ts` | — | **Đã vá** — `noindex` ở layout + `app/robots.ts` |
| `api-server.ts` không có timeout | P3 | **Đã vá** — `AbortSignal.timeout`; axios thêm `timeout` |
| `clsx` + `tailwind-merge` thừa | P3 | **Đã vá** — bỏ khỏi `package.json` + lockfile |
| Lớp 1 (`@Roles`) là code chết | P2 | **Chưa** — ngoài phạm vi (kiến trúc) |
| Lớp 4 `DataScope` không tồn tại | P2 | **Chưa** — ngoài phạm vi (kiến trúc) |
| `logoutAll` không cắt access token đang sống | P1 | **Chưa** — cần `sessionId` trong JWT |
| Audit bypass SUPER_ADMIN không có dấu vết | P2 | **Chưa** |
| Lệch tài liệu (§1.3) | — | **Vá một phần** — ADR-0007/0018 đã sửa; task/spec/liên kết hỏng còn nguyên |

Commit: `5fd4e6b` → `ea31830` (8 commit trên `main`, **chưa push**). Cổng kiểm tra sau khi vá: jest 6 suite / 91 test · smoke-users 32/32 · smoke-rbac 65/65 · ui-rbac-check 41/41 · users-columns 128/128 · i18n 316/316 · prettier sạch · tsc + eslint 0 lỗi.

---

## 1. Đã đến bước nào rồi

### 1.1 Kế hoạch tuyên bố gì

Nguồn: `docs/00-overview/project-plan.md` bảng tóm tắt điều hành.

| Hạng mục | Kế hoạch |
|---|---|
| Tính năng đặc tả | 251 (`FEAT-*`) trên **23 domain**, cộng 6 tính năng loại bỏ |
| Nguồn gốc tính năng | 76 giữ nguyên + 27 mở rộng + 18 kế thừa phải sửa + **130 mới** |
| Đơn vị triển khai | 3 (`api` + `worker` + `worker-media`), **16 module domain** |
| Domain event | **86** (`EVT-*`) |
| ADR | **14** |
| Thời lượng | **36 tuần** (18 sprint × 2 tuần), GA ở tuần 26 |

Đã kiểm chứng: `event-catalog.md` đúng 86 event; có 14 file ADR (0001–0012, 0014, 0015); `feature-inventory.md` đúng 251 hàng `FEAT-*` + 6 hàng `FEAT-DEP-*`. Các con số này **nhất quán**.

### 1.2 Code thực tế tới đâu

| Hạng mục | Kế hoạch | Thực tế | Tỉ lệ thô |
|---|---|---|---|
| Module backend | 16 domain module | **3** (`catalog`, `identity`, `platform`) | ~19% |
| Đơn vị triển khai | 3 | 1 (`backend/apps/api`) — chưa có `worker`, `worker-media` | 33% |
| Thư mục spec | 23 domain | **9** | 39% |
| Spec đủ 3 file (req/design/tasks) | 23 | **1** (`rbac-permission`) | 4% |
| Feature FE có màn hình | 251 | 5 nhóm: `login`, `dashboard`, `home`, `users`, `rbac` | ~2% |

Kết luận thẳng: dự án đang ở **giai đoạn dựng khung**, đúng như chính `CLAUDE.md` mô tả ("Trạng thái hiện tại: đang dựng khung"). Nội dung đã làm được là **admin console cho identity + RBAC** — một lát cắt dọc hoàn chỉnh, không phải bề ngang của kế hoạch.

### 1.3 Lệch giữa tài liệu và code

Đây là phần cần xử lý sớm nhất, vì nó làm mất khả năng đọc tiến độ:

| # | Vấn đề | Bằng chứng |
|---|---|---|
| 1 | `docs/README.md` nói "23 domain spec, mỗi domain có `requirements.md`/`design.md`/`tasks.md`", nhưng cùng file lại nói "9 domain MVP" | `docs/README.md` (tự mâu thuẫn 23 vs 9); thực tế đúng 9 thư mục, chỉ 1 đủ 3 file |
| 2 | README khai `03-specs` = `approved` | **Cả 15 file spec đều `status: draft`** (`grep -rn "^status:" docs/03-specs/`) |
| 3 | 15/15 task RBAC chưa tick, spec `updated: 2026-09-19` | `docs/03-specs/rbac-permission/tasks.md` — trong khi `rbac.controller.ts` đã có **15 handler** và FE RBAC đã xong |
| 4 | `feature-inventory.md` **không có cột trạng thái** (chỉ có ID / Tính năng / Nguồn / Ưu tiên / Vai / Service) | ⇒ không thể theo dõi tiến độ từ file này |
| 5 | **18 liên kết chéo trỏ vào file không tồn tại** | `docs/03-specs/{chat-support,order-fulfillment,wallet-settlement}/design.md`, `docs/04-frontend/{component-inventory,design-system,fe-architecture,i18n,routes,state-and-data,storybook}.md`, `docs/05-infra/{cicd,environments,kubernetes}.md`, `docs/06-quality/definition-of-done.md`, `docs/07-plan/{implementation-plan,milestones}.md`, `docs/08-handoff/{handoff,migration-from-legacy}.md` |
| 6 | `feature-inventory.md` trỏ tới `order-fulfillment/design.md` nhưng **thư mục rỗng** | `find docs/03-specs/order-fulfillment` → không có file |
| 7 | Doc §4 viết tắt tên quyền nhóm `orders` (2 khúc) trong khi catalog dùng 3 khúc | `roles-and-permissions.md:161` ghi `orders:create`, catalog là `orders:orders:create` (`permissions.catalog.ts:99`). **8 tên lệch**: `orders:{create,read,list:any,list:shop,process,cancel,cancel:any,export}` |
| 8 | `TASK-RBAC-010` đòi cache Redis, code là `Map` in-process | `permission-cache.service.ts` — có ghi chú biện luận bằng ADR-0015 |

**Việc cần làm:** cập nhật `tasks.md` theo trạng thái code thật, sửa 18 liên kết chéo, thêm cột trạng thái vào `feature-inventory.md`, và chốt lại 23 hay 9 domain trong README. Đây là việc rẻ và trả lại khả năng đọc tiến độ.

---

## 2. Tuân thủ rule chưa

### 2.1 Luật cứng `CLAUDE.md` (25 điều)

| # | Luật | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Tiền `Decimal(14,2)`, chuỗi + `currency`, cấm `number` | **N/A** | chưa có code tiền tệ |
| 2 | Một service chỉ đụng DB của mình | ✅ | ADR-0015 modular monolith, 1 DB; chưa có ranh giới service để vi phạm |
| 3 | Event chỉ qua outbox, cùng transaction | ✅ | `rbac.repository.ts` — `writeOutboxEvent(tx, …)` nằm trong `$transaction` (dòng 201, 232, 255, 303) |
| 4 | Cập nhật tranh chấp `UPDATE … WHERE` | ✅ | `identity.repository.ts:158` — CAS `updateMany({ token, isRevoked:false, replacedBy:null })` |
| 5 | `Idempotency-Key` cho tạo/thanh toán | **N/A** | chưa có luồng thanh toán |
| 6 | **4 lớp phân quyền** | ❌ **chỉ có 3** | lớp 4 (`DataScope`) **không tồn tại**: `grep -rn "whereForScope\|DataScope"` → 0 kết quả. Lớp 1 có `RolesGuard` nhưng **0 endpoint dùng `@Roles`** |
| 7 | Lọc phạm vi **trong câu truy vấn** | ⚠️ | không có helper dùng chung, nhưng điều kiện được đưa vào `where` Prisma (`users.service.ts:47-62`) — đúng tinh thần, thiếu abstraction |
| 8 | Ngoài phạm vi trả **404 không 403** | ✅ | `users.service.ts:159-175` — `requireVisibleUser`/`requireManageableUser` ném `NOT_FOUND` |
| 9 | Component đủ **7 trạng thái** | ⚠️ | `ag-grid-table.tsx:166` tự khai đủ 7 trạng thái; chưa đo được từng màn |
| 10 | Token design system; animation chỉ `transform`/`opacity`; tôn trọng `prefers-reduced-motion` | ⚠️ | component tự viết **có** (`ag-grid-table.tsx:451`, `confirm-dialog.tsx:93` dùng `motion-reduce:animate-none`); **primitive shadcn vendored thì không** (`ui/{dialog,dropdown-menu,popover,select,sheet,alert-dialog,combobox}.tsx` dùng `data-open:animate-in` không kèm `motion-reduce:`) |
| 11 | WCAG 2.2 AA, tương phản ≥ 4.5:1 | ⚠️ **chưa đo** | có `focus-visible:` ở `float-input.tsx`, `float-combobox.tsx`, `icon-button-with-tooltip.tsx`. **Chưa chạy Lighthouse/axe** ⇒ không được coi là đạt |
| 12 | Thư viện nặng phải `next/dynamic` | ✅ | `ag-grid-table-lazy.tsx` — AG Grid chỉ nạp qua `dynamic` |
| 13 | Mặc định Server Component; không fetch trong `useEffect` | ✅ | `grep useEffect` + `fetch(` → 0 ca |
| 14 | `strict: true`, không `any`, không `@ts-ignore` | ✅ | `tsconfig.base.json:15`, `frontend/tsconfig.json:7`; grep `: any`/`@ts-ignore` trong `src` (trừ `.spec.ts`) → 0 |
| 15 | Zod là nguồn validation duy nhất | ✅ | `shared/contracts` dùng chung; `PERMISSION_DEFINITIONS` là nguồn duy nhất của danh mục quyền |
| 16 | Việc chậm đẩy sang BullMQ | ⚠️ | chưa có `worker` app; chưa có việc chậm nào để đẩy |
| 17 | Không commit bí mật | ✅ | chỉ `.env.example` được track |
| 18 | Ô nhập dùng field **label nổi** | ✅ | `FloatInput`/`FloatTextarea`/`FloatCombobox`; `<Label>` rời chỉ xuất hiện ở checkbox (`column-management.tsx:70`) — đúng ngoại lệ luật cho phép |
| 19 | Component UI từ shadcn; hỏi trước khi tự viết | ✅ | `components/ui/` giữ nguyên bản (ADR-0006) |
| 20 | Nhóm State → Hooks → Derived → Handlers → Effects, mở bằng `// ===== … =====` | ✅ | quan sát đúng ở các file đã đọc |
| 21 | Import 4 nhóm; **chỉ qua barrel** | ⚠️ | `components/ui/tabs.tsx:5` — `import { cn } from 'cn'` đi thẳng vào package, phá quy ước "cửa vào duy nhất `@/utils`" mà chính `utils/cn.ts` đặt ra |
| 22 | Đúng chỗ: `constants/` `schemas/` `utils/` `config/columns/` `mocks/` | ⚠️ | có thêm `src/services/api-client.ts` và `src/lib/api-server.ts` — **hai API client song song** (xem §3 P3) |
| 23 | Const object + type suy ra, không `enum`; type chung ở contracts | ✅ | `UserRole` const object; `PermissionName` suy ra từ `PERMISSION_DEFINITIONS` |
| 24 | Ưu tiên shadcn; debounce; toast; `AlertDialog`; `Skeleton`; responsive 360px | ✅ | `ConfirmDialog` cho hành động xoá; `toast` qua `sonner` |
| 25 | Zustand đọc qua selector | ✅ | grep `useStore()` trần → 0 |

**Tổng: 14 đạt · 7 cần để mắt · 1 vi phạm rõ (luật #6) · 2 N/A.**

### 2.2 Bảy luật sắt của `fullstack-dev`

| Luật | Kết quả | Ghi chú |
|---|---|---|
| Tổ chức theo **feature**, không theo layer | ✅ | `frontend/src/features/{users,rbac}`; backend `identity/rbac/users` |
| Controller không chứa nghiệp vụ | ✅ | `rbac.controller.ts` chỉ nhận/validate input rồi gọi service |
| Service không import kiểu HTTP | ✅ | service nhận `Actor` thuần, không nhận `Request` |
| Config từ env, validate lúc khởi động, fail fast | ✅ | `identity.config` ném lỗi khi thiếu `JWT_ACCESS_PRIVATE_KEY` |
| Mọi lỗi có kiểu, được log, trả format nhất quán | ✅ | `ApiError` + `ApiExceptionFilter` + `ApiErrorCode` |
| Mọi input validate ở biên | ✅ | `ZodValidationPipe` trên từng handler |
| Structured JSON logging + request ID | ⚠️ **chưa xác minh** | có `Logger` của Nest; chưa xác minh có request-ID xuyên suốt |
| Health check `/health`, `/ready` | ⚠️ | `platform.controller.ts` có `PLATFORM_ROUTE.HEALTH`, nhưng chưa xác minh có `/ready` kiểm DB |
| CORS origin tường minh | ✅ | có commit riêng "let the frontend origin call the API over CORS" |
| Graceful shutdown SIGTERM | ⚠️ **chưa xác minh** | — |

### 2.3 Quality gate của `frontend-dev`

| Gate | Kết quả |
|---|---|
| Không placeholder URL (`unsplash`, `picsum`, `placehold…`) | ✅ không có (đây là admin console, không dùng ảnh ngoài) |
| Không emoji trong UI | ✅ (chỉ 1 ký tự `⚠` trong **comment** ở `lib/auth.ts:59`, không lên giao diện) |
| `min-h-[100dvh]` thay `h-screen` | ✅ `layout.tsx` dùng `min-h-full flex flex-col` |
| Đủ trạng thái loading/empty/error | ⚠️ xem luật #9 |
| `prefers-reduced-motion` | ⚠️ xem luật #10 |
| Chỉ animate thuộc tính GPU | ✅ chỉ dùng `animate-in/fade/zoom/spin` + `slide-in-from-*` (transform/opacity) |
| Font: tránh `Inter` | ⚠️ **có dùng `Inter`** (`constants/theme/fonts.ts:13,29`) — nhưng đây là **1 trong 8 font cho người dùng tự chọn** trong theme customizer, không phải font mặc định áp đặt. Skill là bên thứ ba, `CLAUDE.md` thắng khi mâu thuẫn ⇒ ghi nhận, không coi là vi phạm |

### 2.4 Ghi chú về hai skill anh gắn

- **`markitdown-skill`: không áp dụng được.** Nó dùng để chuyển PDF/Word/PowerPoint/ảnh/HTML sang Markdown, nhưng toàn bộ tài liệu dự án **đã là `.md`** rồi. Không có mục tiêu nào để chuyển. Nếu sau này có tài liệu thiết kế dạng `.docx`/`.pdf` từ bên ngoài thì mới dùng.
- **`seo-ops`: công cụ không chạy được, nhưng khung tư duy thì dùng được.** `content_attack_brief.py`/`gsc_client.py` cần `AHREFS_TOKEN` + xác thực Google Search Console + một domain đã lên sóng; dự án **chưa có storefront** nên không có gì để đo. Tôi dùng phần *tiêu chí* của nó để soi kế hoạch SEO trong `docs/04-frontend/seo.md` đối chiếu với code — kết quả ở §6.

---

## 3. Bug auth + RBAC

Tất cả mục dưới đây **đã đọc code để kiểm chứng**, không suy đoán từ tài liệu.

### P1 — Refresh token hết hạn, gửi hai lần, thu hồi toàn bộ session

`AuthService.refresh()` gọi `rotateRefreshToken()` **trước khi** kiểm tra hạn token; CAS không lọc `expiresAt`.

- `auth.service.ts:105-112` — gọi `rotateRefreshToken()` ngay
- `identity.repository.ts:158-161` — CAS `where: { token, isRevoked: false, replacedBy: null }` ⇒ **không có điều kiện hạn**
- `auth.service.ts:124-126` — **sau đó mới** kiểm `expiresAt` và ném `REFRESH_TOKEN_EXPIRED`

Diễn biến với một refresh token đã hết hạn:

1. **Lần gọi đầu:** CAS khớp (`count = 1`) → token cũ bị đánh dấu `replacedBy`, **một hàng refresh token mới hợp lệ được tạo** (`identity.repository.ts:178-186`) → rồi mới ném `REFRESH_TOKEN_EXPIRED`. Client không nhận được token mới ⇒ **hàng token mồ côi**.
2. **Lần gọi thứ hai** với đúng token cũ: CAS trượt → `previous.replacedBy != null` ⇒ `wasRotatedBefore = true` (`auth.service.ts:115-120`) ⇒ **`revokeAllUserRefreshTokens()`**.

⇒ Một token hết hạn gửi hai lần **đăng xuất mọi thiết bị của người dùng**. Trái REQ-IDN-006 kịch bản 2 (token hết hạn chỉ được trả `REFRESH_TOKEN_EXPIRED`). Nhánh `REFRESH_TOKEN_REUSED` vốn dành cho token bị đánh cắp, nhưng token hết hạn rơi vào đúng nhánh đó.

**Sửa:** kiểm hạn **trước** CAS, đưa `expiresAt > now` vào `where`, và gộp "đánh dấu token cũ + tạo token mới" vào **một transaction**. Thêm test cho: hết hạn lần đầu, hết hạn lần sau, đã rotated, đã revoked, hai refresh đồng thời.

### P1 — `logoutAll()` và hạ quyền không thu hồi access token đang lưu hành

- `auth.service.ts:147-153` — `logoutAll()` chỉ gọi `revokeAllUserRefreshTokens()`
- `auth.service.ts:184-197` — `signAccessToken` ký payload `{ sub, email, roles }`, **không có `sessionId`**
- `permissions.guard.ts:33` — `if (isSuperAdmin(user.roles)) return true` — đọc **roles từ JWT**, không đọc DB

⇒ Access token đã phát vẫn được chấp nhận tới hết TTL (15 phút). Và khi **hạ quyền `SUPER_ADMIN`**, token cũ vẫn giữ nguyên đường bypass trong phần TTL còn lại.

**Sửa:** thêm `sessionId` vào token + guard, denylist theo REQ-IDN-008, thu hồi khi lock/logout-all/hạ quyền đặc quyền. Nếu chấp nhận cửa sổ 15 phút thì phải sửa requirement và ghi rõ đánh đổi.

### P2 — `PermissionsGuard` **fail-open** khi endpoint không khai `@Permissions`

`permissions.guard.ts:29` — `if (!required || required.length === 0) return true`. Nghĩa là **endpoint mới thêm mà quên khai `@Permissions` sẽ mở cho mọi người dùng đã đăng nhập**. `RolesGuard` cũng y hệt (`roles.guard.ts:27`).

Hiện **chưa bị khai thác**: đã rà toàn bộ 6 controller, mọi endpoint không `@Public()` đều có `@Permissions`. Nhưng không có lưới an toàn:

- `RbacConsistencyChecker` (`rbac-consistency.checker.ts`) **chỉ bắt chiều "khai mà chưa seed"** — nó gom các `@Permissions` đang dùng rồi đối chiếu catalog + DB. Nó **không** phát hiện handler không khai gì.
- `TASK-RBAC-012`/`013` (test ma trận phủ 100% endpoint) đều chưa tick.

**Sửa:** đảo mặc định — nếu handler không có `@Public()` và không có `@Permissions` thì **từ chối**, hoặc để `RbacConsistencyChecker` chặn khởi động. Rẻ, và bịt được cả một lớp lỗi tương lai.

### P2 — Lớp 1 phân quyền là code chết

`grep -rn "@Roles("` → **0 kết quả**. `RolesGuard` được đăng ký (`platform.module.ts:24`) nhưng không endpoint nào dùng. Thiết kế "ai vào được do permission quyết định, không phải role" là **cố ý và tốt** (đã ghi ở `users.controller.ts:21-23`), nhưng `TASK-RBAC-001` và REQ-RBAC-001 vẫn mô tả lớp 1 như một lớp đang hoạt động ⇒ tài liệu sai. Chọn một: hoặc bỏ lớp 1 khỏi kiến trúc, hoặc dùng nó thật.

### P2 — Lớp 4 (phạm vi dữ liệu) không tồn tại

`grep -rn "whereForScope\|DataScope"` → **0 kết quả** trong toàn bộ backend. `REQ-RBAC-007` và `TASK-RBAC-005` yêu cầu nó áp cho mọi `findMany` nghiệp vụ.

Hiện **chưa gây hại** vì: chỉ có màn quản trị, và `identity:users:*` được thiết kế là toàn sàn (không có biến thể `:own` — `users.service.ts:32-35`). Nhưng khi có seller/shop, **không có cơ chế nào** đảm bảo seller A không đọc được dữ liệu seller B. Đây là nợ chặn đường, không phải nợ trang trí.

### P2 — Bypass `SUPER_ADMIN` không để lại vết bền

`roles.guard.ts:33-36` chỉ gọi `logger.warn`. Comment ngay trên thừa nhận "chưa có audit module nên tạm ghi log". Yêu cầu là bypass **phải để lại vết** — log không phải vết kiểm toán. `TASK-RBAC-007` cũng yêu cầu audit ghi diff trước/sau khi sửa vai trò: chưa có.

### P2 — Cache quyền là `Map` trong một process, không giới hạn kích thước

`permission-cache.service.ts:13` — `new Map()`, TTL 15 phút, **không có LRU/giới hạn size**. Với nhiều replica API, invalidation chỉ có tác dụng trong process hiện tại ⇒ replica khác giữ quyền cũ tới 15 phút. Có biện luận bằng ADR-0015 (1 process) — hợp lý **hôm nay**, nhưng phải ghi vào lộ trình trước khi scale. Xác nhận bằng môi trường: **Redis (6379) không chạy**, đúng như thiết kế hiện tại.

### P3 — `CreatePermissionSchema` chỉ cho phạm vi `:any`, catalog có `:shop`

`shared/contracts/src/rbac.schema.ts:35` — regex `^…(:any)?$`. Nhưng catalog có `orders:orders:list:shop` (`permissions.catalog.ts:103`). ⇒ **Không tạo được quyền phạm vi `:shop` qua API**, form FE cũng chỉ có ô "any". Đây là lệch sẵn có giữa danh mục seed và schema tạo. Smoke test đã ghi chú lại việc này.

### P3 — Hai API client song song

`src/lib/api-server.ts` (fetch, chạy trên server, token từ cookie HttpOnly) và `src/services/api-client.ts` (axios, chạy trên trình duyệt, có interceptor + khoá refresh liên tab qua Web Locks). Cả hai đều viết tốt và có lý do riêng — nhưng là **hai đường ống phải bảo trì song song**, và `fullstack-dev` §5 khuyến nghị chọn một. Cân nhắc gom logic "đọc mã lỗi / phân loại backend chết" vào một chỗ dùng chung.

Thêm: `api-server.ts` **không có timeout**. Backend treo ⇒ Server Component treo theo. (Chính smoke test từng vấp đúng chuyện này và phải thêm `AbortSignal.timeout`.)

### P3 — Dependency thừa

`clsx` + `tailwind-merge` vẫn nằm trong `frontend/package.json` nhưng **không còn file nào import trực tiếp** — `utils/cn.ts` đã chuyển sang gói `cn` (bản biên dịch sẵn của `twMerge(clsx(...))`). Gỡ được 2 dep.

### Đã sửa trong lúc review

`users.service.ts` trong working tree (chưa commit) **đã thêm** `PermissionCacheService` và gọi `invalidateUser(userId)` khi `input.roles !== undefined`, kèm 1 test mới trong `users.service.spec.ts`. ⇒ **P1 "PATCH user đổi role không invalidate cache quyền" nay đã hết.** Số test backend tăng 79 → 80, khớp.

Lưu ý: file này đổi **giữa lúc tôi review**, và tiến trình API đã restart (PID 3001 đổi từ 20448 → 15144). Xem §4.4.

---

## 4. Kết quả kiểm thử

### 4.1 Cổng tĩnh

| Cổng | Kết quả |
|---|---|
| `tsc --noEmit` — `frontend` | **0 lỗi** |
| `tsc --noEmit` — `backend/libs/modules` | **0 lỗi** |
| `tsc --noEmit` — `backend/apps/api` | **0 lỗi** |
| `eslint --max-warnings=0` — `frontend/src` | **0** |
| `eslint --max-warnings=0` — `backend/{libs/modules,apps/api}/src` | **0** |
| `prettier --check .` | ❌ **2 file**: `frontend/next-env.d.ts`, `frontend/tsconfig.json` |
| `jest` (`backend/apps/api`) | **80/80**, 5 suite |

Về 2 file prettier: `next-env.d.ts` **không được git track** (Next tự sinh) nên chỉ là nhiễu — thêm vào `.prettierignore`. `tsconfig.json` **có** được track ⇒ đây là lỗi thật, chạy `prettier --write` là xong.

### 4.2 HTTP thật

| Harness | Kết quả |
|---|---|
| `smoke-users.cjs` | **32/32** |
| `smoke-rbac.cjs` | **62/62** |

### 4.3 UI thật (Chrome có sẵn qua CDP)

| Harness | Kết quả |
|---|---|
| `ui-rbac-check.cjs` | **41/41** |
| `users-columns-check.cjs` | **128/128** |
| `i18n-check.cjs` | **316/316** parity · 0 dead key · 0 placeholder drift |

### 4.4 Hai lần chạy đỏ oan — cần biết để không mất thời gian sau này

1. **`smoke-rbac.cjs` crash `ECONNRESET`** ở bước login. Chạy lại **62/62**. ⇒ lỗi kết nối nhất thời; harness **không có retry** cho lỗi mạng.
2. **`ui-rbac-check.cjs` chỉ 33/41** — cả 8 assertion đỏ đều ở `/permissions` với `rows=0`, trong khi `/roles` và form tạo quyền vẫn xanh. Chạy lại **41/41**. Nguyên nhân: **API restart giữa lúc chạy** (do `users.service.ts` vừa bị sửa) ⇒ fetch phía server của trang permission không có dữ liệu. Bằng chứng độc lập: PID cổng 3001 đổi 20448 → 15144.

⇒ **Đây không phải bug của sản phẩm.** Nhưng nên thêm vào harness: chờ `/health` trả 200 trước khi bắt đầu, và retry một lần cho lỗi mạng. Không thì mỗi lần sửa code backend song song là một lần đỏ oan.

---

## 5. UI/UX

Điểm đáng khen (đã kiểm bằng Chrome thật, có ảnh chụp):

- Màn **tab kiểu folder** cho user/role/permission: chỉ tab đang xem nằm trên URL (`tabs=create|update:<id>|detail:<id>`) ⇒ chia sẻ link được; tab đã mở nhớ trong `localStorage`.
- Lưới AG Grid 36 đúng quy ước: cột thao tác ghim phải, role có 3 thao tác, permission có 2 (không có Sửa — đúng vì quyền là bất biến).
- Form dùng field **label nổi** nhất quán; `FloatTextarea` render ra `<textarea>` thật.
- Xem trước tên quyền ghép trực tiếp khi gõ, và nói rõ khi chưa đủ phần — chi tiết nhỏ nhưng đúng kiểu "đừng để người dùng đoán".
- Hành động xoá đi qua `ConfirmDialog`.

Cần cải thiện:

1. **`prefers-reduced-motion` chưa phủ primitive shadcn** (luật #10). Cách sửa **không** đụng file vendored: thêm một khối `@media (prefers-reduced-motion: reduce)` trong `globals.css` tắt animation toàn cục. Giữ được ADR-0006 (an toàn với `shadcn add --overwrite`).
2. **Chưa đo WCAG.** Có `focus-visible` nhưng chưa có số liệu tương phản / vùng bấm ≥ 24×24. `quality-gates.md` chặn merge ở Accessibility ≥ 95 — chưa ai chạy Lighthouse nên **chưa biết mình đang ở đâu**.
3. **`components/ui/tabs.tsx:5`** import `cn` thẳng từ package `cn`, phá quy ước cửa vào duy nhất. Sửa 1 dòng.
4. Cân nhắc: khu quản trị hiện **không có** `noindex` (xem §6) — vừa là lỗi SEO vừa là rò rỉ thông tin cấu trúc.

---

## 6. SEO

`docs/04-frontend/seo.md` là tài liệu **tốt** — chiến lược render theo loại trang, quy ước URL, metadata, JSON-LD, sitemap, xử lý nội dung trùng lặp đặc thù sàn. Vấn đề là **chưa có gì trong đó được hiện thực**, và có hai chỗ đã lệch ngay từ đầu:

| Yêu cầu trong `seo.md` | Thực tế |
|---|---|
| §1: "Toàn bộ khu seller/admin: Client, `noindex` + chặn trong robots" | ❌ `(protected)/layout.tsx` **không** đặt `robots`. Chỉ `(public)/(auth)/layout.tsx:6` có `robots: { index: false, follow: false }`. ⇒ `/dashboard`, `/users`, `/roles`, `/permissions` **đang cho phép index** |
| §5: `robots.txt` chặn `/api/`, `/seller/`, `/admin/`, `/account/` | ❌ **Không tồn tại** `robots.ts`/`robots.txt` và **không có** `sitemap.ts`. Trớ trêu: `proxy.ts:46` đã whitelist `sitemap.xml`/`robots.txt` khỏi middleware — code đã chuẩn bị chỗ nhưng file chưa có ⇒ hiện trả 404 |
| §3: mỗi route xuất `generateMetadata` | ✅ các route hiện có đều có |
| §4 JSON-LD, §5 sitemap, §6 chống trùng lặp | chưa có (chưa có storefront) |

**Việc rẻ và nên làm ngay:** thêm `robots.ts` (chặn khu quản trị + `/api/`) và đặt `robots: { index: false, follow: false }` cho nhóm `(protected)`. Đây là 2 việc nhỏ, chặn được việc Google index nhầm trang quản trị — thứ rất khó gỡ về sau.

---

## 7. Đề xuất tối ưu (theo thứ tự nên làm)

**Đợt 1 — rẻ, chặn rủi ro thật (nên làm ngay)**

1. Sửa **refresh token hết hạn** (§3 P1): kiểm hạn trước CAS + gộp vào 1 transaction + test 5 ca. Đây là bug nặng nhất đang mở.
2. Đảo mặc định **fail-closed** cho `PermissionsGuard`/`RolesGuard`, hoặc để `RbacConsistencyChecker` chặn khởi động khi có handler không khai quyền.
3. Thêm `robots.ts` + `noindex` cho `(protected)` (§6).
4. `prettier --write` `frontend/tsconfig.json`; thêm `next-env.d.ts` vào `.prettierignore`.
5. Gỡ `clsx` + `tailwind-merge`; sửa `components/ui/tabs.tsx` dùng `@/utils`.
6. Thêm timeout cho `api-server.ts` (`AbortSignal.timeout`) — backend treo thì UI không được treo theo.

**Đợt 2 — trả lại khả năng đọc tiến độ (rẻ, giá trị cao)**

7. Cập nhật `tasks.md` RBAC theo code thật; đổi `status` spec từ `draft` sang trạng thái phản ánh thực tế.
8. Sửa **18 liên kết chéo hỏng**; thêm cột trạng thái vào `feature-inventory.md`; chốt 23 hay 9 domain trong README.
9. Sửa 8 tên quyền nhóm `orders` trong `roles-and-permissions.md` cho khớp catalog (3 khúc).
10. Quyết định số phận nhánh `mock/rbac` (xem §8) rồi dọn.

**Đợt 3 — trả nợ kiến trúc trước khi mở rộng**

11. Làm **lớp 4** (`DataScope`/`whereForScope`) trước khi có màn seller đầu tiên. Muộn hơn sẽ phải sửa mọi `findMany` đã viết.
12. `sessionId` trong token + denylist (REQ-IDN-008).
13. Audit thật cho bypass `SUPER_ADMIN` và diff vai trò (TASK-RBAC-007).
14. Chuyển cache quyền sang Redis khi có replica thứ hai; thêm giới hạn size/LRU cho cache cục bộ.
15. Bật Lighthouse CI theo `quality-gates.md` (Accessibility/SEO ≥ 95) — hiện chưa ai đo nên chưa biết đang ở đâu.

---

## 8. Việc cần chủ dự án quyết

1. **Nhánh `mock/rbac`: đề xuất ĐỪNG hợp nhất.** Đo được: `main` đi trước **17 commit**, `mock/rbac` trước **1**. Nhưng nhánh mock chứa các route `/roles/[id]/edit`, `/roles/new`, `/permissions/[id]`… tức **cách làm theo route** mà anh đã bác bỏ khi chọn "Tab như màn user". Hợp nhất sẽ kéo ngược kiến trúc. Đề xuất: chỉ nhặt lại tài liệu/ADR nếu có gì giá trị, rồi **xoá nhánh**.
2. **Nới regex `CreatePermissionSchema` cho phạm vi `:shop`?** Catalog đã có `orders:orders:list:shop` nhưng API không tạo được ⇒ danh mục seed và đường tạo đang lệch nhau.
3. **Làm lớp 4 (`DataScope`) ngay bây giờ hay để tới màn seller đầu tiên?** Nếu để muộn, chi phí tăng theo số `findMany` đã viết.
4. **Lớp 1 (`@Roles`)**: bỏ khỏi kiến trúc và sửa tài liệu, hay dùng thật?
5. **3 file trong working tree** (28 file thay đổi, gồm bản sửa cache invalidation) — có muốn tôi commit theo nhóm không? Quy ước dự án là không tự commit.

---

## 9. Phụ lục — chạy lại toàn bộ

Node dùng chung: `C:/Users/MSI STEALTH 15/.workbuddy-ai/binaries/node/versions/22.22.2-3/node.exe`.
Điều kiện: Next (3000), Nest (3001), Postgres (5432) đang chạy. Redis không cần.

```bash
# tĩnh
cd frontend && node <repo>/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit
cd backend/libs/modules && node <repo>/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit
cd backend/apps/api && node <repo>/node_modules/.pnpm/jest@30.5.1_*/node_modules/jest/bin/jest.js
cd <repo> && node node_modules/.pnpm/prettier@3.9.7/node_modules/prettier/bin/prettier.cjs --check .

# HTTP + UI (harness trong workspace)
node smoke-users.cjs
node smoke-rbac.cjs
node ui-rbac-check.cjs
node users-columns-check.cjs
node i18n-check.cjs
```

Nhắc lại: **rebuild `dist` của `@timmyhub/contracts` và `@timmyhub/modules` mỗi khi sửa `src`**, không thì API chạy code cũ và test đỏ oan.
