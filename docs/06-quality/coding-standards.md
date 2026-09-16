---
title: Chuẩn mã nguồn và định dạng
status: review
owner: Tech Lead
updated: 2026-09-16
related: [docs/06-quality/git-hooks.md, docs/06-quality/definition-of-done.md, docs/06-quality/performance.md, docs/01-architecture/api-conventions.md]
---

# Chuẩn mã nguồn và định dạng

> Mọi quy tắc ở đây phải **kiểm được bằng máy**. Quy tắc chỉ nằm trong tài liệu mà không có lint/test bảo vệ thì
> sáu tháng nữa sẽ không còn ai tuân thủ. Mỗi mục dưới đây ghi rõ: ai bắt lỗi, ở bước nào.

---

## 1. Công cụ và điểm chặn

| Bước | Công cụ | Chặn cái gì |
|---|---|---|
| Lúc gõ | ESLint + Prettier trong IDE, `.editorconfig` | Định dạng, quy tắc rõ ràng |
| `pre-commit` | `lint-staged`: Prettier → ESLint `--fix --max-warnings=0` trên file đã stage | Định dạng và lỗi lint, dưới 5 giây |
| `commit-msg` | `commitlint` (Conventional Commits, scope bắt buộc) | Thông điệp commit sai chuẩn |
| `pre-push` | `turbo run typecheck --filter='...[origin/main]'` | Lỗi kiểu ở package bị ảnh hưởng |
| CI | Toàn bộ lint + `tsc` + test + `gitleaks` + Trivy + kiểm tra truy vết docs | Mọi thứ còn lại |

Cấu hình hook, quy ước commit, tên nhánh và danh sách scope: [git-hooks.md](git-hooks.md).

Cấu hình nằm **một chỗ duy nhất** ở gốc workspace (`eslint.config.mjs`, `prettier.config.mjs`, `tsconfig.base.json`);
package con chỉ được mở rộng, không được định nghĩa lại quy tắc.

### 1.1 Định dạng

| Thiết lập | Giá trị | Lý do |
|---|---|---|
| Thụt lề | 4 space | Giữ theo repo cũ, tránh diff toàn bộ |
| Kết dòng | LF, kể cả trên Windows (`.gitattributes: * text=auto eol=lf`) | Không có commit đổi toàn bộ dòng |
| Độ dài dòng | 120 | Đủ cho generic dài, vẫn xem được diff hai cột |
| Dấu chấm phẩy | không | Nhất quán với cấu hình Prettier đã chọn |
| Nháy | nháy đơn, JSX dùng nháy kép | |
| Dấu phẩy cuối | `all` | Diff sạch khi thêm dòng |
| Thứ tự import | tự động sắp: built-in → ngoài → `@timmyhub/*` → tương đối | Bỏ tranh cãi thủ công |

Định dạng **không bao giờ** là nội dung review. Người review bình luận về định dạng nghĩa là công cụ đang thiếu.

---

## 2. TypeScript

`strict: true` ở **mọi** package, kể cả backend — bản cũ để `strict: false` và `no-explicit-any: 'off'`, đó là gốc rễ
của phần lớn lỗi lúc chạy.

| Quy tắc | Mức |
|---|---|
| `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` | bật |
| `@typescript-eslint/no-explicit-any` | error (muốn thoát phải có `// eslint-disable` kèm lý do) |
| `@typescript-eslint/no-floating-promises` | error — promise nuốt lỗi là lỗi im lặng tệ nhất |
| `@typescript-eslint/consistent-type-imports` | error |
| Ép kiểu `as` | chỉ cho phép ở ranh giới hạ tầng, kèm kiểm tra bằng zod ngay sau đó |

❌ **BAD** — ép kiểu cho qua trình biên dịch, lỗi nổ lúc chạy:

```ts
const user = req.user as AuthUser
const total = (order as any).total * 1.1
```

✅ **GOOD** — kiểm ở ranh giới, bên trong đã có kiểu chắc chắn:

```ts
const user = AuthUserSchema.parse(req.user)
const total = new Decimal(order.total).mul('1.1')
```

Quy ước đặt tên:

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| File TS | `kebab-case.ts` | `order-state.service.ts` |
| Component React | `PascalCase.tsx` | `ProductVariantPicker.tsx` |
| Type/Interface | `PascalCase`, **không** tiền tố `I` | `OrderSummary` |
| Hằng | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| Boolean | `is`/`has`/`can`/`should` | `canRefund` |
| Hàm bất đồng bộ trả dữ liệu | động từ + danh từ | `getOrderById`, không `orderData()` |
| Sự kiện | `<domain>.<entity>.<quá khứ>` | `order.status-changed` |

