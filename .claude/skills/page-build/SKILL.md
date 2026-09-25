---
name: page-build
description: Dựng một route Next.js hoàn chỉnh cho TimmyHub — App Router, ranh giới RSC/client, metadata + JSON-LD chuẩn SEO, loading/error/not-found, i18n, chuyển động, ngân sách hiệu năng. Dùng khi được yêu cầu "làm trang ...", "thêm màn hình", "tạo route", hoặc khi sửa một trang đã có ở mức bố cục.
---

# Dựng một trang

## 1. Chốt bốn thứ trước khi gõ code

| Câu hỏi | Nguồn trả lời |
|---|---|
| Trang công khai hay sau đăng nhập? | `docs/04-frontend/routes.md` |
| Dữ liệu lấy ở đâu, cache bao lâu? | `docs/03-specs/<domain>/design.md` |
| Ai được vào, phạm vi dữ liệu nào? | `docs/01-architecture/rbac-advanced.md` |
| Trang này có phải trang đích SEO không? | `docs/04-frontend/seo.md` |

Trang công khai (sản phẩm, shop, bài đăng, tìm kiếm) là **trang kiếm khách** — SEO và LCP là yêu cầu, không phải tuỳ chọn.
Trang sau đăng nhập (giỏ, đơn, quản trị) thì `noindex`, ưu tiên tương tác nhanh.

## 2. Bộ file tối thiểu của một route

```
app/san-pham/[slug]/
├── page.tsx           # Server Component, fetch dữ liệu, render
├── layout.tsx         # chỉ khi cần khung riêng
├── loading.tsx        # skeleton đúng bố cục thật
├── error.tsx          # 'use client', có nút thử lại
├── not-found.tsx      # gợi ý đường đi tiếp, không phải ngõ cụt
└── _components/       # component riêng của route, không dùng lại nơi khác
```

`loading.tsx`, `error.tsx`, `not-found.tsx` **bắt buộc**. Dự án cũ thiếu cả ba ở mọi route — đó là lỗi phải tránh lặp lại.

## 3. Ranh giới Server / Client

- `page.tsx` luôn là Server Component; fetch ngay trong đó, không `useEffect`.
- `'use client'` đặt ở lá nhỏ nhất thật sự cần (nút, form, carousel), không đẩy lên cả trang.
- Dữ liệu truyền xuống client component phải **đã tuần tự hoá được**: `Decimal` → chuỗi, `Date` → ISO.
- Dữ liệu người dùng riêng tư không được nằm trong phần được cache ở tầng CDN.

```tsx
// ❌ BAD — cả trang thành client chỉ vì một nút
'use client'
export default function Page() { const { data } = useQuery(...) }

// ✅ GOOD
export default async function Page({ params }) {
    const product = await getProduct(params.slug)      // Server
    return <><ProductInfo product={product} /><AddToCartButton id={product.id} /></>  // chỉ nút là client
}
```

## 4. SEO (trang công khai)

| Hạng mục | Quy định |
|---|---|
| `generateMetadata` | Title ≤ 60 ký tự có từ khoá chính; description 140–160 ký tự; OG + Twitter card |
| Canonical | Luôn có; trang lọc/sắp xếp trỏ canonical về trang gốc |
| `hreflang` | Đủ cặp `vi` / `en` + `x-default` |
| JSON-LD | `Product` + `Offer` + `AggregateRating` (sản phẩm), `BreadcrumbList`, `Organization` (trang chủ), `Article` (bài đăng) — giá trong JSON-LD lấy từ chuỗi decimal, không tự tính |
| Heading | Đúng **một** `<h1>`, không nhảy cấp |
| URL | Chữ thường, không dấu, có gạch nối, có `-<id>` ở cuối để tránh trùng slug |
| Ảnh | `next/image`, `alt` mô tả thật, `priority` chỉ cho ảnh LCP |
| `robots` | Trang sau đăng nhập và trang lọc sâu đặt `noindex, follow` |

Nội dung phải có trong HTML lần đầu. Nội dung chỉ xuất hiện sau khi JS chạy coi như không tồn tại với SEO.

## 5. Dữ liệu và trạng thái

- Đọc lần đầu: fetch ở server, đặt `revalidate` theo bảng trong `docs/06-quality/performance.md`.
- Tương tác sau đó: TanStack Query, key theo quy ước ở `docs/04-frontend/state-and-data.md`.
- Danh sách dài: phân trang cursor + `TanStack Virtual`; **không** tải hết rồi cắt ở client.
- Đủ 7 trạng thái ở mức trang: có dữ liệu · đang tải · rỗng · lỗi · không có quyền · hết hạn/không tồn tại · vừa thao tác xong.
- Tiền: nhận chuỗi decimal, hiển thị bằng `Intl.NumberFormat`. Tổng tiền **luôn** lấy từ backend.

## 6. Chuyển động

Theo `docs/04-frontend/motion-and-effects.md`: chỉ `transform` + `opacity`, thời lượng theo token, tôn trọng
`prefers-reduced-motion`. Parallax chỉ dùng ở trang giới thiệu/chiến dịch, **không** dùng ở trang có form hoặc bảng dữ liệu.
Hiệu ứng không được làm trễ LCP — phần nội dung chính hiện ngay, hiệu ứng đến sau.

## 7. Ngân sách

| Chỉ số | Trần |
|---|---|
| JS của route (gzip) | Theo `.size-limit.js`, xem `docs/06-quality/quality-gates.md` §3 |
| LCP / CLS / TBT | Theo `docs/06-quality/performance.md` §1.1 |
| Thư viện nặng | `next/dynamic`, không vào gói chung |

## 8. Bàn giao

- [ ] Có `loading.tsx`, `error.tsx`, `not-found.tsx`
- [ ] Không chuỗi cứng; đã dịch đủ `vi` và `en`, kiểm layout ở bản tiếng Anh
- [ ] `generateMetadata` + JSON-LD hợp lệ (kiểm bằng Rich Results Test)
- [ ] Tab xuyên trang bằng bàn phím làm được mọi việc; axe không có lỗi `serious`/`critical`
- [ ] Đo ở 360 px và với CPU throttle 4×
- [ ] `size-limit` không vượt trần; gói chung không tăng
- [ ] Story Storybook cho các component mới của route
