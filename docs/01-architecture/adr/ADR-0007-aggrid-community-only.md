---
title: ADR-0007 — AG Grid Community là lựa chọn duy nhất cho bảng dữ liệu
status: accepted
owner: Frontend Lead
updated: 2026-09-26
related: [docs/06-quality/performance.md, docs/06-quality/performance-campaign.md, docs/06-quality/coding-standards.md]
---

# ADR-0007 — AG Grid Community là lựa chọn duy nhất cho bảng dữ liệu

**Trạng thái:** accepted · **Ngày:** 2026-09-16 · **Cập nhật:** 2026-09-26 · **Người quyết:** Frontend Lead

## Bối cảnh

Bản gốc dùng AG Grid Community **và** Enterprise cho mọi bảng, kể cả bảng đơn giản (danh sách 10 cột, không cần group
theo cây, không cần pivot). AG Grid Enterprise có phí bản quyền, và bundle AG Grid nặng hơn đáng kể so với nhu cầu
thực tế của phần lớn bảng trong hệ thống.

Bản đầu tiên của ADR này (2026-09-16) chốt chuyển mặc định sang **TanStack Table + TanStack Virtual**, chỉ giữ AG Grid
cho vài lưới admin thật phức tạp. Quyết định đó **chưa từng được hiện thực**: không có `@tanstack/react-table` hay
`@tanstack/react-virtual` trong `frontend/package.json`, và mọi bảng trong repo — kể cả danh sách user, role,
permission — đều dựng trên `AgGridTable`. `CLAUDE.md` luật #12 và #22 cũng đã được viết theo hướng AG Grid.

Ngày 2026-09-26 chốt lại cho khớp với code đang chạy, thay vì để tài liệu mô tả một kiến trúc không tồn tại.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| A. TanStack Table + TanStack Virtual làm mặc định, AG Grid chỉ cho lưới phức tạp | TanStack Table headless, chỉ mang logic (sort/filter/pagination), tự dựng UI theo token shadcn/Tailwind, bundle nhỏ hơn nhiều | Phải tự dựng toàn bộ UI bảng (header sort icon, pagination, chọn dòng, overlay rỗng/lỗi); hai bộ API cho hai loại bảng; **và đã không được hiện thực suốt 10 ngày, trong khi bảng thật vẫn mọc thêm trên AG Grid** |
| **B. AG Grid Community cho mọi bảng** | Một thư viện duy nhất, một bộ API; có sẵn sort/filter/pagination/chọn dòng/export CSV/locale mà `AgGridTable` đang dùng; không phải viết lại bảng nào; đã có sẵn cơ chế nạp động nên không lọt vào gói chung | AG Grid nặng; phải tự kỷ luật nạp động và chỉ đăng ký module cần dùng, nếu không sẽ phình bundle |
| C. AG Grid Enterprise | Có pivot, group theo cây, export định dạng phức tạp | Phí bản quyền; phần lớn bảng trong hệ thống không dùng tới |

## Quyết định

Chọn **B**. **AG Grid Community** là lựa chọn duy nhất cho mọi bảng trong hệ thống. Không dùng AG Grid Enterprise,
không dùng TanStack Table.

Ràng buộc kèm theo, vi phạm là chặn merge:

- Bảng chỉ được nạp qua `next/dynamic` — luật cứng #12. Trong repo, `components/common/ag-grid-table/index.ts` **chỉ**
  export bản nạp động (`ag-grid-table-lazy.tsx`) và các kiểu; không export thẳng `ag-grid-table.tsx` để barrel
  `@/components` không kéo AG Grid vào gói chung.
- Chỉ đăng ký module AG Grid thật sự dùng qua `ModuleRegistry`, không dùng `AllCommunityModule` — `TASK-PERF-008`.
- Hằng thuần của bảng đặt ở `@/constants`, cột mặc định ở `@/config/columns` — nơi dùng import được mà không kéo gói
  lưới vào bundle.

## Hệ quả

- Component bảng dùng chung là **`AgGridTable`** (`components/common/ag-grid-table/`), export qua `@/components`.
  Không có component `DataTable` trên TanStack Table.
- Mọi bảng mới dùng `AgGridTable`; cột khai trong `config/columns/`, không khai trong file component (luật #22).
- Đổi lại việc phải tự kiểm soát bundle: AG Grid là một trong ba thư viện nặng nhất buộc phải nạp động cùng TipTap và
  Recharts (`docs/06-quality/performance.md`).
- Nếu sau này có nhu cầu thật sự cần pivot hoặc group theo cây, mở ADR mới để cân nhắc Enterprise — không tự ý bật.
