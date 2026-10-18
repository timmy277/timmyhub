# CLAUDE.md — timmy-hub

Sàn thương mại điện tử kiểu Shopee: trung tâm trao đổi **admin ↔ user ↔ seller**. Seller đăng bán, đăng bài post,
video quảng cáo và quản lý doanh số.

**Trạng thái hiện tại: đang dựng khung.** `backend/` (NestJS modular monolith: identity, rbac, platform),
`frontend/` (Next.js 16: auth, dashboard, quản trị user bản demo) và `shared/contracts` đã có code. Được thêm
dependency khi việc cần (ưu tiên thư viện đã chọn trong `project-plan.md`), nêu tên + lý do trong báo cáo; thư viện
nặng phía FE vẫn theo luật #12. Không mở rộng phạm vi ngoài việc được giao.

---

## 1. Ngôn ngữ và văn phong

- Văn xuôi, comment, nội dung tài liệu: **tiếng Việt**. Riêng **commit message: tiếng Anh** — chi tiết ở
  `docs/06-quality/git-hooks.md`.
- Mọi identifier — tên service, bảng, field, route, enum, event, biến, hàm, component: **tiếng Anh**.
  Không dịch `OrderStatus.PENDING`, `order.paid`, `SellerProfile`.
- Chuỗi hiển thị cho người dùng: **không hardcode**, luôn đi qua `next-intl` (FE) hoặc catalog thông điệp (BE).

## 2. Bản đồ tài liệu

| Cần biết | Đọc |
|---|---|
| Toàn cảnh, số liệu, phụ lục | `docs/00-overview/project-plan.md` |
| Danh mục tính năng `FEAT-*` | `docs/00-overview/feature-inventory.md` |
| Service nào sở hữu cái gì | `docs/01-architecture/service-catalog.md` |
| Event, payload, producer/consumer | `docs/01-architecture/event-catalog.md` |
| Đua tranh, khoá, giao dịch | `docs/01-architecture/concurrency-and-consistency.md` |
| Phân quyền nâng cao | `docs/01-architecture/rbac-advanced.md` |
| Bảo mật | `docs/01-architecture/security.md` |
| Video, upload, transcode | `docs/01-architecture/media-video-pipeline.md` |
| Quy ước code + tiền tệ | `docs/06-quality/coding-standards.md` |
| Ngân sách hiệu năng | `docs/06-quality/performance.md` |
| Chiến lược render SSG/ISR/SSR/CSR, `TASK-PERF-*` | `docs/06-quality/performance-campaign.md` |
| Cổng chất lượng CI | `docs/06-quality/quality-gates.md` |
| Chuyển động, hiệu ứng, parallax | `docs/04-frontend/motion-and-effects.md` |
| SEO | `docs/04-frontend/seo.md` |

Mục lục đầy đủ và lối đọc theo vai trò: `docs/README.md`.

## 3. Luật cứng — vi phạm là chặn merge

**Dữ liệu và tiền**

1. Tiền lưu `Decimal(14,2)`, truyền qua API là **chuỗi + `currency`**, tính bằng `Prisma.Decimal` (BE) hoặc
   `dinero.js` (FE). **Cấm** `price * qty` bằng `number`. Làm tròn đúng một lần ở cuối.
2. Một service chỉ đụng database của chính nó. Cần dữ liệu domain khác thì gọi RPC hoặc nghe event —
   **không** query chéo database, không join qua ranh giới service.
3. Phát event **chỉ** qua transactional outbox, trong cùng transaction với thay đổi nghiệp vụ. Consumer phải
   idempotent (`processed_events`).
4. Cập nhật tranh chấp (tồn kho, ví, voucher) dùng `UPDATE … WHERE` nguyên tử hoặc khoá, **không** đọc-rồi-ghi.
5. Thao tác tạo/thanh toán nhận `Idempotency-Key`.

**Phân quyền**

6. Bốn lớp: xác thực → role → permission `module:resource:action` → phạm vi dữ liệu.
7. Lọc phạm vi **trong câu truy vấn** (`whereForScope`), không `.filter()` sau khi đã lấy về.
8. Tài nguyên ngoài phạm vi trả **`404`**, không phải `403` — `403` là rò rỉ sự tồn tại.

**Giao diện**

