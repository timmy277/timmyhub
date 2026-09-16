---
title: Cổng chất lượng tự động — a11y, Lighthouse CI, size-limit
status: review
owner: Tech Lead
updated: 2026-09-16
related: [docs/06-quality/performance.md, docs/06-quality/coding-standards.md, docs/04-frontend/motion-and-effects.md, docs/04-frontend/seo.md, docs/04-frontend/storybook.md]
---

# Cổng chất lượng tự động

> Cam kết "WCAG 2.2 AA" và "ngân sách hiệu năng" trong các tài liệu khác hiện **không có gì kiểm chứng** — chúng là lời
> hứa, không phải ràng buộc. Tài liệu này biến chúng thành cổng CI: vi phạm thì PR đỏ.
>
> Cảnh báo thực tế: bật đồng loạt ở chế độ chặn sẽ làm đỏ gần như mọi PR trong hai tuần đầu. Vì vậy §4 quy định lộ
> trình bật dần — mốc nào bật ngày nào, ai dọn.

---

## 1. Khả năng truy cập

Ba lớp, mỗi lớp bắt loại lỗi khác nhau; **không lớp nào thay được lớp kia**:

| Lớp | Công cụ | Bắt được | Không bắt được |
|---|---|---|---|
| Lúc gõ code | `eslint-plugin-jsx-a11y` | Thiếu `alt`, `onClick` trên `<div>`, thiếu `htmlFor`, `tabIndex` dương | Mọi thứ phụ thuộc DOM đã render |
| Lúc xem component | Addon a11y của **Storybook** (chạy axe trên từng story) | Tương phản, thiếu nhãn, vai trò sai, thứ tự heading trong component | Vấn đề ở mức cả trang, luồng nhiều bước |
| Lúc chạy thật | `@axe-core/playwright` trong e2e | Vấn đề mức trang: landmark trùng, bẫy focus, thứ tự tab, trạng thái động | Thứ chỉ người thật phát hiện (nhãn vô nghĩa, thứ tự đọc khó hiểu) |

Không công cụ tự động nào bắt quá ~40% lỗi thật. Ba lớp trên là **sàn**, không phải trần — vẫn phải kiểm bằng bàn phím
và trình đọc màn hình cho các luồng ở §1.2.

### 1.1 Cấu hình cổng

| Cổng | Quy định |
|---|---|
| ESLint `jsx-a11y` | Bộ `recommended` + bật thêm `no-autofocus`, `no-noninteractive-element-interactions`; mức `error` |
| Storybook a11y | Mọi story chạy axe; lỗi mức `serious`/`critical` làm CI đỏ; `moderate` chỉ cảnh báo |
| Playwright + axe | 8 luồng trọng yếu ở §1.2; **không** lỗi `serious`/`critical` |
| Loại trừ | Mọi ngoại lệ phải khai trong `a11y-exceptions.json` kèm lý do, chủ sở hữu và hạn xử lý; không có `disable` rải rác trong code |

```ts
// e2e/a11y.spec.ts — khuôn chung cho mọi luồng
const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact!))).toEqual([])
```

### 1.2 Tám luồng bắt buộc kiểm

Trang chủ · danh sách sản phẩm · chi tiết sản phẩm (có chọn biến thể) · giỏ hàng · thanh toán · đăng nhập/đăng ký ·
bảng đơn hàng của seller · form đăng sản phẩm.

Đây là các luồng ra tiền và các luồng có form phức tạp nhất — lỗi truy cập ở đây là mất khách thật, không phải lỗi hình thức.

### 1.3 Kiểm thủ công theo quý

Bàn phím xuyên một lượt mua hàng (không chạm chuột) · NVDA hoặc VoiceOver trên hai luồng · phóng to 200% · chế độ tương
phản cao · `prefers-reduced-motion` bật.

---

## 2. Lighthouse CI

| Hạng mục | Quy định |
|---|---|
| Route kiểm | Trang chủ, chi tiết sản phẩm, danh sách, giỏ hàng, thanh toán |
| Số lần chạy | 3 lần/route, lấy **trung vị** (chạy 1 lần thì nhiễu cao hơn tín hiệu) |
| Môi trường | Bản build production, chạy trên preview deployment, CPU throttle 4× |
| Lưu kết quả | LHCI server hoặc `temporary-public-storage`, có lịch sử để thấy xu hướng |

Ngưỡng **chặn merge** (`assert.assertions`):

