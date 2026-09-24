---
name: ui-component
description: Tạo hoặc sửa component giao diện TimmyHub theo design system — shadcn/ui + Tailwind v4, đủ 7 trạng thái, đạt WCAG 2.2 AA, dùng token chuyển động, có story Storybook và i18n. Dùng khi được yêu cầu tạo màn hình, component, form, bảng, dialog, hoặc sửa giao diện hiện có.
---

# Tạo component giao diện

## Quyết định trước khi gõ code

1. **Có sẵn chưa?** Tìm trong `components/ui/` (shadcn nguyên bản) rồi `components/common/` trước khi tạo mới.
   Component na ná cái đã có là nợ kỹ thuật. Chưa có thì cài từ shadcn (`pnpm exec shadcn add <tên>`);
   shadcn cũng không có mà phải tự viết → **hỏi ý chủ dự án trước** (luật cứng #19 `CLAUDE.md`).
2. **Server hay client?** Mặc định là Server Component. `'use client'` chỉ đặt ở phần nhỏ nhất thật sự cần
   tương tác. Không biến cả trang thành client vì một cái nút.
3. **Đặt ở đâu?** Dùng ở nhiều domain → `components/common/`; chỉ một domain → `features/<domain>/components/`.
   `features/*` không import chéo nhau.

## Bảy trạng thái bắt buộc

Không component nào hiển thị dữ liệu được coi là xong nếu thiếu trạng thái nào:

| Trạng thái | Yêu cầu |
|---|---|
| Mặc định | |
| Đang tải | Skeleton **đúng kích thước** nội dung thật (sai kích thước là gây CLS) |
| Rỗng | Có hình minh hoạ, câu giải thích, và một hành động tiếp theo |
| Lỗi | Thông điệp dịch được theo `errorCode` + nút thử lại |
| Không có quyền | Nói rõ thiếu quyền gì, không hiện khung trống |
| Vô hiệu hoá | Có lý do (tooltip), không im lặng |
| Thành công | Phản hồi tức thì, lạc quan khi an toàn |

## Quy tắc code

- Chỉ dùng token của design system: màu, khoảng cách, bo góc, bóng, thời lượng chuyển động. **Không** gõ mã màu hay
  số mili giây trực tiếp.
- Chuyển động: chỉ `transform` và `opacity`, dùng token thời lượng, tôn trọng `prefers-reduced-motion`.
  Không import thư viện chuyển động vào gói chung (xem `docs/04-frontend/motion-and-effects.md`).
- Không chuỗi tiếng Việt viết thẳng — mọi chữ qua `next-intl`, khoá có cấu trúc (`order.status.shipped`).
- Form: `react-hook-form` + `zodResolver`, **dùng lại schema của backend** từ `@timmyhub/contracts`.
- Ô nhập trong form luôn là field label nổi: `FloatInput` (text, password), `FloatCombobox` (chọn một, có tìm kiếm),
  `FloatMultiSelect` (chọn nhiều, chip), `FloatDatePicker` (ngày, gõ tay hoặc chọn lịch), `FloatDateRangePicker` (khoảng ngày). Không ghép `<Label>` + `<Input>`; `Label` rời chỉ cho checkbox/radio/switch.
- Dữ liệu máy chủ: RSC hoặc TanStack Query. Không `useEffect` để fetch. Không đưa dữ liệu máy chủ vào Zustand.
- Ảnh: `next/image` có `sizes`; ảnh chính của trang đặt `priority`.
- Tiền: nhận chuỗi decimal từ API, không tính bằng `number`; định dạng bằng `Intl.NumberFormat` theo locale.
- Danh sách dài: `@tanstack/react-virtual`. Bảng: TanStack Table (AG Grid chỉ cho 2–3 grid admin đã được duyệt).
- Thư viện nặng (AG Grid, Recharts, TipTap, Motion) luôn `next/dynamic`.

## Khả năng truy cập (WCAG 2.2 AA)

- Dùng primitive Radix cho dialog/dropdown/popover — đừng tự viết bẫy focus.
- Mọi control tương tác dùng được bằng bàn phím; thứ tự tab hợp lý; focus ring nhìn thấy rõ.
- Tương phản ≥ 4.5:1 cho chữ thường, ≥ 3:1 cho chữ lớn và viền control.
- Vùng bấm ≥ 24×24 px.
- Trạng thái không truyền bằng màu đơn thuần — kèm chữ hoặc biểu tượng.
- Ảnh có `alt` mô tả; ảnh trang trí `alt=""`.
- Nội dung động thông báo qua `aria-live` khi cần.

## Bàn giao

Mỗi component dùng chung phải kèm:

- Story Storybook (CSF3) phủ đủ 7 trạng thái + một story cho responsive hẹp nhất.
- Test tương tác cho luồng chính nếu component có logic.
- Kiểm a11y: `@axe-core/playwright` hoặc addon a11y của Storybook, không còn lỗi mức `serious`.

## Tự kiểm

- [ ] Đã tìm component sẵn có trước khi tạo mới
- [ ] `'use client'` ở phạm vi nhỏ nhất
- [ ] Đủ 7 trạng thái, skeleton đúng kích thước
- [ ] Chỉ dùng token, không gõ giá trị thô
- [ ] Không chuỗi cứng, đã qua next-intl
- [ ] Kiểm tra bằng bàn phím và ở bề rộng 360 px
- [ ] Không thêm KB nào vào gói chung do thư viện nặng