9. Mọi component có đủ **7 trạng thái**: mặc định · đang tải (skeleton đúng kích thước) · rỗng · lỗi ·
   không có quyền · vô hiệu hoá · thành công.
10. Chỉ dùng token của design system. Animation chỉ `transform` và `opacity`. Tôn trọng `prefers-reduced-motion`.
11. WCAG 2.2 AA: tương phản ≥ 4.5:1, vùng bấm ≥ 24×24 px, dùng được bằng bàn phím, ưu tiên primitive Radix.
12. Thư viện nặng (TipTap, Uppy, `hls.js`, AG Grid, Recharts, Motion) **phải** `next/dynamic` — 0 KB vào gói chung.
13. Mặc định là Server Component; `'use client'` đặt ở phạm vi nhỏ nhất. Mọi việc lấy dữ liệu (data fetching) BẮT BUỘC thực hiện ở Server Component (`page.tsx` fetch và truyền `initialData`) hoặc dùng TanStack Query (`useQuery` kết hợp `QUERY_KEY` factory). Tuyệt đối cấm dùng `useEffect` + `useState(loading)` hoặc gọi API client thủ công.

**Chung**

14. TypeScript `strict: true` ở mọi package. Không `any`, không `@ts-ignore` không kèm lý do.
15. Zod là nguồn validation duy nhất, schema dùng chung FE/BE qua `@timmyhub/contracts`.
16. Không đưa việc chậm (mail, transcode, index) vào đường xử lý request — đẩy sang BullMQ.
17. Không commit bí mật. Giá trị trong `.env` chỉ đọc **tên biến**, không đọc giá trị.
18. Ô nhập trong form luôn dùng field có **label nổi** — `FloatInput`, `FloatCombobox`, `FloatMultiSelect`, `FloatDatePicker`, `FloatDateRangePicker` từ
    `@/components` — không ghép `<Label>` riêng với `<Input>`/`Select`. `Label` rời chỉ dành cho checkbox, radio, switch.
19. Component giao diện lấy từ **shadcn/ui** (`shadcn add`). Cần một component shadcn chưa có thì cài bằng CLI;
    muốn **tự viết** component mới (kể cả bọc lại primitive shadcn) phải **hỏi ý chủ dự án trước**, không tự tạo.

**Tổ chức mã** (chi tiết + ví dụ ❌/✅: `coding-standards.md` §3.2, §4.1–4.6, §6)

20. Component/hook xếp nhóm theo thứ tự **State → Hooks → Derived → Handlers → Effects**; class backend theo
    **Dependencies → Lifecycle → Queries → Commands → Event handlers → Private helpers**. Mỗi nhóm mở bằng
    `// ===== <Tên nhóm> =====`.
21. Import bốn nhóm cách dòng trống: ngoài → `@timmyhub/*` → `@/…` → tương đối. Chỉ import qua barrel.
22. Đúng chỗ: hằng số `constants/`, schema `schemas/`, hàm thuần `utils/`, cột AG Grid `config/columns/`, URL API
    `constants/api-route.ts`, dữ liệu giả `mocks/`, SVG path `components/icons/icon-path.tsx`. Không khai báo trong
    file component.
23. Tập giá trị hữu hạn dùng **const object + type suy ra** (`UserRole.SUPER_ADMIN`), không chuỗi trần, không
    `enum` TypeScript. Type dùng chung FE/BE nằm ở `@timmyhub/contracts`, cả hai phía import từ đó.
24. Control tương tác phải dùng component shadcn/component dự án: `Button`, `Input`/`FloatInput`, `Select`/`FloatSelect`,
    `Textarea`/`FloatTextarea`; ảnh dùng `Image` từ `next/image`. Không viết thẻ native tương tác trực tiếp trong feature
    UI. Thẻ cấu trúc/ngữ nghĩa như `div`, `p`, `section`, `main`, `table` vẫn dùng khi phù hợp; không thay chúng bằng
    component không cùng ngữ nghĩa hoặc làm đổi giao diện. Ô tìm kiếm qua `useDebouncedValue`. Thao tác ghi có toast;
    hành động nhạy cảm có `AlertDialog`. Skeleton dùng `Skeleton` của shadcn. Responsive từ 360 px.
