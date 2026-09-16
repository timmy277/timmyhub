---
title: Chuyển động và hiệu ứng giao diện
status: review
owner: FE Lead
updated: 2026-09-16
related: [docs/04-frontend/design-system.md, docs/04-frontend/component-inventory.md, docs/06-quality/performance.md, docs/04-frontend/seo.md]
---

# Chuyển động và hiệu ứng giao diện

> Chuyển động trên một sàn thương mại điện tử có đúng ba nhiệm vụ: **cho biết trạng thái đã đổi**, **nối vị trí cũ với
> vị trí mới**, và **cho biết hệ thống đang làm việc**. Hiệu ứng không phục vụ một trong ba việc đó là chi phí thuần —
> tốn khung hình, tốn pin, và làm chậm đúng những trang kiếm tiền.
>
> Ràng buộc cứng: **hiệu ứng không được làm LCP chậm đi, không được gây CLS, và phải tắt được bằng `prefers-reduced-motion`.**

---

## 1. Bộ token chuyển động

Khai một lần trong Tailwind theme, mọi component dùng lại — không ai tự chọn số.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--duration-instant` | 100 ms | Đổi màu hover, focus ring |
| `--duration-fast` | 150 ms | Tooltip, đổi trạng thái nút |
| `--duration-normal` | 250 ms | Dropdown, accordion, tab |
| `--duration-slow` | 350 ms | Dialog, drawer, sheet |
| `--duration-page` | 400 ms | Chuyển trang, chuyển bước thanh toán |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Phần tử **đi vào** |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Phần tử **đi ra** |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Nảy nhẹ: thêm vào giỏ, thả tim |

Quy tắc: phần tử **vào** dùng `ease-out` và chậm hơn một bậc; phần tử **ra** dùng `ease-in` và nhanh hơn — người dùng
không cần nhìn thứ đang biến mất.

Ba nguyên tắc còn lại:

1. **Chỉ animate `transform` và `opacity`.** Animate `width`, `height`, `top`, `left`, `box-shadow` buộc trình duyệt
   tính lại bố cục mỗi khung hình.
2. **Không animate quá 3 nhóm phần tử cùng lúc** trên một màn hình.
3. **Mọi hiệu ứng phải ngắt được** — người dùng bấm tiếp thì hiệu ứng nhường đường, không khoá tương tác.

---

## 2. Thư viện dùng cái gì

| Nhu cầu | Công cụ | Vì sao |
|---|---|---|
| 90% trường hợp: hover, focus, vào/ra, accordion | **Tailwind + `tailwindcss-animate`** trên CSS thuần | 0 KB JS, chạy trên compositor |
| Dialog, dropdown, popover, tooltip | Trạng thái `data-state` của **Radix** + CSS | Đã đúng về khả năng truy cập sẵn |
| Danh sách sắp xếp lại, chia sẻ phần tử giữa hai trang, kéo thả | **Motion** (`motion/react`, tên cũ Framer Motion), nạp động | Chỉ ở đây mới cần JS thật |
| Thanh tiến trình chuyển trang | `next/navigation` + thanh CSS | Không cần thư viện |
| Đếm số trong dashboard | `requestAnimationFrame` tự viết | Nhẹ hơn thư viện |
| Biểu đồ động | Hiệu ứng sẵn có của Recharts, tắt khi > 200 điểm dữ liệu | |

❌ **BAD** — nạp Motion vào gói chung chỉ để làm mờ dần một cái banner:

```tsx
import { motion } from 'motion/react'
export function Banner() {
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>…</motion.div>
}
```

✅ **GOOD**:

```tsx
export function Banner() {
    return <div className="animate-in fade-in duration-300">…</div>
}
```

Motion chỉ được import trong component đã `next/dynamic` với `ssr: false` — nó không được có mặt trong gói của trang chủ,
trang danh mục hay trang chi tiết sản phẩm.

---

## 3. Parallax

Parallax chỉ dùng ở **ba chỗ**: banner trang chủ, trang giới thiệu chiến dịch/landing page khuyến mãi, và trang giới
thiệu shop. Tuyệt đối không dùng trong luồng mua hàng — người đang thanh toán không cần hiệu ứng.

Cách làm, theo thứ tự ưu tiên:

**Cách 1 — CSS thuần, không JavaScript** (dùng mặc định):

```css
.parallax-scene {
    overflow-y: auto;
    perspective: 1px;                    /* tạo chiều sâu bằng chính trình duyệt */
    height: 100dvh;
}
.parallax-layer-back  { transform: translateZ(-1px) scale(2); }
.parallax-layer-front { transform: translateZ(0); }
```

**Cách 2 — `scroll-timeline` của CSS** (khi trình duyệt hỗ trợ, có dự phòng là không hiệu ứng):

```css
@supports (animation-timeline: scroll()) {
    .hero-image {
        animation: parallax-rise linear both;
        animation-timeline: scroll(root block);
        animation-range: 0 60vh;
    }
}
@keyframes parallax-rise { to { transform: translate3d(0, -80px, 0) } }
```

**Cách 3 — JavaScript** (chỉ khi hai cách trên không đủ):

❌ **BAD** — chạy trên mọi sự kiện cuộn, đọc bố cục trong handler ⇒ giật, gây layout thrashing:

```tsx
window.addEventListener('scroll', () => {
    const y = window.scrollY
    el.style.top = `${y * 0.5}px`        // 'top' buộc tính lại bố cục
})
```

✅ **GOOD** — `IntersectionObserver` để biết có trong khung nhìn không, cập nhật `transform` trong `rAF`, gắn `will-change`
chỉ khi đang chạy:

```tsx
useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
            el.current!.style.transform = `translate3d(0, ${window.scrollY * -0.3}px, 0)`
        })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
}, [])
```

Ràng buộc cho mọi parallax: tắt hoàn toàn dưới 768 px (điện thoại vừa ít khung hình vừa không thấy hiệu ứng), tắt khi
`prefers-reduced-motion`, và **không bao giờ** đặt trên phần tử LCP.

---

## 4. Danh mục hiệu ứng theo màn hình

| Chỗ | Hiệu ứng | Ràng buộc |
|---|---|---|
| Thẻ sản phẩm hover | Nâng 2 px + đổ bóng, 150 ms | Chỉ trên thiết bị có con trỏ (`@media (hover: hover)`) |
| Ảnh sản phẩm | Phóng to 1,05 trong khung `overflow-hidden` | `transform`, không đổi kích thước thật |
| Thêm vào giỏ | Ảnh bay về icon giỏ + số trên giỏ nảy | ≤ 500 ms, bỏ qua nếu reduced-motion; **không** chặn thao tác tiếp theo |
| Danh sách đang tải | Skeleton đúng hình dạng nội dung thật | Skeleton sai kích thước = CLS |
| Vô hạn cuộn | Mờ dần từng dòng, so le 50 ms | Tối đa 8 phần tử một đợt |
| Dialog / drawer | Mờ nền + trượt 8 px | Khoá cuộn nền, trả focus về nút mở |
| Thông báo (toast) | Trượt vào từ phải, tự ẩn sau 5 s | Không che nút chính; tối đa 3 cái |
| Chuyển bước thanh toán | Trượt ngang theo hướng tiến/lùi | Không animate lại nội dung đã nhập |
| Feed video dọc | Bắt dính (scroll-snap) + phát khi ≥ 60% trong khung nhìn | CSS `scroll-snap`, không JS |
| Số liệu dashboard | Đếm lên trong 600 ms | Chỉ lần hiện đầu, không đếm lại khi refetch |
| Đổi trạng thái đơn hàng theo thời gian thực | Dòng sáng nhẹ 1 lần | Không nháy liên tục gây khó chịu |
| Thả tim bài đăng | Nảy `ease-spring` + hạt bay | Lạc quan trước, hoàn tác nếu API lỗi |

---

## 5. Khả năng truy cập — điều kiện bắt buộc

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

| Yêu cầu | Chi tiết |
|---|---|
| Tôn trọng `prefers-reduced-motion` | Hiệu ứng thành chuyển trạng thái tức thì, **không** mất chức năng |
| Không tự động phát video có tiếng | Video quảng cáo mặc định tắt tiếng, có nút bật |
| Không nhấp nháy > 3 lần/giây | Nguy cơ động kinh (WCAG 2.3.1) |
| Chuyển động không truyền tải thông tin duy nhất | Luôn kèm chữ hoặc biểu tượng |
| Bẫy focus trong dialog | Radix lo sẵn, không tự viết lại |
| Có thể tạm dừng nội dung tự chạy | Carousel phải có nút dừng (WCAG 2.2.2) |

---

## 6. Ngân sách hiệu năng cho chuyển động

| Chỉ số | Ngưỡng |
|---|---|
| Khung hình khi cuộn | ≥ 55 fps trên thiết bị tầm trung |
| Thời gian một lần render do hiệu ứng | ≤ 8 ms |
| JS thêm vào do thư viện chuyển động trong gói chung | **0 KB** |
| Số lớp hợp thành (`will-change`) cùng lúc | ≤ 10 |
| CLS do hiệu ứng | 0 |

Cách kiểm: tab Performance của DevTools ở mức tiết chế CPU 4×, bật "Paint flashing" và "Layer borders". Component nào
gây repaint toàn trang thì phải sửa trước khi merge. Storybook có một story riêng cho mỗi hiệu ứng để đo tách biệt.

---

## 7. Checklist

- [ ] Hiệu ứng phục vụ một trong ba nhiệm vụ (đổi trạng thái / nối vị trí / báo đang xử lý)
- [ ] Chỉ animate `transform` và `opacity`
- [ ] Dùng token thời lượng và easing, không gõ số trực tiếp
- [ ] Không có thư viện chuyển động nào trong gói chung
- [ ] `prefers-reduced-motion` được tôn trọng và đã thử thật
- [ ] Parallax tắt trên di động, không nằm trên phần tử LCP
- [ ] Skeleton đúng kích thước nội dung thật, CLS bằng 0
- [ ] Hiệu ứng ngắt được, không khoá tương tác
- [ ] Đã đo fps trên thiết bị bị tiết chế, không chỉ trên máy lập trình viên
