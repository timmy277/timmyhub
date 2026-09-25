---
title: Đa ngôn ngữ phía backend
status: review
owner: Tech Lead
updated: 2026-09-25
related: [docs/04-frontend/i18n.md, docs/01-architecture/adr/ADR-0008-next-intl.md, docs/01-architecture/api-conventions.md, docs/02-domain/product-variant.md]
---

# Đa ngôn ngữ phía backend

> `next-intl` chỉ lo phần chuỗi tĩnh của giao diện. Ba loại nội dung còn lại **bắt buộc** phải dịch ở backend vì
> frontend không có cách nào biết: **thông báo lỗi**, **nội dung do người dùng nhập** (tên sản phẩm, danh mục), và
> **nội dung gửi ra ngoài** (email, push, hoá đơn, file xuất).
>
> Ngôn ngữ hỗ trợ: `vi` (mặc định), `en`. Kiến trúc phải thêm được ngôn ngữ thứ ba mà không sửa code.

---

## 1. Xác định ngôn ngữ của một request

Thứ tự ưu tiên, dừng ở cái đầu tiên hợp lệ:

```
1. Cookie NEXT_LOCALE — FE ghi qua Server Action `setLocale`; cùng site nên trình duyệt tự gửi kèm request API
2. Accept-Language — thương lượng theo subtag chính (`en-US` → `en`) và trọng số `q`
3. vi
```

Locale **không** nằm trên URL (bỏ segment `[locale]`, `TASK-PERF-002` đã huỷ — xem ADR-0008 phần sửa đổi), nên
không còn header `X-Locale`. Tên cookie, danh sách locale và `DEFAULT_LOCALE` dùng chung FE/BE qua
`@timmyhub/contracts` (`shared/contracts/src/locale.ts`).

Hiện thực: `resolveRequestLocale(headers)` ở `@timmyhub/common`, gọi trong `ApiExceptionFilter`. Giá trị lạ rơi về
`vi`, không báo lỗi. Chưa có `nestjs-cls` (chưa được thêm dependency) — hiện chỉ tầng filter cần locale. Khi có
nội dung sinh ở tầng service (email, file xuất) thì bổ sung CLS và hai nguồn nữa: `?lang=` cho link trong email và
`User.preferredLocale` trong hồ sơ, đứng giữa cookie và Accept-Language.

```ts
// ❌ BAD — tự đọc header ở từng controller, mỗi nơi một kiểu
const locale = req.headers['accept-language']?.slice(0, 2) ?? 'vi'

// ✅ GOOD — một hàm duy nhất, kiểm tra danh sách trắng bằng isLocale
const locale = resolveRequestLocale(req.headers)
```

Locale còn phải đi kèm **mọi message RabbitMQ** trong `headers.locale`, nếu không email do worker gửi sẽ luôn ra tiếng Việt
kể cả với người dùng chọn tiếng Anh.

---

## 2. Thông báo lỗi

Backend **không** viết sẵn câu cố định trong code. Code ném `ApiError` kèm **mã lỗi** và (tuỳ chọn) **khoá thông
điệp** + tham số; `ApiExceptionFilter` dịch theo locale của request.

```json
{
    "success": false,
    "error": {
        "code": "CONFLICT",
        "messageKey": "rbac.roleAlreadyExists",
        "messageParams": { "roleName": "editor" },
        "message": "Vai trò \"editor\" đã tồn tại",
        "details": null
    },
    "meta": { "requestId": "01J8...", "timestamp": "2026-09-25T03:12:00.000Z" }
}
```

| Trường | Vai trò |
|---|---|
| `code` | Hợp đồng giữa FE và BE (`ApiErrorCode`), **không đổi**, viết `SCREAMING_SNAKE_CASE` |
| `messageKey` | Khoá trong catalog, dạng `namespace.key`; không truyền thì mặc định `error.<CODE>` |
| `messageParams` | Tham số ICU `{name}` để FE tự nội suy vào câu dịch của mình |
| `message` | Bản dịch theo locale của request — cho log, công cụ nội bộ, client không có bảng dịch |
| `details` | Lỗi validation: mảng `{ path, messageKey, messageParams, message }`, mỗi phần tử đã dịch |

Response lỗi có header `Content-Language` cho biết ngôn ngữ của `message`.