---

## 3. Backend (NestJS)

| Quy tắc | Ai bắt |
|---|---|
| Controller **không** chứa logic nghiệp vụ — chỉ nhận, uỷ quyền, trả | Review + giới hạn độ dài hàm |
| Mọi input đi qua zod (`nestjs-zod`); **không** dùng class-validator | ESLint cấm import `class-validator` |
| Không truy cập `PrismaService` từ controller | ESLint `no-restricted-imports` theo thư mục |
| Mỗi service chỉ chạm database của chính nó | Kiểm tra `DATABASE_URL` lúc khởi động + network policy |
| Không gọi mạng trong transaction | Review + lint tự viết bắt `await fetch|axios|client.send` trong `$transaction` |
| Lỗi nghiệp vụ ném exception có mã, không trả `null` mập mờ | Review |
| Mọi thao tác ghi có `@AuditAction` | Test quét metadata |
| Không `console.log` | ESLint `no-console` (dùng `pino`) |

❌ **BAD** — controller làm hết, không có ranh giới, lỗi mất dấu:

```ts
@Post()
async create(@Body() body: any) {
    const product = await this.prisma.product.create({ data: body })
    await this.es.index({ index: 'products', body: product })
    return product
}
```

✅ **GOOD**:

```ts
@Post()
@Permissions(PERMISSIONS.CATALOG.PRODUCTS.CREATE)
@AuditAction('catalog.product.create')
async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser): Promise<ApiResponse<ProductDto>> {
    return ok(await this.productService.create(dto, user))
}
```

Việc index Elasticsearch thuộc về consumer của `EVT-product.created`, không nằm trên đường request.

### 3.1 Prisma

- Luôn `select`/`include` tường minh ở đường đọc nóng — `findMany` trần kéo cả cột `description` dài.
- Không truy vấn trong vòng lặp; gộp bằng `in` hoặc `groupBy`. Lint tự viết bắt `await prisma` bên trong `for`/`map`.
- Migration phải có tên mô tả được việc (`20260916_add_variant_option_key`), không để tên tự sinh vô nghĩa.
- Không `db push` trên bất kỳ môi trường nào ngoài máy cá nhân.

---

## 4. Frontend (Next.js + React)

| Quy tắc | Lý do |
|---|---|
| Mặc định là Server Component; `'use client'` đặt ở **lá** nhỏ nhất | Giảm JS gửi xuống |
| Không `useEffect` để lấy dữ liệu | Dùng RSC hoặc TanStack Query |
| Không giữ state máy chủ trong Zustand | Zustand chỉ cho UI state (mở/đóng, bộ lọc chưa áp dụng) |
| Mọi form qua `react-hook-form` + `zodResolver`, dùng **chung schema** với backend | Một nguồn quy tắc |
| Mọi danh sách có trạng thái: loading, rỗng, lỗi, không có quyền | Bản cũ thiếu toàn bộ |
| Mọi route có `error.tsx`, `loading.tsx`; mỗi route group có `not-found.tsx` | Bản cũ **không có file nào** |
| Không `dangerouslySetInnerHTML` nếu chưa sanitize ở server | XSS |
| Ảnh luôn qua `next/image` có `sizes` | LCP |
| Không chuỗi tiếng Việt viết thẳng trong component | Phải qua `next-intl` |

❌ **BAD** — biến cả trang thành client chỉ vì một nút:

```tsx
'use client'
export default function ProductPage({ params }) {
    const [data, setData] = useState(null)
    useEffect(() => { fetch(`/api/products/${params.id}`).then(r => r.json()).then(setData) }, [])
    if (!data) return <Spinner />
    return <article>…<AddToCartButton id={data.id} /></article>
}
```

✅ **GOOD** — trang là server component, chỉ cái nút là client:

```tsx
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const product = await getProduct(id)          // chạy trên server, không gửi JS
    return <article>…<AddToCartButton variantId={product.defaultVariantId} /></article>
}
```

---

## 5. Tiền tệ

Tiền là nơi sai lầm không được phép xảy ra, và là nơi JavaScript sai một cách âm thầm:
`0.1 + 0.2 !== 0.3`, và `2_000_000.5 * 3` ở đơn hàng nhiều dòng sẽ lệch vài đồng — đủ để đối soát không khớp.

