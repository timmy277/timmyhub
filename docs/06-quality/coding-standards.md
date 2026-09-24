---
title: Chuẩn mã nguồn và định dạng
status: review
owner: Tech Lead
updated: 2026-09-24
related: [docs/06-quality/git-hooks.md, docs/06-quality/definition-of-done.md, docs/06-quality/performance.md, docs/01-architecture/api-conventions.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# Chuẩn mã nguồn và định dạng

> Mọi quy tắc ở đây phải **kiểm được bằng máy**. Quy tắc chỉ nằm trong tài liệu mà không có lint/test bảo vệ thì
> sáu tháng nữa sẽ không còn ai tuân thủ. Mỗi mục dưới đây ghi rõ: ai bắt lỗi, ở bước nào.

---

## 1. Công cụ và điểm chặn

| Bước | Công cụ | Chặn cái gì |
|---|---|---|
| Lúc gõ | ESLint + Prettier trong IDE, `.editorconfig` | Định dạng, quy tắc rõ ràng |
| `pre-commit` | `lint-staged`: ESLint `--fix --max-warnings=0` bằng ESLint **của chính app** trên file đã stage | Định dạng và lỗi lint, dưới 5 giây |
| `commit-msg` | `commitlint` (Conventional Commits, scope bắt buộc) | Thông điệp commit sai chuẩn |
| `pre-push` | `turbo run typecheck --filter='...[origin/main]'` (**chưa bật**, chờ Turborepo) | Lỗi kiểu ở package bị ảnh hưởng |
| CI | Toàn bộ lint + `tsc` + test + `gitleaks` + Trivy + kiểm tra truy vết docs | Mọi thứ còn lại |

Cấu hình hook, quy ước commit, tên nhánh và danh sách scope: [git-hooks.md](git-hooks.md).

Định dạng dùng **một `prettier.config.mjs` duy nhất ở gốc workspace**, không có `.prettierrc` trong `frontend/` hay
`backend/`; `pre-commit` tự định dạng lại file đã stage nên không ai phải chỉnh tay. ESLint thì tạm thời vẫn là hai
config riêng theo khuôn mẫu khởi tạo của Next.js và Nest — gộp về gốc làm cùng lúc với tái cấu trúc monorepo ở
[monorepo-and-build.md](../05-infra/monorepo-and-build.md), **không** ép một ESLint duy nhất ở gốc chạy lên hai bộ
plugin khác phiên bản.

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
| Module không import trực tiếp file nội bộ của module khác, chỉ qua `index.ts` | ESLint boundaries theo `src/modules/<domain>` |
| Không gọi mạng ngoài (HTTP bên thứ ba, SMTP, webhook) trong `$transaction` — gọi module khác qua DI thì được | Review + lint tự viết bắt `await fetch\|axios\|client.send` trong `$transaction` |
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
- **Xung đột migration khi rebase**: chỉ có một thư mục `migrations/` cho toàn app
  ([data-architecture.md](../01-architecture/data-architecture.md)). Hai PR cùng đổi schema (kể cả ở hai module khác
  nhau) mà merge lệch thứ tự sẽ tạo hai migration cùng base — `prisma migrate dev` không tự dàn xếp được thứ tự này.
  Quy tắc: trước khi mở PR, `rebase` lên `main` mới nhất rồi chạy lại `prisma migrate dev` để migration của mình luôn
  là migration **cuối cùng** trong lịch sử; nếu CI báo lệch (`prisma migrate diff --exit-code`), xoá migration vừa
  sinh, rebase lại, sinh lại — không sửa tay file migration đã tồn tại trên `main`.

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
| Ô nhập text/chọn trong form dùng field label nổi (`FloatInput`, `FloatCombobox`, `FloatMultiSelect`, `FloatDatePicker`, `FloatDateRangePicker`), không ghép `<Label>` + `<Input>` | Một kiểu form thống nhất; label gắn sẵn `htmlFor`, lỗi gắn sẵn `aria-describedby` |

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

❌ **BAD** — label tách rời, tự nối `htmlFor`/lỗi bằng tay, mỗi form một kiểu:

```tsx
<Label htmlFor="email">{t('email')}</Label>
<Input id="email" {...register('email')} />
{errors.email && <p className="text-destructive">{errors.email.message}</p>}
```

✅ **GOOD** — field label nổi lo label, trạng thái lỗi và liên kết ARIA:

```tsx
<FloatInput label={t('email')} error={errors.email?.message} {...register('email')} />
<Controller
    control={control}
    name="categoryIds"
    render={({ field, fieldState }) => (
        <FloatMultiSelect
            label={t('categories')}
            options={categoryOptions}
            value={field.value}
            onValueChange={field.onChange}
            error={fieldState.error?.message}
        />
    )}
/>
```

`<Label>` rời chỉ dùng cho control không có ô nhập chữ: checkbox, radio, switch.

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
backend/
    apps/
        api/src/main.ts              # web process — bootstrap mọi module domain + module platform
        worker/src/main.ts           # process BullMQ — entrypoint mặc định và entrypoint --queue=media (ffmpeg)
    src/modules/<domain>/
        <domain>.controller.ts       # chỉ HTTP, dùng chung bởi apps/api
        <domain>.service.ts          # nghiệp vụ, export qua index.ts cho module khác gọi bằng DI
        <domain>.repository.ts       # truy cập dữ liệu
        dto/                         # zod schema + type suy ra
        events/                      # emit (EventEmitter2) + @OnEvent listener + outbox writer (nếu có effect ra ngoài)
        index.ts                     # barrel export — chỗ duy nhất module khác được import
frontend/src/
    app/…                           # CHỈ route: page/layout/loading/error, metadata, fetch server cơ bản
                                     # rồi truyền xuống component của feature — không chứa UI/logic chính
    components/ui/                  # shadcn nguyên bản, không sửa tay
    components/common/              # component dùng chung của dự án (không thuộc riêng feature nào)
    features/<domain>/              # UI chính của từng tính năng: components/ + index.ts (public API)
    hooks/                          # MỌI custom hook `use*` (trừ store zustand)
    stores/                         # store zustand, mỗi store một file `<name>.store.ts`
    schemas/                        # zod schema cho react-hook-form / validate phía client (+ type z.infer)
    services/                       # gọi API/BE, Server Action
    utils/                          # hàm tiện ích thuần, không phụ thuộc React (`cn`, `isLocale`…)
    constants/                      # hằng số (route, key cookie/localStorage, bảng màu theme…)
    types/                          # type/interface không suy ra từ zod
    i18n/request.ts                 # cấu hình next-intl (đường dẫn cố định trong next.config.ts)
```

Quy tắc phụ thuộc: `app/*` dùng `features/*`; `features/*` dùng `components/*`, `hooks`, `stores`, `schemas`,
`services`, `utils`, `constants`, `types`; chiều ngược lại **cấm**. Hai feature không import chéo nhau — cần ghép thì
ghép ở `app/` (page render cả hai), cần dùng chung thì nâng lên `components/common`.

`hooks/`, `stores/`, `schemas/`, `services/`, `utils/`, `constants/`, `types/` — mỗi thư mục có **duy nhất một**
`index.ts` làm barrel export; nơi khác trong repo chỉ import qua gốc thư mục (`@/hooks`, `@/stores`…), **không** import
thẳng file con (`@/hooks/use-foo`) — cùng nguyên tắc barrel đã áp dụng cho backend ở §6.1. Feature import qua
`@/features/<domain>`. Luật `no-restricted-imports` trong `frontend/eslint.config.mjs` chặn import sâu (trừ
`components/ui` do shadcn sinh; `import()` động cho `next/dynamic` không bị kiểm). Không khai báo hook, store, schema,
hằng số trong file component hay trong `features/` — đưa về đúng thư mục ở trên.

```tsx
// ❌ BAD — hook, hằng số, logic đặt ngay trong page của app/
export default function Page() {
    const [isPending, startTransition] = useTransition()
    const LOCALES = ['vi', 'en']
    …
}

// ✅ GOOD — app/ chỉ ghép route; UI ở features, hook ở @/hooks, hằng số ở @/constants
// app/page.tsx
import { HomePage } from '@/features/home'
export default function Page() {
    return <HomePage />
}
```

### 6.1 Module dùng chung (cross-cutting) trong backend

`platform` không phải domain nghiệp vụ — nó chứa hạ tầng dùng chung cho mọi domain khác (decorator, guard, checker,
interface xác thực/phân quyền…). Cấu trúc `<domain>.controller.ts` / `<domain>.service.ts` / `<domain>.repository.ts`
ở §6 dành cho domain nghiệp vụ; module cross-cutting nhóm theo **loại kỹ thuật**, mỗi loại một thư mục con, mỗi thư
mục con có `index.ts` riêng — theo đúng quy ước `auth/decorators`, `auth/guards`, `auth/interfaces`,
`auth/strategies` của TimmyHub gốc (`timmyhub-nestjs/src/auth`):

```
platform/auth/
    decorators/   # @Public, @Roles, @Permissions, @CurrentUser…
        index.ts
    guards/       # JwtAuthGuard, RolesGuard, PermissionsGuard…
        index.ts
    checkers/     # kiểm tra nhất quán lúc khởi động (OnApplicationBootstrap) — mới so với bản gốc, dùng chung quy ước
        index.ts
    interfaces/   # kiểu thuần (*.interface.ts, ví dụ AuthUser), không phụ thuộc NestJS runtime
        index.ts
    index.ts      # barrel gộp — chỗ duy nhất module khác được import
```

❌ **BAD** — gộp decorator, guard, checker, interface chung một thư mục phẳng, không phân biệt được loại nào dùng ở đâu:

```
platform/auth/
    current-user.decorator.ts
    jwt-auth.guard.ts
    permissions.decorator.ts
    permissions.guard.ts
    public.decorator.ts
    rbac-consistency.checker.ts
    roles.decorator.ts
    roles.guard.ts
    auth-user.interface.ts
```

✅ **GOOD** — cấu trúc như trên, import chéo giữa các thư mục con luôn qua `index.ts` của thư mục đó
(`../decorators/index`, `../interfaces/index`), không bao giờ trỏ thẳng vào file nội bộ
(`../decorators/roles.decorator`) — ESLint `no-restricted-imports` (`../*/*` bị cấm, trừ `../*/index`) chặn ngay ở
bước lint nếu làm sai. Đây là điểm khác bản gốc: bản gốc là app đơn lẻ nên `guards/`, `interfaces/` không cần
`index.ts` riêng; ở đây là package dùng chung trong monorepo (`@timmyhub/modules`) nên mọi thư mục con đều cần
barrel để tuân thủ rule boundary.

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
