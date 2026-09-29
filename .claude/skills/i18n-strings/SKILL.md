---
name: i18n-strings
description: Xử lý đa ngôn ngữ TimmyHub — trích chuỗi cứng ra next-intl (FE) và catalog thông điệp lỗi (BE), đặt tên khoá, số nhiều, định dạng tiền/ngày, thêm một ngôn ngữ mới. Dùng khi được yêu cầu "dịch", "đa ngôn ngữ", "thêm tiếng Anh", "chuỗi cứng", hoặc khi thêm màn hình mới có chữ hiển thị.
---

# Đa ngôn ngữ

Hai tầng tách bạch, không trộn:

| Tầng | Ai dịch | Nơi lưu |
|---|---|---|
| Giao diện | Frontend, `next-intl` | `frontend/messages/vi.json`, `frontend/messages/en.json` |
| Thông điệp nghiệp vụ / lỗi | Backend, mã lỗi + catalog | `docs/01-architecture/i18n-backend.md` |

**Mỗi locale là MỘT file, không phải một thư mục.** Namespace là khoá ở cấp cao nhất bên trong file
(`userManagement.list.title`), không phải tên file. Thêm namespace = thêm một khoá gốc vào **cả hai** file, không tạo
file mới. Đừng đi tìm `messages/vi/userManagement.json` — đường dẫn đó không tồn tại.

Namespace hiện có: `metadata`, `common`, `nav`, `theme`, `home`, `login`, `dashboard`, `pagination`, `agGridTable`,
`userManagement`, `role`.

**Backend không trả câu tiếng Việt cho frontend hiển thị thẳng.** Backend trả `code` + tham số; frontend quyết định
hiển thị bằng ngôn ngữ nào. Lý do: cùng một lỗi còn đi ra email, push, webhook và log — mỗi kênh một ngôn ngữ khác nhau.

```ts
// ❌ BAD
throw new BadRequestException('Sản phẩm đã hết hàng')

// ✅ GOOD
throw new DomainError('CATALOG_OUT_OF_STOCK', { productName, available: 0 })
```

## 1. Tìm chuỗi cứng