| Tầng | Quy định |
|---|---|
| Database | `Decimal @db.Decimal(14,2)` |
| Backend tính toán | `Prisma.Decimal` (decimal.js), **không** ép sang `number` ở bất kỳ bước nào |
| API và event payload | **Chuỗi** decimal (`"199000.00"`) + trường `currency` riêng (`"VND"`) |
| Frontend tính toán | `dinero.js` v2, hoặc lớp `Money` mỏng bọc `bigint` đơn vị nhỏ nhất |
| Hiển thị | `Intl.NumberFormat(locale, { style: 'currency', currency })` — chỉ ở lớp hiển thị |

❌ **BAD** — mất chính xác và mất đơn vị tiền:

```ts
const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0)   // number: sai số
<span>{total.toLocaleString()}đ</span>                                  // ghép đơn vị bằng tay
```

✅ **GOOD**:

```ts
const total = items.reduce(
    (sum, i) => add(sum, multiply(dinero({ amount: toMinor(i.price), currency: VND }), i.qty)),
    dinero({ amount: 0, currency: VND }),
)
<span>{formatMoney(total, locale)}</span>
```

Quy tắc kèm theo:

- **Cấm toán tử số học trần trên tiền** ở frontend; có quy tắc ESLint chặn `price *`, `price +` trên các kiểu tiền.
- Frontend **không bao giờ** là nguồn sự thật của tổng tiền. Tổng hiển thị là để người dùng thấy trước; tổng tính tiền
  luôn do backend trả về và backend tính lại khi tạo đơn.
- Làm tròn chỉ xảy ra **một lần**, ở bước cuối, theo quy tắc đã ghi trong spec (VND không có phần lẻ khi thanh toán).
- Chia tiền (chia hoa hồng, chia phí ship cho nhiều dòng) dùng hàm `allocate` — phần dư phải được phân bổ hết, không
  được biến mất.
- Không có số tiền nào mà thiếu `currency` đi kèm, kể cả khi hiện tại chỉ có VND.

---

## 6. Cấu trúc thư mục

```
backend/apps/<service>/src/
    modules/<domain>/
        <domain>.controller.ts      # chỉ HTTP/RPC
        <domain>.service.ts         # nghiệp vụ
        <domain>.repository.ts      # truy cập dữ liệu
        dto/                        # zod schema + type suy ra
        events/                     # publisher + consumer
    main.ts
frontend/src/
    app/[locale]/(public|auth|account|seller|admin)/…
    components/ui/                  # shadcn nguyên bản, không sửa tay
    components/common/              # component dùng chung của dự án
    features/<domain>/              # component + hook + api gắn với một domain
    lib/                            # tiện ích thuần, không phụ thuộc React
```

Quy tắc phụ thuộc, kiểm bằng ESLint boundaries: `features/*` được dùng `components/*` và `lib/*`; chiều ngược lại **cấm**.
Hai feature không import chéo nhau — cần dùng chung thì nâng lên `components/common`.

---

## 7. Bình luận và tài liệu trong code

- Bình luận giải thích **vì sao**, không mô tả lại code làm gì.
- Mọi chỗ đi ngược trực giác phải có một dòng lý do — nhất là các mẹo tránh race condition.
- `TODO` phải kèm mã task: `// TODO(TASK-ORD-042): …`. `TODO` trần bị CI chặn.
- Hàm public của thư viện dùng chung có JSDoc nêu đơn vị đo và trường hợp biên (`amount tính bằng VND, không phải xu`).

---

## 8. Review code

Người review tìm **bốn** thứ, theo đúng thứ tự:

1. **Đúng không** — trường hợp biên, lỗi, đồng thời, idempotency.
2. **An toàn không** — phân quyền, phạm vi dữ liệu, dữ liệu cá nhân trong log.
3. **Có tự bảo vệ không** — test, ràng buộc DB, xử lý lỗi.
4. **Đọc được không** — tên gọi, độ phức tạp, trùng lặp.

Không bình luận về định dạng. Không yêu cầu đổi phong cách nếu không có lý do kỹ thuật. PR quá 400 dòng đổi thì
đề nghị tách trước khi review — review PR lớn chỉ là nghi thức.

---

## 9. Checklist tự kiểm trước khi mở PR

- [ ] `pnpm lint && pnpm typecheck && pnpm test` xanh tại máy
- [ ] Không còn `any`, `console.log`, `TODO` không mã, code chết
- [ ] Input mới có zod schema; endpoint mới có permission + audit + Swagger
- [ ] Truy vấn mới có `select` tường minh và đi qua phạm vi dữ liệu
- [ ] Có test cho nhánh lỗi, không chỉ nhánh thành công
- [ ] Docs liên quan cập nhật trong **cùng PR**
- [ ] PR dưới 400 dòng đổi, hoặc đã giải thích vì sao không tách được
