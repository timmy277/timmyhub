---
title: SEO — code chuẩn tìm kiếm
status: review
owner: FE Lead
updated: 2026-09-16
related: [docs/04-frontend/fe-architecture.md, docs/04-frontend/routes.md, docs/04-frontend/i18n.md, docs/06-quality/performance.md]
---

# SEO

> Với một sàn thương mại điện tử, lưu lượng tự nhiên từ tìm kiếm là kênh rẻ nhất và bền nhất. SEO ở đây **không phải
> việc marketing làm sau** — nó là ràng buộc kỹ thuật lên cách render, cách đặt URL và cách sinh metadata.
>
> Bản cũ hỏng gốc: mọi trang đều là client component, không có locale trên URL, không có sitemap, không có dữ liệu có
> cấu trúc. Trang sản phẩm gần như không tồn tại với công cụ tìm kiếm.

---

## 1. Chiến lược render theo loại trang

| Loại trang | Cách render | Lý do |
|---|---|---|
| Trang chủ | ISR, `revalidate = 300` | Nội dung đổi theo giờ, cần nhanh và index được |
| Chi tiết sản phẩm | ISR + `generateStaticParams` cho top 5.000 sản phẩm | Đây là trang kiếm lưu lượng chính |
| Danh mục, kết quả lọc | SSR, `revalidate = 60` cho tổ hợp phổ biến | Quá nhiều tổ hợp để dựng sẵn |
| Tìm kiếm theo từ khoá | SSR + `noindex` | Tránh nội dung mỏng và trùng lặp |
| Trang shop, bài đăng, video | ISR | Có giá trị SEO |
| Giỏ hàng, thanh toán, tài khoản | Client, `noindex` | Riêng tư |
| Toàn bộ khu seller/admin | Client, `noindex` + chặn trong robots | Riêng tư |

Nguyên tắc: **nội dung chính phải có trong HTML trả về lần đầu**. Tên sản phẩm, giá, mô tả, đánh giá không được chờ
JavaScript mới xuất hiện.

---

## 2. URL

| Loại | Dạng | Ghi chú |
|---|---|---|
| Sản phẩm | `/vi/san-pham/{slug}-p{id}` | Slug đổi được, `id` giữ nguyên nên link không chết |
| Danh mục | `/vi/danh-muc/{slug}` | Phân cấp phẳng, không lồng nhiều tầng |
| Shop | `/vi/shop/{shopSlug}` | |
| Bài đăng | `/vi/bai-viet/{slug}-{id}` | |
| Bộ lọc | `?brand=…&minPrice=…` | Tham số lọc **không** tạo URL riêng để index |

Quy tắc: chữ thường, không dấu, nối bằng `-`, không có tham số theo dõi trong URL chuẩn tắc. Đổi slug thì phát sinh
`redirect 301` từ slug cũ, lưu trong bảng `SlugHistory` — mất backlink vì đổi tên sản phẩm là mất tiền thật.

---

## 3. Metadata

