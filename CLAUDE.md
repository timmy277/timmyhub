# CLAUDE.md — timmy-hub

Sàn thương mại điện tử kiểu Shopee: trung tâm trao đổi **admin ↔ user ↔ seller**. Seller đăng bán, đăng bài post,
video quảng cáo và quản lý doanh số.

**Trạng thái hiện tại: chỉ có tài liệu.** `backend/`, `frontend/`, `shared/` còn rỗng. Không sinh code ứng dụng, không
cài dependency, trừ khi được yêu cầu rõ ràng. Mọi thay đổi lúc này nằm trong `docs/`.

---

## 1. Ngôn ngữ và văn phong

- Văn xuôi, comment, commit message, nội dung tài liệu: **tiếng Việt**.
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
13. Mặc định là Server Component; `'use client'` đặt ở phạm vi nhỏ nhất. Không fetch dữ liệu trong `useEffect`.

**Chung**

14. TypeScript `strict: true` ở mọi package. Không `any`, không `@ts-ignore` không kèm lý do.
15. Zod là nguồn validation duy nhất, schema dùng chung FE/BE qua `@timmyhub/contracts`.
16. Không đưa việc chậm (mail, transcode, index) vào đường xử lý request — đẩy sang BullMQ.
17. Không commit bí mật. Giá trị trong `.env` chỉ đọc **tên biến**, không đọc giá trị.
18. Ô nhập trong form luôn dùng field có **label nổi** — `FloatInput`, `FloatCombobox`, `FloatMultiSelect`, `FloatDatePicker`, `FloatDateRangePicker` từ
    `@/components` — không ghép `<Label>` riêng với `<Input>`/`Select`. `Label` rời chỉ dành cho checkbox, radio, switch.
19. Component giao diện lấy từ **shadcn/ui** (`shadcn add`). Cần một component shadcn chưa có thì cài bằng CLI;
    muốn **tự viết** component mới (kể cả bọc lại primitive shadcn) phải **hỏi ý chủ dự án trước**, không tự tạo.

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

## 6. Cách làm việc mong đợi

1. Đọc spec liên quan trước khi viết. Không có spec mà là tính năng mới → viết spec trước (`spec-domain`).
2. Làm hết phạm vi được giao; phần nào bị chặn thì nói rõ, không âm thầm thu hẹp.
3. Báo cáo trung thực: test đỏ thì nói đỏ kèm output.
4. Không tự ý commit hoặc push khi chưa được yêu cầu.
