---
title: ADR-0006 — shadcn/ui + Tailwind v4 thay Mantine
status: accepted
owner: Frontend Lead
updated: 2026-09-24
related: [docs/04-frontend/design-system.md, docs/04-frontend/component-inventory.md]
---

# ADR-0006 — shadcn/ui + Tailwind v4 thay Mantine

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Frontend Lead (người dùng chỉ định shadcn/tailwind)

## Bối cảnh

Bản gốc dùng Mantine 8 — bộ component đầy đủ, đóng gói sẵn style. timmy-hub cần một design system riêng (token
thương hiệu `#00a76f` kiểu Minimals UI) và cần kiểm soát bundle size chặt hơn cho các trang công khai (SEO, Core Web
Vitals) — hai nhu cầu mà một thư viện component "trọn gói" như Mantine không tối ưu bằng.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ Mantine 8 | Đỡ việc viết lại toàn bộ component | Mantine đóng gói CSS-in-JS riêng, khó tuỳ biến sâu theo token thương hiệu; bundle nặng hơn vì kéo theo runtime CSS-in-JS |
| **B. shadcn/ui + Tailwind v4** | Component là **code copy vào repo**, không phải dependency — tuỳ biến tự do 100%, không bị khoá theo API của thư viện; dựng trên Radix Primitives nên có sẵn accessibility (focus trap, ARIA) đúng chuẩn; Tailwind v4 dùng CSS thuần (không cần JS runtime), nhẹ hơn CSS-in-JS | Phải tự bảo trì component đã copy vào (không có "cập nhật thư viện" tự động); cần kỷ luật để không sửa tay file trong `components/ui/` (nguyên tắc: `components/ui/` shadcn nguyên bản, `components/common/` mới là chỗ tuỳ biến) |
| C. Chakra UI | Component đẹp, dễ dùng | Cùng nhược điểm CSS-in-JS như Mantine; hệ sinh thái token không khớp Tailwind |

## Quyết định

Chọn **B**. Token thiết kế (màu thương hiệu, spacing, typography) định nghĩa trong Tailwind config, kế thừa từ
`.kiro/steering/design-system.md` của bản gốc (Minimals UI: Public Sans, `brand.primary #00a76f`, 7 trạng thái bắt
buộc, WCAG 2.2 AA). Chi tiết token: `docs/04-frontend/design-system.md`.

## Hệ quả

- Cấu trúc thư mục phân biệt rõ `components/ui/` (shadcn nguyên bản, chỉ cập nhật qua CLI `shadcn add`, không sửa
  tay) và `components/common/` (component dựng từ `ui/`, tuỳ biến cho dự án) — vi phạm ranh giới này làm mất khả năng
  đồng bộ với upstream shadcn.
- Ngoại lệ (2026-09-24): các field `components/ui/float-*.tsx` (`FloatInput`, `FloatCombobox`, `FloatMultiSelect`)
  do dự án tự viết nhưng đặt trong `ui/` vì là primitive form dùng khắp nơi. Chúng chỉ **dựng trên** file CLI sinh
  (`combobox.tsx`, `input-group.tsx`…), không sửa các file đó — `shadcn add --overwrite` vẫn an toàn.
- AG Grid (nếu dùng cho lưới admin phức tạp, xem ADR-0007) và Recharts vẫn là thư viện ngoài độc lập với hệ token này,
  cần tự map màu theo token qua theme prop, không tự động kế thừa Tailwind.