Mỗi route xuất `generateMetadata`, **không** đặt thẻ bằng `useEffect`.

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params
    const product = await getProductBySlug(slug)
    if (!product) return { title: 'Không tìm thấy sản phẩm' }

    const url = `${BASE_URL}/${locale}/san-pham/${product.slug}-p${product.id}`
    return {
        title: `${product.name} | ${product.shopName} | TimmyHub`,
        description: truncate(stripHtml(product.description), 155),
        alternates: {
            canonical: url,
            languages: { vi: `${BASE_URL}/vi/…`, en: `${BASE_URL}/en/…`, 'x-default': `${BASE_URL}/vi/…` },
        },
        openGraph: {
            type: 'website',
            title: product.name,
            images: [{ url: product.imageUrl, width: 1200, height: 630 }],
            locale,
        },
        twitter: { card: 'summary_large_image' },
        robots: product.status === 'APPROVED' ? undefined : { index: false, follow: false },
    }
}
```

| Thẻ | Quy tắc |
|---|---|
| `title` | ≤ 60 ký tự, từ khoá đứng trước, tên sàn đứng cuối |
| `description` | 120–155 ký tự, **không** lặp lại title, sinh từ mô tả thật chứ không ghép máy móc |
| `canonical` | Bắt buộc ở **mọi** trang; trang lọc trỏ canonical về trang danh mục gốc |
| `hreflang` | Đủ cặp `vi`/`en` + `x-default`, hai chiều |
| `robots` | Sản phẩm chưa duyệt / đã gỡ / hết hàng vĩnh viễn → `noindex` |

---

## 4. Dữ liệu có cấu trúc (JSON-LD)

Bắt buộc, vì đây là thứ tạo ra kết quả tìm kiếm giàu thông tin (giá, sao, tồn kho hiện ngay trên Google).

| Trang | Schema |
|---|---|
| Chi tiết sản phẩm | `Product` + `Offer` (giá, `priceCurrency`, `availability`, `priceValidUntil`) + `AggregateRating` + `Review` |
| Danh mục | `BreadcrumbList` + `ItemList` |
| Shop | `Organization` / `Store` |
| Bài đăng | `Article` |
| Trang chủ | `WebSite` + `SearchAction` |
| Trang câu hỏi thường gặp | `FAQPage` |

```tsx
<script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(product)) }}
/>
```

Ba quy tắc không được vi phạm, nếu sai sẽ bị Google phạt thủ công:

1. Dữ liệu trong JSON-LD **phải khớp** với thứ hiển thị trên trang — giá, tồn kho, số sao.
2. Không gắn `AggregateRating` khi chưa có đánh giá thật.
3. `availability` phải phản ánh đúng tồn kho hiện tại (`InStock` / `OutOfStock` / `PreOrder`).

---

## 5. Sitemap và robots

```
/sitemap.xml                 → sitemap index
/sitemaps/products-1.xml     → tối đa 50.000 URL mỗi file
/sitemaps/categories.xml
/sitemaps/shops.xml
/sitemaps/posts.xml
```

- Sinh bằng route handler, dữ liệu lấy từ database, cache 1 giờ.
- Chỉ đưa vào URL trả `200` và `index` được — sitemap chứa URL chết làm giảm độ tin cậy của cả site.
- `lastmod` lấy từ `updatedAt` thật, không phải thời điểm sinh file.
- `robots.txt` chặn `/api/`, `/seller/`, `/admin/`, `/account/`, `/*?sort=`, `/*?page=` ngoài trang 1; cho phép phần còn lại.

---

## 6. Nội dung trùng lặp — vấn đề đặc thù của sàn

Nhiều seller đăng cùng một sản phẩm với mô tả sao chép từ nhà sản xuất. Đây là rủi ro SEO lớn nhất của mô hình sàn.

| Tình huống | Xử lý |
|---|---|
| Cùng sản phẩm ở nhiều shop | Trang gộp sản phẩm (nếu có mã EAN/UPC), các bản còn lại trỏ canonical về trang gộp |
| Mô tả sao chép nguyên văn | Cảnh báo seller lúc đăng; sản phẩm mô tả dưới 100 từ bị hạ ưu tiên index |
| Phân trang | `rel="next"/"prev"` không còn tác dụng — dùng canonical tự trỏ + link tới trang 1 |
| Biến thể là URL riêng | **Không** tạo URL riêng cho từng biến thể; dùng tham số và canonical về sản phẩm |
| Sản phẩm hết hàng | Giữ trang, hiện gợi ý thay thế, `availability: OutOfStock`. **Không** xoá hay 404 — trang đã có thứ hạng là tài sản |

---

## 7. SEO và hiệu năng đi chung

Core Web Vitals là yếu tố xếp hạng. Ngân sách cụ thể ở [performance.md](../06-quality/performance.md); riêng phần
ảnh hưởng trực tiếp tới SEO:

- Ảnh đầu tiên của trang sản phẩm đặt `priority`, định dạng AVIF/WebP, có `sizes` đúng.
- Font nạp qua `next/font`, `display: swap`, chỉ nạp nét thật sự dùng.
- Không chèn nội dung đẩy bố cục sau khi tải (banner, quảng cáo) — CLS là chỉ số bị phạt thẳng.
- Hiệu ứng chuyển động không được làm chậm LCP: xem [motion-and-effects.md](motion-and-effects.md).

---

## 8. Ngữ nghĩa HTML và khả năng truy cập

Thứ tốt cho người dùng trình đọc màn hình cũng tốt cho công cụ tìm kiếm:

- Đúng **một** `<h1>` mỗi trang, thứ bậc heading không nhảy cóc.
- Dùng `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>` thay vì `<div>` toàn bộ.
- Breadcrumb là HTML thật, không chỉ JSON-LD.
- Mọi ảnh có `alt` mô tả được nội dung; ảnh trang trí để `alt=""`.
- Liên kết là `<a href>` thật — `<div onClick={router.push}>` thì công cụ tìm kiếm không đi theo được.
- Nút phân trang/"xem thêm" phải có link thật phía sau để trang 2 trở đi có thể index.

---

## 9. Đo và theo dõi

| Việc | Công cụ | Nhịp |
|---|---|---|
| Kiểm tra index, lỗi thu thập | Google Search Console | Hằng tuần |
| Kiểm tra dữ liệu có cấu trúc | Rich Results Test trong CI trên 10 URL mẫu | Mỗi lần phát hành |
| Link chết, chuỗi redirect | Trình thu thập nội bộ chạy theo lịch | Hằng tuần |
| Web Vitals thật | `web-vitals` → PostHog/Sentry | Liên tục |
| Kiểm thử SEO tự động | Lighthouse CI hạng mục SEO ≥ 95 | Mỗi PR |

---

## 10. Checklist trước khi phát hành một loại trang mới

- [ ] Nội dung chính có trong HTML lần đầu, không chờ JS
- [ ] Có `generateMetadata` với title, description, canonical, hreflang, OG
- [ ] Có JSON-LD đúng loại và **khớp** nội dung hiển thị
- [ ] URL có slug, có `301` từ slug cũ nếu đổi
- [ ] Đã thêm vào sitemap hoặc `noindex` có chủ đích
- [ ] Đúng một `<h1>`, breadcrumb HTML thật, link là `<a href>`
- [ ] Lighthouse SEO ≥ 95, Web Vitals trong ngân sách
- [ ] Trang hết hàng/đã gỡ vẫn trả nội dung có ích, không 404 trống