25. Zustand luôn đọc qua selector (`useStore((s) => s.x)` hoặc `useShallow`), không lấy cả store.
26. **Phân chia component hợp lý & giới hạn độ dài**:
    - File component **không vượt quá 200 dòng** (ngưỡng tối đa 250 dòng cho các view container phức tạp).
    - Mỗi file đảm nhận **đúng một trách nhiệm duy nhất (SRP)**. Khi component vượt quá ~150 dòng hoặc chứa từ 2 khối giao diện/nghiệp vụ độc lập trở lên (như header, floating action bar, drawer/dialog, card con, form section...), **bắt buộc tách thành component con riêng biệt** trong `components/` của feature.
    - Không khai báo nhiều component lớn trong cùng 1 file. Mỗi file chỉ export 1 component chính. Sub-component phụ trợ chỉ được viết trong cùng file nếu cực kỳ ngắn (< 30 dòng), không có state/handlers phức tạp và chỉ dùng cục bộ tại file đó.
27. **Đặt file đúng thư mục ước định (File Placement & Folder Conventions)**:
    - Component của feature: `src/features/<domain>/components/<component-name>.tsx`.
    - Component dùng chung toàn dự án: `src/components/common/`.
    - Component UI nguyên bản: `src/components/ui/` (shadcn).
    - Custom hook dùng chung: `src/hooks/`; hook đặc thù của feature: `src/features/<domain>/hooks/`.
    - Hằng số vào `constants/`, type vào `types/` hoặc `@timmyhub/contracts`, hàm tiện ích vào `utils/`.
    - Thư mục component/feature luôn có `index.ts` để re-export sạch qua barrel.
28. **Kiểm soát SSR/CSR & Render Strategy hợp lý**:
    - **Server Component (RSC) là mặc định tuyệt đối** cho các trang `page.tsx`, layout và thành phần hiển thị tĩnh/dữ liệu ban đầu (0 KB JS bundle gửi xuống client).
    - `'use client'` **chỉ được đặt ở component lá (leaf node)** thực sự cần trạng thái tương tác (`useState`, `useEffect`, trình nghe sự kiện DOM, animation client-side). Tuyệt đối **CẤM** biến cả trang `page.tsx` hay layout thành client component.
    - Phân bổ chiến lược: Static (SSG) cho nội dung marketing; ISR (revalidate) cho catalog/sản phẩm công khai; SSR/Streaming với `<Suspense>` và skeleton loader cho trang cá nhân hóa/dashboard.
    - Thư viện nặng (hls.js, chart, TipTap, video player) và modal/drawer/dialog chỉ render khi mở **bắt buộc nạp bằng `next/dynamic`** kèm `{ ssr: false }`.
    - Mọi route segment phải có `loading.tsx`, `error.tsx`; mỗi route group có `not-found.tsx`.
29. **Đa ngôn ngữ & Bản địa hóa (next-intl) — CẤM hardcode chuỗi text**:
    - Tuyệt đối **không viết chuỗi trần / hardcode text tiếng Việt hay bất kỳ ngôn ngữ nào** trong JSX, placeholder, toast, aria-label, alt text, tooltip hoặc validation messages.
    - Toàn bộ text phải khai báo trong `frontend/messages/vi.json` và `frontend/messages/en.json` (cập nhật đồng thời cả hai file).
    - Client Component dùng `const t = useTranslations('<namespace>')`; Server Component dùng `const t = await getTranslations('<namespace>')`. Ghép biến bằng định dạng ICU (`t('welcome', { name })`), cấm cộng chuỗi thủ công.
30. **Quy chuẩn Styling — CẤM Style Inline (Tailwind CSS Only)**:
    - Tuyệt đối **CẤM viết `style={{ ... }}` inline** trong JSX. 100% kiểu dáng phải viết bằng class Tailwind CSS kết hợp hàm `cn(...)`.
    - Ngoại lệ duy nhất: Các giá trị số thực sự động tính toán tại runtime (ví dụ: toạ độ drag/canvas đo đạc từ DOM bằng `getBoundingClientRect()`, dynamic CSS custom variables). Khi dùng ngoại lệ này, **bắt buộc phải có dòng comment giải thích lý do**.
