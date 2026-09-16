---
title: ADR-0007 — TanStack Table làm mặc định, AG Grid chỉ cho lưới admin phức tạp
status: accepted
owner: Frontend Lead
updated: 2026-09-16
related: [docs/04-frontend/component-inventory.md, docs/06-quality/performance.md]
---

# ADR-0007 — TanStack Table làm mặc định, AG Grid chỉ cho lưới admin phức tạp

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Người quyết:** Frontend Lead

## Bối cảnh

Bản gốc dùng AG Grid Community **và** Enterprise cho mọi bảng, kể cả bảng đơn giản (danh sách 10 cột, không cần group
theo cây, không cần pivot). AG Grid Enterprise có phí bản quyền, và bundle AG Grid nặng hơn đáng kể so với nhu cầu
thực tế của phần lớn bảng trong hệ thống.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ AG Grid cho mọi bảng | Nhất quán, không phải học 2 thư viện | Phí bản quyền Enterprise cho tính năng phần lớn bảng không dùng tới; bundle nặng vào mọi trang có bảng, kể cả bảng đơn giản |
| **B. TanStack Table + TanStack Virtual làm mặc định, AG Grid chỉ giữ cho lưới admin thật sự phức tạp** | TanStack Table headless, chỉ mang logic (sort/filter/pagination), tự dựng UI theo token shadcn/Tailwind, bundle nhỏ hơn nhiều; TanStack Virtual xử lý ảo hoá danh sách dài mượt; AG Grid chỉ load bằng `next/dynamic` ở đúng vài trang cần nó (vd bảng đối soát tài chính nhiều cột, pivot) | Phải tự dựng UI bảng (header sort icon, pagination control) thay vì có sẵn; hai bộ API khác nhau cho hai loại bảng |
| C. Bỏ hẳn AG Grid, tự dựng mọi thứ bằng TanStack Table kể cả tính năng pivot | Một thư viện duy nhất | Pivot/group theo cây tự viết từ đầu tốn công hơn nhiều lợi ích, và dễ có bug tinh vi mà AG Grid đã giải quyết |

## Quyết định

Chọn **B**. Mặc định mọi bảng dùng **TanStack Table + TanStack Virtual**. **AG Grid Community** (không dùng
Enterprise, tránh phí bản quyền) chỉ dùng cho lưới admin có nhu cầu thật sự phức tạp — group theo cây, pivot, hoặc
export Excel định dạng phức tạp — và **bắt buộc** `next/dynamic` để không lọt vào bundle chung (luật cứng #12 trong
`CLAUDE.md`).

## Hệ quả

- Component `DataTable` dùng chung (kế thừa ý tưởng `BaseDataTable.tsx` của bản gốc) dựng trên TanStack Table, đủ 7
  trạng thái bắt buộc (`CLAUDE.md` luật #9), là lựa chọn mặc định khi tạo bảng mới.
- Danh sách trang cụ thể nào cần AG Grid (và lý do) liệt kê trong `component-inventory.md`, không quyết định tuỳ
  hứng theo từng PR.