Catalog nằm ở `shared/contracts/src/i18n/messages.{vi,en}.ts` — TS object, lồng theo namespace, cú pháp tham số ICU
tương thích `next-intl`. Bản `vi` là nguồn; bản `en` có kiểu `ApiMessageCatalog` suy từ bản `vi` và namespace
`error` `satisfies Record<ApiErrorCode, string>`, nên **thiếu khoá ở bất kỳ ngôn ngữ nào là typecheck đỏ** — CI chặn
ngay, không cần test riêng. Chưa dùng `nestjs-i18n` / file `errors.json` như kế hoạch cũ vì chưa được thêm dependency;
một catalog TS dùng chung FE/BE cũng tránh được hai bảng dịch lệch nhau.

FE nạp cùng catalog vào `next-intl` dưới namespace `api` (`frontend/src/i18n/request.ts`), nên hiển thị lỗi từ BE là
`` t(`api.${error.messageKey}`, error.messageParams) `` — không cần bảng dịch lỗi thứ hai ở FE.

```ts
// ❌ BAD — câu cố định trong code, người dùng tiếng Anh vẫn nhận tiếng Việt
throw new ConflictException(`Vai trò "${roleName}" đã tồn tại`)

// ✅ GOOD — mã lỗi + khoá có kiểu + tham số, filter dịch theo locale
throw new ApiError('CONFLICT', {
    messageKey: apiMessageKey('rbac.roleAlreadyExists'),
    messageParams: { roleName },
})
```

Lỗi validation của zod cũng đi qua cùng cơ chế: schema ở `@timmyhub/contracts` ghi `message` là **khoá**
(`apiMessageKey('validation.passwordMin')`), `ZodValidationPipe` đổi `issue` thành `{ path, messageKey,
messageParams }` (lấy `minimum`/`maximum` làm tham số), không lấy nguyên văn tiếng Anh của zod. Issue không mang khoá
thì rơi về `validation.invalid`. Khi FE nối form, dùng cùng schema với `zodResolver` và dịch
`error.message` (là khoá) bằng `t('api.…')` — hiện chưa form nào dùng schema contracts.

---

## 3. Nội dung do người dùng nhập

Đây là phần bản cũ không có. Tên sản phẩm, mô tả, tên danh mục, tên thuộc tính đều cần nhiều ngôn ngữ.

Hai chiến lược, dùng cho hai nhóm dữ liệu khác nhau:

### 3.1 Dữ liệu do sàn quản lý — bảng dịch riêng

Danh mục, thuộc tính, lý do từ chối, mẫu thông báo: số lượng ít, do admin nhập, bắt buộc đủ mọi ngôn ngữ.

```prisma
model Category {
    id           String @id @default(uuid())
    slug         String @unique
    parentId     String?
    translations CategoryTranslation[]
}

model CategoryTranslation {
    id         String @id @default(uuid())
    categoryId String
    locale     String            // 'vi' | 'en'
    name       String
    description String?

    @@unique([categoryId, locale])
    @@index([locale, name])
}
```

Đọc kèm dự phòng về ngôn ngữ mặc định:

```ts
const rows = await prisma.category.findMany({
    include: { translations: { where: { locale: { in: [locale, DEFAULT_LOCALE] } } } },
})
return rows.map((c) => ({ ...c, name: pickTranslation(c.translations, locale).name }))
```

### 3.2 Dữ liệu do seller nhập — JSONB, dịch là tuỳ chọn

Tên và mô tả sản phẩm: hàng trăm nghìn bản ghi, seller Việt Nam phần lớn chỉ nhập tiếng Việt. Bắt buộc dịch đủ là
không thực tế.

```prisma
model Product {
    name        Json   // { "vi": "Áo thun basic", "en": "Basic t-shirt" }
    description Json
    baseLocale  String @default("vi")
}
```

Quy tắc hiển thị: có bản dịch thì dùng, không có thì trả bản `baseLocale` kèm cờ `isTranslated: false` để giao diện
hiển thị nhãn "chưa có bản dịch" thay vì giả vờ như đã dịch.

❌ **BAD** — thêm cột `nameEn`, `nameJa`, … : thêm ngôn ngữ là phải migration và sửa mọi truy vấn.
✅ **GOOD** — JSONB với index GIN, hoặc bảng dịch; thêm ngôn ngữ chỉ là thêm dữ liệu.

---

## 4. Tìm kiếm đa ngôn ngữ

Elasticsearch cần **một field cho mỗi ngôn ngữ**, mỗi field một analyzer riêng — không thể dùng chung một field.

```json
{
    "name": {
        "properties": {
            "vi": { "type": "text", "analyzer": "vietnamese" },
            "en": { "type": "text", "analyzer": "english" }
        }
    }
}
```

Tiếng Việt cần tách từ và xử lý dấu riêng; tìm "ao thun" (không dấu) phải ra "áo thun". Cấu hình gồm: plugin tách từ
tiếng Việt, bộ lọc `asciifolding` cho nhánh không dấu, và một field `*.keyword` cho facet.

