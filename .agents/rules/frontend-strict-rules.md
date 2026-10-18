# Frontend Strict Rules — timmy-hub

Quy chuẩn tối thượng áp dụng cho **TOÀN BỘ CÁC FEATURE VÀ TRANG** trong ứng dụng Frontend (`frontend/src`).
Mọi nhà phát triển và Trợ lý AI **TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN HOẶC BỎ QUA** bất kỳ quy tắc nào dưới đây khi triển khai bất kỳ tính năng nào.

---

## 1. Kiểm soát SSR/CSR & Rendering Strategy

1. **Server Component (RSC) là mặc định**:
   - Mọi `page.tsx`, `layout.tsx` và component thuần hiển thị dữ liệu ban đầu BẮT BUỘC là Server Component (chạy trên server, 0 KB JavaScript gửi về client).
   - Tuyệt đối **CẤM** đặt `'use client'` ở cấp `page.tsx` hay layout chỉ để dùng vài tương tác nhỏ.
2. **`'use client'` chỉ ở component lá (Leaf Components)**:
   - Chỉ được gắn `'use client'` ở component con nhỏ nhất thực sự cần state (`useState`), sự kiện DOM (`onClick`, `onChange`), hook trình duyệt hoặc animation tương tác.
3. **Chiến lược render phù hợp từng loại trang**:
   - **Static (SSG)**: Trang thông tin, điều khoản, trang tĩnh.
   - **ISR (Incremental Static Regeneration)**: Chi tiết sản phẩm, danh mục với thời gian revalidate hợp lý.
   - **Dynamic SSR / Streaming**: Trang cá nhân hoá, giỏ hàng, bảng điều khiển, video feed thời gian thực. Bọc phần tải bất đồng bộ bằng `<Suspense fallback={<Skeleton />}>`.
4. **Dynamic Import (`next/dynamic`)**:
   - Thư viện nặng (`hls.js`, TipTap, Recharts, Uppy, AG Grid) hoặc thành phần chỉ hiển thị khi mở (Modal, Drawer, Dialog, Dropzone) **bắt buộc dùng `next/dynamic` với `{ ssr: false }`**.
5. **Route Segments**:
   - Mọi route phải có `loading.tsx`, `error.tsx`; mỗi route group có `not-found.tsx`.

---

## 2. Tuyệt đối KHÔNG QUÊN Translation (`next-intl`) — CẤM Hardcode Text

1. **CẤM VIẾT CHUỖI TRẦN / TEXT TIẾNG VIỆT TRONG CODE**:
   - Tuyệt đối không hardcode text tiếng Việt hay bất kỳ ngôn ngữ nào trong JSX, placeholder, tooltip, toast (`toast.success`, `toast.error`), tiêu đề modal, aria-label, alt text của ảnh.
2. **Cập nhật đồng thời từ điển**:
   - Khi thêm chuỗi text mới cho bất kỳ feature nào, **BẮT BUỘC cập nhật đồng thời cả hai file**:
     - `frontend/messages/vi.json`
     - `frontend/messages/en.json`
3. **Truy xuất thông điệp**:
   - Trong Client Component: `const t = useTranslations('<namespace>')`.
   - Trong Server Component: `const t = await getTranslations('<namespace>')`.
4. **Tham số hoá bằng ICU**:
   - Truyền biến qua cú pháp `{variable}`: `t('productCount', { count: total })`.
   - Cấm nối chuỗi thủ công (`t('total') + ': ' + total`).

---

## 3. Quy chuẩn Styling — CẤM Style Inline (Tailwind CSS Only)

1. **Cấm viết thuộc tính `style={{ ... }}`**:
   - 100% giao diện, căn chỉnh bố cục, màu sắc, khoảng cách, viền, hiệu ứng đều phải sử dụng utility classes của Tailwind CSS.
   - Dùng hàm `cn(...)` từ `@/utils` để kết hợp class có điều kiện.
2. **Ngoại lệ duy nhất cho `style`**:
   - Chỉ được dùng `style` khi giá trị là các con số thực sự động được tính toán tại runtime từ DOM (ví dụ: toạ độ drag/canvas đo đạc bằng `getBoundingClientRect()`, CSS custom variables).
   - Khi sử dụng ngoại lệ này, **BẮT BUỘC PHẢI CÓ DÒNG COMMENT** giải thích lý do cụ thể.

---

## 4. Quản lý Form với React Hook Form + Zod & Thiết kế Schema hợp lý

1. **Thư viện chuẩn**:
   - Mọi form tương tác (nhập liệu, tạo mới, chỉnh sửa, bộ lọc nâng cao, đăng nhập, upload) **BẮT BUỘC** dùng `react-hook-form` tích hợp `@hookform/resolvers/zod`.
2. **Cấm quản lý form thủ công bằng useState**:
   - Tuyệt đối cấm tạo state `useState` cho từng trường nhập liệu hoặc quản lý validate thủ công bằng if-else rời rạc.
3. **Thiết kế Zod Schema hợp lý**:
   - Schema dùng chung FE & BE: đặt tại `@timmyhub/contracts`.
   - Schema riêng của Client: đặt tại `frontend/src/schemas/<domain>.schema.ts`.
   - Ràng buộc kiểu dữ liệu đầy đủ: `min`, `max`, `email`, `regex`, `trim`, `defaultValues`, enum từ contracts.
   - Thông điệp lỗi chuẩn hóa.
4. **Input có label nổi**:
   - Dùng các field label nổi chuẩn của dự án: `FloatInput`, `FloatCombobox`, `FloatMultiSelect`, `FloatDatePicker`, `FloatDateRangePicker` từ `@/components`.
   - Kết nối với form qua `register` hoặc `<Controller>`.

---

## 5. Phân chia Component & Giới hạn độ dài file (SRP)

1. **Ngưỡng độ dài file**:
   - Component chuẩn: **< 150 dòng**.
   - View Container tối đa: **200 dòng (nghiêm cấm vượt quá 250 dòng)**.
2. **Trách nhiệm duy nhất (SRP)**:
   - Khi component vượt ~150 dòng hoặc có $\ge 2$ khối UI/nghiệp vụ độc lập (header, drawer, action bar, card con, form panel...), **bắt buộc tách thành sub-components riêng**.
   - Mỗi file chỉ export 1 component chính. Sub-component phụ trợ trong cùng file chỉ được chấp nhận nếu < 30 dòng, không có state phức tạp và chỉ dùng nội bộ.
3. **Cấu trúc 5 nhóm Lifecycle**:
   - Xếp theo thứ tự: `// ===== State =====` $\rightarrow$ `// ===== Hooks =====` $\rightarrow$ `// ===== Derived =====` $\rightarrow$ `// ===== Handlers =====` $\rightarrow$ `// ===== Effects =====`.

---

## 6. Đặt file đúng thư mục ước định (Folder Conventions)

- Feature components: `src/features/<domain>/components/`.
- Feature hooks: `src/features/<domain>/hooks/`.
- Common components: `src/components/common/`.
- UI primitives: `src/components/ui/`.
- Custom hooks dùng chung: `src/hooks/`.
- Hằng số: `src/constants/`.
- Utility functions: `src/utils/`.
- Types giao diện: `src/types/` (types nghiệp vụ dùng chung FE/BE ở `@timmyhub/contracts`).
- Mọi thư mục component/feature luôn có `index.ts` để barrel export sạch.
