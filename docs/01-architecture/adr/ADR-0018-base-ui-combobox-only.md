---
title: ADR-0018 — Base UI chỉ dùng cho Combobox, phần còn lại theo Radix
status: accepted
owner: Frontend Lead
updated: 2026-09-26
related: [docs/01-architecture/adr/ADR-0006-shadcn-over-mantine.md, docs/06-quality/coding-standards.md]
---

# ADR-0018 — Base UI chỉ dùng cho Combobox, phần còn lại theo Radix

**Trạng thái:** accepted · **Ngày:** 2026-09-26 · **Người quyết:** Frontend Lead

## Bối cảnh

`ADR-0006` chốt shadcn/ui dựng trên **Radix Primitives**. Nhưng `frontend/package.json` đang có **hai** thư viện
primitive cùng lúc: `radix-ui@^1.6.7` và `@base-ui/react@^1.8.0`.

Thực tế sử dụng: **18 file** import `radix-ui`, **3 file** import `@base-ui/react` —
`components/ui/combobox.tsx`, `components/common/float-combobox.tsx`, `components/common/float-multi-select.tsx`.

Nguyên nhân: **Radix không có primitive Combobox.** `FloatCombobox` và `FloatMultiSelect` cần một ô vừa là input
tìm kiếm vừa có label nổi, kèm danh sách gợi ý, chọn nhiều bằng chip, điều hướng bàn phím và ARIA combobox đầy đủ.
Base UI có sẵn `Combobox` đáp ứng đúng nhu cầu đó; Radix thì không.

Việc này chưa từng được ghi lại ở đâu, nên đọc `ADR-0006` xong sẽ tưởng toàn hệ chỉ dùng Radix. ADR này ghi lại quyết
định để chỗ lệch đó là **có chủ ý** thay vì trôi dạt.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Radix Popover + `cmdk` | Đúng chuẩn shadcn/Radix, một thư viện primitive duy nhất, keyboard nav và ARIA do `cmdk` lo | Phải thêm dependency `cmdk`; phải viết lại cả ba file; UX đổi — `cmdk` đặt ô tìm kiếm **trong** popup, nên mô hình "ô nhập tại chỗ có label nổi" hiện tại phải dựng lại bằng `PopoverAnchor` |
| **B. Giữ Base UI riêng cho Combobox, các primitive khác vẫn Radix** | Không phải viết lại gì, giữ nguyên hành vi đang chạy ở `ThemeCustomizer`; Base UI có primitive Combobox đầy đủ (input, chip, lọc, ARIA, điều hướng bàn phím); không thêm dependency | Tồn tại hai thư viện primitive trong cùng một design system; phải có kỷ luật để Base UI không lan sang chỗ khác |
| C. Radix Popover + tự viết danh sách lọc | Không thêm dependency | Tự xử lý lọc, arrow key, `aria-activedescendant`, cuộn theo mục đang chọn — nhiều code và dễ sai a11y hơn hẳn; lợi ích không tương xứng |

## Quyết định

Chọn **B**. `@base-ui/react` được giữ lại **chỉ** cho họ Combobox. Mọi primitive khác vẫn dùng Radix theo `ADR-0006`.

Phạm vi được phép import `@base-ui/react` — danh sách đóng, thêm file mới phải mở ADR mới:

- `components/ui/combobox.tsx`
- `components/common/float-combobox.tsx`
- `components/common/float-multi-select.tsx`

## Hệ quả

- `@base-ui/react` **không** được xoá khỏi `frontend/package.json` — xoá là vỡ `ThemeCustomizer`.
- Khi nâng cấp dependency phải theo dõi cả hai thư viện; không được giả định chỉ có Radix.
- Luật #11 (`ưu tiên primitive Radix`) đọc kèm ADR này: mặc định Radix, ngoại lệ duy nhất là họ Combobox.
- Muốn có thêm một component dùng Base UI nữa thì mở ADR mới, không tự thêm.

❌ **BAD** — dùng Base UI cho một component không phải Combobox vì "thấy tiện":

```tsx
import { Select as SelectPrimitive } from '@base-ui/react'
```

✅ **GOOD** — primitive Radix cho mọi thứ ngoài họ Combobox:

```tsx
import { Select as SelectPrimitive } from 'radix-ui'
```