Truy vấn dùng `multi_match` trên field của locale hiện tại, cộng thêm field mặc định với trọng số thấp hơn để không
mất kết quả khi sản phẩm chưa có bản dịch.

---

## 5. Nội dung gửi ra ngoài

| Loại | Cách chọn ngôn ngữ | Ghi chú |
|---|---|---|
| Email | `User.preferredLocale` tại **thời điểm gửi**, không phải lúc tạo job | Mẫu email có phiên bản cho từng locale; thiếu thì rơi về `vi` và ghi cảnh báo |
| Push / in-app | Locale trong `NotificationPreference` | Lưu `titleKey` + `params`, dịch lúc **hiển thị** để đổi ngôn ngữ là đổi luôn thông báo cũ |
| Hoá đơn, chứng từ | Locale của người nhận; số tiền luôn kèm mã tiền tệ | Bản lưu trữ phải cố định ngôn ngữ, không dịch lại về sau |
| File xuất CSV/Excel | Locale của người bấm xuất | Tiêu đề cột dịch; **dữ liệu số giữ nguyên định dạng máy đọc được** |

❌ **BAD**: lưu sẵn câu thông báo tiếng Việt vào bảng `Notification`.
✅ **GOOD**: lưu `{ key: 'order.shipped', params: { orderCode } }`, dịch khi đọc.

---

## 6. Định dạng số, tiền, ngày, địa chỉ

| Hạng mục | Quy tắc |
|---|---|
| Tiền trong API | Chuỗi decimal + `currency` riêng: `{ "amount": "129000.00", "currency": "VND" }`. **Không** trả chuỗi đã định dạng sẵn |
| Định dạng tiền | Do frontend làm bằng `Intl.NumberFormat`; backend chỉ định dạng khi tự sinh email/PDF |
| Ngày giờ trong API | ISO 8601 có offset, luôn UTC: `2026-09-16T03:12:00Z` |
| Múi giờ nghiệp vụ | `Asia/Ho_Chi_Minh`. "Doanh số hôm nay" cắt theo múi giờ này, **không** theo UTC — sai chỗ này làm lệch báo cáo mỗi ngày 7 tiếng |
| Địa chỉ | Thứ tự hiển thị khác nhau giữa `vi` và `en`; lưu **có cấu trúc** (tỉnh/huyện/xã/chi tiết), định dạng lúc hiển thị |
| Sắp xếp chuỗi | `ORDER BY name COLLATE "vi-VN-x-icu"` cho tiếng Việt; sắp bằng collation mặc định sẽ sai thứ tự dấu |

---

## 7. Quy trình vận hành

1. Chuỗi mới thêm vào `vi` trước, `en` có thể tạm để trống — nhưng CI cảnh báo và chặn merge nếu thiếu ở bản phát hành.
2. Không nối chuỗi thủ công. `"Đơn " + code + " đã giao"` không dịch được sang ngôn ngữ có trật tự từ khác; dùng tham số.
3. Không dùng câu tiếng Việt làm khoá dịch — khoá là định danh có cấu trúc (`order.status.shipped`).
4. Số nhiều đi qua `ICU MessageFormat` ngay cả khi tiếng Việt không phân biệt, để tiếng Anh dùng được cùng khoá.
5. Kiểm tra không có chuỗi nào lọt ra ngoài bảng dịch: quy tắc lint chặn chuỗi tiếng Việt viết thẳng trong code backend.

---

## 8. Checklist

- [x] Locale giải quyết một chỗ (`resolveRequestLocale`): cookie `NEXT_LOCALE` → Accept-Language → `vi`
- [ ] Locale đưa vào CLS + header của message RabbitMQ (khi có nội dung sinh ở service/worker)
- [x] Lỗi trả `code` + `messageKey` + `messageParams`, không phải câu hoàn chỉnh cố định
- [x] Mọi `ApiErrorCode` và khoá thông điệp có bản dịch đủ mọi ngôn ngữ (bảo đảm bằng typecheck)
- [x] Message của schema zod là khoá, không phải câu
- [ ] Danh mục dùng bảng dịch; sản phẩm dùng JSONB kèm cờ `isTranslated`
- [ ] Elasticsearch có analyzer riêng cho từng ngôn ngữ, tìm được cả không dấu
- [ ] Thông báo lưu khoá + tham số, không lưu câu
- [ ] Tiền là chuỗi decimal kèm `currency`; ngày là ISO UTC; báo cáo cắt theo `Asia/Ho_Chi_Minh`
- [ ] Không có chuỗi tiếng Việt viết thẳng trong code backend