| Chỉ số | Ngưỡng |
|---|---|
| Performance | ≥ 85 (trang chủ, sản phẩm, danh sách) · ≥ 80 (giỏ, thanh toán) |
| Accessibility | **≥ 95** |
| Best practices | ≥ 90 |
| SEO | **≥ 95** trên trang công khai |
| LCP, CLS, TBT | Theo bảng ngân sách ở [performance.md §1.1](performance.md#11-frontend-đo-trên-thiết-bị-mô-phỏng-moto-g-power-mạng-4g-chậm) |

Hai điều chỉnh để ngưỡng không thành hình thức:

1. **Ngưỡng là con số đo được hiện tại + biên 5%**, không phải con số đẹp bịa ra. Chốt lại sau khi có 5 route thật chạy
   được lần đầu.
2. **Không ai được hạ ngưỡng để PR qua.** Hạ ngưỡng phải là một PR riêng, có lý do, do Tech Lead duyệt.

---

## 3. size-limit

Ngân sách JS ở [performance.md §1.1](performance.md#11-frontend-đo-trên-thiết-bị-mô-phỏng-moto-g-power-mạng-4g-chậm)
được thi hành ở đây. `size-limit` chạy trên **mọi PR** và bình luận mức chênh so với `main`.

```js
// .size-limit.js
module.exports = [
    { name: 'Gói chung (framework + chia sẻ)', path: '.next/static/chunks/main-*.js', limit: '90 KB' },
    { name: 'Trang chủ',            path: '.next/static/chunks/app/[locale]/page-*.js',                 limit: '160 KB' },
    { name: 'Chi tiết sản phẩm',    path: '.next/static/chunks/app/[locale]/san-pham/**/page-*.js',     limit: '180 KB' },
    { name: 'Thanh toán',           path: '.next/static/chunks/app/[locale]/thanh-toan/**/page-*.js',   limit: '200 KB' },
]
```

Quy tắc kèm theo — đây mới là phần ngăn gói phình:

- Thư viện nặng (AG Grid, Recharts, TipTap, Uppy, `hls.js`, `media-chrome`, Motion) **phải** nạp động. Có bài kiểm riêng
  khẳng định tên các thư viện này **không** xuất hiện trong chunk chung.
- Tăng `limit` là thay đổi có chủ đích: PR riêng, ghi lý do trong mô tả, không nhét chung với tính năng.
- Vượt trần > 10% thì CI đỏ; vượt 0–10% thì cảnh báo và cần một người duyệt thêm.

---

## 4. Lộ trình bật (để không đỏ toàn bộ trong tuần đầu)

| Tuần | Trạng thái | Việc phải xong |
|---|---|---|
| Tuần 1 | Tất cả ở chế độ **báo cáo**, không chặn | Dựng CI job, lấy số đo nền cho từng route/story |
| Tuần 2 | Chốt ngưỡng từ số đo thật + biên 5%; `jsx-a11y` **chặn** | Dọn lỗi lint a11y (thường vài chục, sửa nhanh) |
| Tuần 3 | `size-limit` **chặn** | Chuyển các import nặng sang nạp động |
| Tuần 4 | Storybook a11y **chặn** mức `serious`/`critical` | Dọn tương phản màu và nhãn thiếu trong design system |
| Tuần 5 | Lighthouse CI và axe e2e **chặn** | Dọn lỗi mức trang |
| Từ tuần 6 | Toàn bộ chặn; ngưỡng chỉ siết, không nới | Mỗi quý rà lại ngưỡng |

Nguyên tắc trong giai đoạn dọn: **nợ được ghi ra, không được giấu.** Mỗi lỗi chưa sửa nằm trong `a11y-exceptions.json`
hoặc một issue có hạn, chứ không nằm trong một dòng `eslint-disable` không ai đọc.

---

## 5. Nơi chạy trong CI

| Job | Chạy khi | Thời gian mục tiêu |
|---|---|---|
| `lint` (gồm `jsx-a11y`) | Mọi PR | < 2 phút |
| `storybook-test` (a11y + interaction) | PR có đổi file trong `components/**` | < 5 phút |
| `size-limit` | PR có đổi frontend | < 3 phút |
| `lighthouse-ci` | Sau khi preview deploy xong | < 8 phút |
| `e2e-a11y` | PR vào `main` và lịch đêm | < 10 phút |

Job chậm không được chặn vòng phản hồi nhanh: `lint` và `size-limit` chạy trước, Lighthouse và e2e chạy song song sau.

---

## 6. Checklist

- [ ] Ngưỡng lấy từ số đo thật, không bịa
- [ ] Ba lớp a11y đều bật, mỗi lớp có bài kiểm chứng minh nó thật sự làm CI đỏ khi có lỗi
- [ ] Ngoại lệ a11y nằm trong file khai báo, có chủ và có hạn
- [ ] `size-limit` có bài kiểm khẳng định thư viện nặng không ở trong gói chung
- [ ] Hạ ngưỡng luôn là PR riêng do Tech Lead duyệt
- [ ] Lộ trình bật dần được ghi vào kế hoạch sprint, có người phụ trách dọn