31. **Quản lý Form bắt buộc dùng React Hook Form + Zod & Schema hợp lý**:
    - Mọi form tương tác (nhập liệu, bộ lọc nâng cao, tạo/sửa dữ liệu, upload) **bắt buộc dùng `react-hook-form` tích hợp `@hookform/resolvers/zod`**. Tuyệt đối cấm unmanaged form hoặc dùng `useState` từng field cho form nghiệp vụ.
    - Schema Zod phải thiết kế hợp lý, chặt chẽ (validation min/max, regex, enum contracts, messages qua i18n), đặt tại `schemas/` hoặc `@timmyhub/contracts` (nếu dùng chung FE/BE).
    - Mọi trường nhập trong form phải dùng field có label nổi (`FloatInput`, `FloatCombobox`, `FloatMultiSelect`, `FloatDatePicker`...) kết hợp `<Controller>` hoặc `register`.

## 4. Quy ước tài liệu

- Front-matter YAML: `title`, `status`, `owner`, `updated`, `related`.
- ID truy vết: `FEAT-<DOMAIN>-<nnn>` → `REQ-*` → `TASK-*`; thêm `ADR-<nnnn>`, `EVT-<domain>.<action>`, `NFR-<nnn>`.
- Requirement viết kiểu **EARS** tiếng Việt, kèm acceptance criteria Given/When/Then.
- Sơ đồ bằng Mermaid inline, không dùng ảnh nhị phân.
- Mọi quy tắc code minh hoạ bằng cặp **❌ BAD / ✅ GOOD**.
- Định dạng: 4 space, LF, không khoảng trắng cuối dòng.
- **Sửa số liệu là sửa mọi nơi**: đổi số tính năng/event/service thì cập nhật tất cả file đang trích con số đó,
  rồi chạy skill `docs-audit` để xác nhận.

## 5. Skill sẵn có

| Skill | Dùng khi |
|---|---|
| `ui-component` | Tạo/sửa component, form, bảng, dialog |
| `page-build` | Dựng một route Next.js hoàn chỉnh |
| `design-review` | Rà soát UI/UX một màn hình trước khi merge |
| `nest-endpoint` | Thêm/sửa endpoint, handler, consumer backend |
| `prisma-schema` | Thay đổi mô hình dữ liệu, migration |
| `code-review` | Rà soát code trước khi merge |
| `perf-audit` | Truy tìm nguyên nhân chậm, gói phình |
| `i18n-strings` | Trích chuỗi cứng, thêm ngôn ngữ |
| `spec-domain` | Viết spec domain EARS |
| `docs-audit` | Kiểm tra toàn vẹn bộ docs |

Skill bên thứ ba (tham khảo khi cần, skill dự án thắng khi mâu thuẫn): `ui-ux-pro-max`, `frontend-design`,
`web-design-guidelines`, `accessibility`, `vercel-react-best-practices`, `vercel-composition-patterns`,
`next-cache-components-adoption`, `next-cache-components-optimizer`, `seo`, `nestjs-best-practices`,
`nodejs-best-practices`, `nodejs-backend-patterns`, `supabase`, `supabase-postgres-best-practices`.

MCP có sẵn: `chrome-devtools` (trace, Lighthouse, screenshot), `next-devtools` (lỗi, route, cache của dev server),
`vercel`, `supabase`. Dùng khi việc cần đo đạc hoặc tra cứu thật, không đoán.

## 6. Cách làm việc mong đợi

1. Đọc spec liên quan trước khi viết. Không có spec mà là tính năng mới → viết spec trước (`spec-domain`).
2. Làm hết phạm vi được giao; phần nào bị chặn thì nói rõ, không âm thầm thu hẹp.
3. Báo cáo trung thực: test đỏ thì nói đỏ kèm output.
4. Không tự ý commit hoặc push khi chưa được yêu cầu.
5. Xong mỗi thay đổi code thì **tự rà soát** theo §3 và `coding-standards.md`, rồi báo lại: prop drilling, cách
   dùng zustand (có selector chưa), render thừa, chuỗi/số ma thuật, file đặt sai thư mục, chỗ vi phạm có sẵn từ
   trước trong vùng vừa đụng. Luôn để mắt tới hiệu năng (`performance-campaign.md` §5).
6. **Hỏi trước** khi: tạo component dùng chung mới, thêm cảnh báo/xác nhận cho hành động nhạy cảm (xoá, khoá, đặt
   lại…), hoặc di chuyển file giữa các thư mục gốc.