```bash
# Chuỗi có dấu tiếng Việt nằm trong mã nguồn
grep -rnE '["'"'"'`][^"'"'"'`]*[àáảãạăâđèéẻẽẹêìíỉĩịòóỏõọôơùúủũụưỳýỷỹỵ]' frontend/src backend/apps --include='*.ts' --include='*.tsx' | grep -v '\.test\.' | grep -v 'messages/'
```

Kết quả cần phân loại, **không** dịch tất cả:

| Loại | Xử lý |
|---|---|
| Chữ hiển thị cho người dùng | Trích ra `messages/` |
| Nhãn trong Storybook/test/seed | Để nguyên |
| Comment | Để nguyên — comment tiếng Việt là đúng quy ước |
| Tên enum, key, tên sự kiện | Để nguyên tiếng Anh, **không** dịch |

## 2. Đặt tên khoá

`<namespace>.<màn hoặc component>.<ý nghĩa>` — theo **ý nghĩa**, không theo nội dung câu:

```
common.action.save                  ✅
common.action.saveTheProductNow     ❌ (nội dung đổi là khoá sai nghĩa)
product.detail.outOfStock           ✅
product.detail.text1                ❌ (không đọc được ở chỗ khác)
```

Namespace theo domain. Danh sách đang dùng nằm ở mục đầu file — **đọc lại `Object.keys(messages/vi.json)` trước khi
đặt tên mới**, đừng bịa namespace mới khi đã có cái phù hợp. Chuỗi dùng ở ≥ 2 namespace thì chuyển lên `common`,
không sao chép.

## 3. Quy tắc

- **Cấm ghép chuỗi** — dùng tham số và ICU MessageFormat:
  ```ts
  // ❌ BAD
  t('order.found') + ' ' + count + ' ' + t('order.items')
  // ✅ GOOD
  t('order.foundItems', { count })       // "Tìm thấy {count} sản phẩm"
  ```
- Số nhiều dùng `plural` của ICU. Tiếng Việt không chia số nhiều nhưng tiếng Anh có — viết `plural` từ đầu để không
  phải sửa lại toàn bộ khi thêm ngôn ngữ.
- Tiền: **không** dịch, định dạng bằng `Intl.NumberFormat(locale, { style: 'currency', currency })` từ **chuỗi decimal**.
- Ngày giờ: `Intl.DateTimeFormat` theo locale + múi giờ người dùng; dữ liệu luôn là UTC.
- Ngôn ngữ nằm trong cookie `NEXT_LOCALE`, **không** có segment `[locale]`; `vi` là mặc định. `Locale`, `isLocale`,
  `DEFAULT_LOCALE` import từ `@timmyhub/contracts`; `useLocale()` đã có kiểu `Locale`, không ép `as Locale`.
- Lỗi từ BE hiển thị bằng `` t(`api.${messageKey}`, messageParams) `` — catalog `api` dùng chung với BE, không tự đặt
  khoá lỗi riêng ở FE. Message của schema zod là khoá `validation.*`, không phải câu.
- Chuỗi cho SEO (title, description, JSON-LD) cũng phải dịch — thường bị bỏ sót.
- Tiếng Anh dài hơn tiếng Việt khoảng 30%: kiểm lại nút, chip, tiêu đề cột bảng ở bản `en` xem có vỡ layout không.
- Thiếu khoá thì báo lỗi ồn ào ở dev và CI, **không** âm thầm hiện tên khoá ra cho người dùng.

## 4. Kiểm tự động — chạy TRƯỚC khi báo xong

Sửa `messages/*.json` mà không chạy bước này là lỗi thường gặp nhất: `tsc` và `eslint` **không** biết gì về hai cây
JSON, nên thiếu khoá ở `en` vẫn build xanh và chỉ lộ ra khi người dùng đổi ngôn ngữ.

```bash
pnpm --filter timmyhub-nextjs check:i18n
# hoặc chạy thẳng: node frontend/scripts/check-i18n.cjs
```

Script `frontend/scripts/check-i18n.cjs` kiểm ba thứ và **exit 1** nếu có vấn đề:

| Kiểm | Bắt được lỗi gì |
|---|---|
| Parity khoá | Khoá có ở `vi` mà thiếu ở `en` (hoặc ngược lại) |
| Placeholder drift | Cùng khoá nhưng `{count}` ở `vi` lại là `{total}` ở `en` → bản dịch in ra `{count}` trần |
| Khoá chết | Khoá không được tham chiếu ở `src/**` (thường là tàn dư sau khi đổi tên) |

Bẫy khi tự viết lại phần "khoá chết": đừng dùng `blob.includes(key)` trần — nó khớp cả `closest`/`onClose` và bỏ sót
khoá chết thật. Phải khớp tên lá **trong dấu nháy** (nháy đơn, nháy kép hoặc backtick), vì code gọi `t('pageInfo')`
bên trong namespace chứ không viết đủ đường dẫn.

## 5. Thêm một ngôn ngữ mới

1. Thêm mã ngôn ngữ vào cấu hình `next-intl` và middleware.
2. Thêm **một file** `messages/<locale>.json` (vd `messages/en.json`), giữ **nguyên** cấu trúc khoá của `vi.json`.
3. Dịch; khoá chưa dịch thì rơi về `vi` **và** bị liệt kê trong báo cáo CI, không được im lặng.
4. Bổ sung catalog thông điệp lỗi phía backend cho ngôn ngữ đó.
5. Thêm `hreflang`, `sitemap` cho ngôn ngữ mới.
6. Kiểm thứ tự sắp xếp, định dạng số, định dạng địa chỉ theo locale.

## 6. Bàn giao

- [ ] `grep` không còn chuỗi hiển thị cứng trong phạm vi vừa sửa
- [ ] **Đã chạy `pnpm --filter timmyhub-nextjs check:i18n` và exit 0** (parity + placeholder + khoá chết)
- [ ] Mọi khoá có đủ ở **mọi** locale; không khoá thừa không ai dùng
- [ ] Không ghép chuỗi; số nhiều dùng ICU `plural`
- [ ] Tiền và ngày dùng `Intl`, không tự viết hàm định dạng
- [ ] Backend trả mã lỗi, không trả câu tiếng Việt
- [ ] Đã xem màn hình ở bản `en`, không vỡ layout
