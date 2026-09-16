---
title: Đa ngôn ngữ phía backend
status: review
owner: Tech Lead
updated: 2026-09-16
related: [docs/04-frontend/i18n.md, docs/01-architecture/api-conventions.md, docs/02-domain/product-variant.md]
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
1. ?lang= trên query (chỉ cho công cụ nội bộ và link trong email)
2. Header X-Locale do frontend gắn (lấy từ /[locale]/ trên URL)
3. User.preferredLocale trong hồ sơ
4. Accept-Language
5. vi
```

Giá trị được chuẩn hoá và **kiểm tra danh sách trắng** ngay ở gateway; locale lạ thì rơi về `vi`, không báo lỗi.
Locale lưu vào `nestjs-cls` để mọi tầng dưới dùng được mà không phải truyền tay qua từng hàm.

```ts
@Injectable()
export class LocaleMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction) {
        this.cls.set('locale', resolveLocale(req))
        next()
    }
}
```

Locale còn phải đi kèm **mọi message RabbitMQ** trong `headers.locale`, nếu không email do worker gửi sẽ luôn ra tiếng Việt
kể cả với người dùng chọn tiếng Anh.

---

## 2. Thông báo lỗi

Backend **không** trả câu tiếng Việt viết sẵn. Backend trả **mã lỗi**, frontend quyết định hiển thị thế nào.

```json
{
    "success": false,
    "error": {
        "code": "ORDER_OUT_OF_STOCK",
        "message": "Sản phẩm đã hết hàng",
        "messageParams": { "productName": "Áo thun basic", "available": 2 },
        "field": "items[0].quantity"
    },
    "requestId": "01J8..."
}
```

| Trường | Vai trò |
|---|---|
| `code` | Hợp đồng giữa FE và BE, **không đổi**, viết `SCREAMING_SNAKE_CASE` |
| `message` | Bản dịch theo locale của request — dùng cho log, công cụ nội bộ, client không có bảng dịch |
| `messageParams` | Tham số để FE tự nội suy vào câu dịch của mình |

Bảng dịch phía backend nằm ở `libs/i18n/{vi,en}/errors.json`, nạp bằng `nestjs-i18n`. Có test bảo đảm **mọi `code`
xuất hiện trong code đều có khoá dịch ở tất cả ngôn ngữ** — thiếu thì CI đỏ.

Lỗi validation của zod cũng đi qua cùng cơ chế: `issue.code` + `path` → khoá dịch, không lấy nguyên văn tiếng Anh của zod.

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

- [ ] Locale được giải quyết ở gateway và đưa vào CLS + header của message RabbitMQ
- [ ] Lỗi trả `code` + `messageParams`, không phải câu hoàn chỉnh cố định
- [ ] Mọi `errorCode` có khoá dịch đủ mọi ngôn ngữ (có test)
- [ ] Danh mục dùng bảng dịch; sản phẩm dùng JSONB kèm cờ `isTranslated`
- [ ] Elasticsearch có analyzer riêng cho từng ngôn ngữ, tìm được cả không dấu
- [ ] Thông báo lưu khoá + tham số, không lưu câu
- [ ] Tiền là chuỗi decimal kèm `currency`; ngày là ISO UTC; báo cáo cắt theo `Asia/Ho_Chi_Minh`
- [ ] Không có chuỗi tiếng Việt viết thẳng trong code backend
