---
title: "Báo cáo rà soát code toàn dự án timmyhub"
status: "review"
owner: "code-review"
updated: "2026-10-07"
related:
    - CLAUDE.md
    - docs/06-quality/coding-standards.md
    - docs/06-quality/project-review-2026-09-29.md
---

# Báo cáo rà soát code toàn dự án timmyhub

> Rà soát FE + BE + shared + Prisma schema theo 25 luật cứng trong `CLAUDE.md` và `docs/06-quality/coding-standards.md`.
> Trạng thái: **chưa commit** — đây chỉ là báo cáo, không sửa code.

Tổng quan nền tảng dự án rất tốt: transactional outbox đúng chuẩn, RBAC 4 lớp fail-closed, Zod là nguồn validation duy nhất, const object thay enum TS, TypeScript strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`, ESLint cứng `no-explicit-any` + `no-floating-promises`. Lỗ hổng tập trung ở module **catalog** (vi phạm luật tiền tệ + phân trang sai) và một số component FE legacy (`create-product-modal.tsx`, `category-form.tsx`, `home-page.tsx`).

## Thống kê tổng quan

| Khu vực | NGHIÊM TRỌNG | CAO | TRUNG BÌNH | THẤP | Tổng |
|---|---:|---:|---:|---:|---:|
| Backend — catalog | 2 | 4 | 1 | 2 | 9 |
| Backend — media | 0 | 1 | 2 | 3 | 6 |
| Backend — seller | 1 | 0 | 1 | 1 | 3 |
| Backend — identity/platform | 0 | 0 | 0 | 2 | 2 |
| Backend — Prisma schema/seed | 1 | 1 | 5 | 3 | 10 |
| Frontend — app routes | 0 | 0 | 1 | 1 | 2 |
| Frontend — components | 0 | 0 | 1 | 3 | 4 |
| Frontend — features | 1 | 8 | 8 | 3 | 20 |
| Frontend — hooks/stores/services | 0 | 0 | 3 | 1 | 4 |
| shared — contracts | 2 | 4 | 5 | 5 | 16 |
| shared — common | 0 | 0 | 0 | 1 | 1 |
| **Tổng** | **7** | **18** | **27** | **24** | **77** |

Mức độ ưu tiên fix:

1. **Cấp 1 — chặn merge**: V1-prisma (bí mật DB), V1-catalog (phân trang lệch), V6-fe (form không tuân Float\*), C1/C2-contracts (tiền dạng `number`).
2. **Cấp 2 — fix ngay sau merge**: read-then-write catalog, cross-write `user.roles` seller, `as never` media, type cast FE, hardcoded i18n.
3. **Cấp 3 — lô kỹ thuật**: CHECK constraint, transaction helper, refactor schema cũ align schema mới.

---

## 1. Backend

### 1.1 Module catalog

#### B-CAT-1 — Phân trang `findPublicProducts` lệch do `.filter()` sau query (NGHIÊM TRỌNG)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts:414-416`
- Luật: #7 (lọc phạm vi **trong câu truy vấn**, không `.filter()` sau khi lấy về)
- Mô tả: `findPublicProducts` fetch products rồi `items.filter((p) => shopMap.has(p.shopId))` để loại shop suspended. `totalItems` lại đếm trên query gốc → **số trang sai**, client hiển thị trang rỗng hoặc thiếu item.
- Fix: Đưa `shopId: { in: nonSuspendedShopIds }` vào `where`; đếm `totalItems` trên cùng `where`.

#### B-CAT-2 — Tiền truyền API dạng `number` thay chuỗi (NGHIÊM TRỌNG)

- Files:
  - `backend/libs/modules/src/catalog/catalog.mapper.ts:113,114,141,142,174,175` — `Number(variant.price)`, `Number(product.minPrice)`, `Number(product.maxPrice)`.
  - `shared/contracts/src/product.schema.ts:30-31,127,161-162,192-193` — `price: z.number().int().positive()`, `ProductVariantDetail.price: number`, `ProductDetail.minPrice/maxPrice: number`.
- Luật: #1 (tiền truyền qua API dạng **chuỗi** + `currency`, tính bằng `Prisma.Decimal`)
- Mô tả: `Number(Decimal)` ép float 64-bit, có thể mất precision với số lớn. `MoneySchema` đã đúng (`amount: z.string().regex(/^\d+\.\d{2}$/)`) nhưng product schema không dùng.
- Fix:
  - `product.schema.ts`: `price: MoneySchema`, `compareAtPrice: MoneySchema.optional().nullable()`, các interface trả về `price: string`, `minPrice: string | null`.
  - `catalog.mapper.ts`: dùng `.toString()` hoặc `.toFixed(2)` thay `Number()`.

#### B-CAT-3 — Query chéo database `sellerProfile` (CAO)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts:206-208,232-234,265-267,312-314,360-363,408-411,574-576,637-639,691-693,740-742,818-820` (11 chỗ) + `catalog.service.ts:32` inject `SellerRepository`.
- Luật: #2 (service chỉ đụng database của chính nó)
- Mô tả: `CatalogRepository` query thẳng `prisma.sellerProfile.findUnique/findMany`. Cùng Postgres nhưng `sellerProfile` thuộc module seller.
- Fix: Đưa shop info vào qua event projection (catalog cache `shopName`/`shopSlug` locally) hoặc gọi `SellerService.getProfileById()` thay vì query thẳng bảng.

#### B-CAT-4 — Read-then-write trên suspend/restore/update/delete product (CAO)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts:653-660 (suspend),703-710 (restore),757-764 (update),829-837 (delete)`
- Luật: #4 (cập nhật tranh chấp dùng `UPDATE … WHERE` nguyên tử)
- Mô tả: Các hàm `findUnique` kiểm tra tồn tại + status rồi `update` không điều kiện `WHERE status=...`. Giữa read và write, admin khác có thể đổi status → ghi đè. `reviewProduct:596` đã đúng (`updateMany` + `WHERE status: PENDING`).
- Fix: Đổi sang `updateMany` với `WHERE` điều kiện trạng thái, kiểm tra `count === 0` → trả null.

#### B-CAT-5 — Tính minPrice/maxPrice bằng `Math.min`/`Math.max` trên `number` (CAO)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts:447-449`
- Luật: #1 (tính bằng `Prisma.Decimal`, không `number`)
- Mô tả: Lấy `input.variants.map((v) => v.price)` (đã là `number` qua Zod) rồi `Math.min(...prices)` / `Math.max(...prices)`, bọc `new Prisma.Decimal(minPrice)`.
- Fix: Sau khi đổi Zod `price` sang chuỗi, tính min/max bằng `Prisma.Decimal.min()` / `Prisma.Decimal.max()`.

#### B-CAT-6 — `.filter()` lọc root categories sau query (TRUNG BÌNH)

- File: `backend/libs/modules/src/catalog/catalog.service.ts:51`
- Luật: #7
- Mô tả: `getCategories()` fetch toàn bộ active rồi `.filter((c) => !c.parentId)`.
- Fix: Query `findMany({ where: { isActive: true, parentId: null } })` hoặc dùng Prisma relation filter.

#### B-CAT-7 — Slug uniqueness dùng vòng lặp `while findUnique` trong transaction (THẤP)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts:441-444`
- Luật: hiệu năng (anti-pattern)
- Fix: Catch `P2002` trên `create` rồi retry, hoặc generate slug suffix ngẫu nhiên như seller repository.

#### B-CAT-8 — Tổ chức repository thiếu comment nhóm `// =====` nhất quán (THẤP)

- File: `backend/libs/modules/src/catalog/catalog.repository.ts`
- Luật: #20
- Fix: Phân rõ Queries vs Commands ở category section.

#### B-CAT-9 — Event nội bộ qua `EventEmitter2` thay outbox (TRUNG BÌNH)

- File: `backend/libs/modules/src/catalog/catalog.service.ts:38,58`
- Luật: #3 (event chỉ qua transactional outbox)
- Mô tả: `ping()` dùng `this.eventEmitter.emit()` trực tiếp. `createProduct:549` đã đúng (ghi outbox trong transaction).
- Fix: Nếu `PRODUCT_PINGED` chỉ là demo/ping, ghi rõ comment "event nội bộ không nghiệp vụ". Event nghiệp vụ phải chuyển sang outbox.

### 1.2 Module media

#### B-MED-1 — Type safety bypass `as never` / `as unknown as` (CAO)

- File: `backend/libs/modules/src/media/media.repository.ts:45,76,100,104,114,123`
- Luật: #14 (không `any`/type cast không lý do)
- Mô tả: `as unknown as MediaAsset`, `data: createData as never`, `Record<string, unknown>` cho `where`.
- Fix: Dùng `Prisma.MediaAssetWhereInput`, `Prisma.MediaAssetCreateInput` thay `Record<string, unknown>` và `as never`.

#### B-MED-2 — Controller route dùng chuỗi trần (THẤP)

- File: `backend/libs/modules/src/media/media.controller.ts:35,58,79,91,103,112,119`
- Luật: #23 (không chuỗi trần)
- Fix: Tạo `MEDIA_ROUTE` const object trong `media.constants.ts`.

#### B-MED-3 — Controller thiếu comment `// =====` (THẤP)

- File: `backend/libs/modules/src/media/media.controller.ts`
- Luật: #20

#### B-MED-4 — Anonymous user fallback `'anonymous-user'` (TRUNG BÌNH)

- File: `backend/libs/modules/src/media/media.controller.ts:66,85`
- Luật: bảo mật
- Mô tả: `const actorId = user?.id || 'anonymous-user'` — nếu JWT thiếu, asset tạo với owner chuỗi trần.
- Fix: Ném `ApiError('UNAUTHORIZED')` nếu `user` undefined.

#### B-MED-5 — Media upload thiếu `Idempotency-Key` (TRUNG BÌNH)

- File: `backend/libs/modules/src/media/media.controller.ts:58-75`
- Luật: #5
- Fix: Thêm `@Headers('Idempotency-Key')` + lưu key trong DB để dedup.

#### B-MED-6 — `media.constants.ts` gần rỗng (THẤP)

- File: `backend/libs/modules/src/media/media.constants.ts`
- Fix: Thêm `MEDIA_ROUTE` và `MEDIA_EVENT` const object.

### 1.3 Module seller

#### B-SEL-1 — Cross-write `user.roles` khi duyệt đơn seller (NGHIÊM TRỌNG)

- File: `backend/libs/modules/src/seller/seller.repository.ts:215-225` (`approveApplication` gọi `prisma.user.update`)
- Luật: #2 (service chỉ đụng database của chính nó)
- Mô tả: Seller approve ghi `prisma.user.update` để thêm role SELLER cho user — đây là **cross-write** vào bảng identity. Schema comment nói "tham chiếu logic, không @relation" nhưng code vẫn write thẳng.
- Fix: Seller approve chỉ tạo `SellerProfile` + `SellerApplication` + outbox event. Consumer (identity) nghe `seller.application.approved` rồi gán role SELLER.

#### B-SEL-2 — Query chéo `User` (read) (CAO — gộp với B-SEL-1)

- File: `backend/libs/modules/src/seller/seller.repository.ts:45-51,71-74,113-117`
- Luật: #2
- Fix: Đẩy qua RPC/event projection.

#### B-SEL-3 — Slug generation dùng `Math.random` 4 ký tự (TRUNG BÌNH)

- File: `backend/libs/modules/src/seller/seller.service.ts:180`
- Luật: #4 (tranh chấp)
- Fix: Dùng `crypto.randomUUID()` hoặc catch `P2002` rồi retry.

#### B-SEL-4 — Mapper thiếu comment `// =====` (THẤP)

- File: `backend/libs/modules/src/seller/seller.mapper.ts`
- Luật: #20

### 1.4 Module identity / platform

#### B-IDN-1 — `assertCanUpdateRoles` nhận `readonly string[]` thay `UserRole[]` (THẤP)

- File: `backend/libs/modules/src/identity/users/users.service.ts:205`
- Luật: #14 (type safety)
- Fix: Đổi thành `readonly UserRole[]`.

#### B-IDN-2 — Audit log writer không qua outbox (THẤP)

- File: `backend/libs/modules/src/identity/audit-log.writer.ts`
- Mô tả: Ghi trực tiếp trong transaction, không qua outbox. Có thể là quyết định có chủ đích (best-effort trong cùng transaction).
- Fix: Ghi chú rõ lý do nếu cố ý.

### 1.5 Prisma schema & seed

#### B-PRS-1 — File `.env` chứa connection string DB bị tồn tại trên disk (NGHIÊM TRỌNG)

- File: `backend/libs/prisma/.env:1`
- Luật: #17 (không commit bí mật)
- Mô tả: Connection string Supabase đầy đủ `postgresql://postgres...:vuongsytuan%40Aa12345678@...`. Dù `.gitignore` có `.env`, file vẫn tồn tại trên disk. Nếu từng bị git-tracked, bí mật đã rò rỉ vào lịch sử.
- Fix:
  1. Kiểm tra `git log --all --full-history -- backend/libs/prisma/.env`.
  2. Nếu từng track, xoá lịch sử bằng `git filter-repo` hoặc BFG.
  3. **Đổi mật khẩu DB Supabase ngay** (đã rò rỉ trong text).
  4. `DATABASE_URL` chỉ đến qua env CI/runtime.

#### B-PRS-2 — `PrismaService` không có transaction/outbox helper (CAO)

- File: `backend/libs/prisma/src/prisma.service.ts` (27 dòng)
- Luật: #3, #4
- Mô tả: Chỉ có `$connect`/`$disconnect`, không có wrapper `$transaction`, không có helper outbox-write-in-transaction hay idempotent-consumer. Service tự triển khai → dễ quên/lệch.
- Fix: Thêm `withTransaction(fn)` hoặc `withOutbox(fn, events)`; tài liệu hoá pattern chuẩn.

#### B-PRS-3 — `PrismaService` không có error/slow query logging (TRUNG BÌNH)

- File: `backend/libs/prisma/src/prisma.service.ts:19-26`
- Fix: Thêm `$on('query')` hoặc `$extends` để log slow query > 500ms.

#### B-PRS-4 — Seed truyền `number` cho trường `Decimal(14,2)` (TRUNG BÌNH)

- Files: `backend/libs/prisma/prisma/seeds/product.ts:237,238`; `voucher.ts:37,38,39,55,72,73,74,88,89,90,108,109,110`
- Luật: #1
- Fix: `price: String(seed.basePrice)`, `value: '10'`, `minOrderValue: '200000'`.

#### B-PRS-5 — Mật khẩu seed `Seed@12345` hardcode (TRUNG BÌNH)

- File: `backend/libs/prisma/prisma/seeds/user.ts:8-9`
- Luật: #17
- Fix: Đọc từ `process.env.SEED_PASSWORD` với mặc định chỉ dev local.

#### B-PRS-6 — `Order.paymentStatus` lưu `String` mặc dù có enum `PaymentStatus` (TRUNG BÌNH)

- File: `backend/libs/prisma/prisma/schema/order.prisma:68`
- Luật: #23
- Fix: Dùng enum `PaymentStatus` hoặc thêm CHECK constraint.

#### B-PRS-7 — Nhiều trạng thái nghiệp vụ dùng `String` không CHECK constraint (TRUNG BÌNH)

- Files: `content.prisma` (AdCampaign.status/objective/billingModel, AdEvent.eventType), `chat.prisma` (SupportTicket.priority/status, Dispute.status/resolutionType/reasonCode, DisputeEvent.toStatus), `order.prisma` (ReturnRequest.\*), `payment.prisma` (Withdrawal.status, Payment.method, PaymentAttempt.provider), `promotion.prisma` (Campaign.type/ownerType, CampaignProduct.approvalStatus), `search.prisma` (SearchIndexJob.status/operation), `notification.prisma` (Notification.type), `media.prisma` (MediaAsset.ownerType), `catalog.prisma` (InventoryLedger.changeType)
- Luật: #23
- Fix: Thêm CHECK constraint trong migration cho mỗi trường, hoặc dùng enum Prisma riêng tiền tố module.

#### B-PRS-8 — Không có multi-schema PostgreSQL vật lý per-service (TRUNG BÌNH)

- File: `backend/libs/prisma/prisma/schema/base.prisma:9-12`
- Luật: #2
- Mô tả: Ranh giới module chỉ bằng convention (comment + `String` trần không FK). Service vẫn có thể `SELECT * FROM wallets` dù không sở hữu payment.
- Fix: Nếu luật #2 yêu cầu DB-level isolation → chuyển sang PostgreSQL schema per-module + Prisma multi-schema. Nếu chỉ application-level → thêm guard interceptor kiểm tra service chỉ truy cập model thuộc module sở hữu.

#### B-PRS-9 — `Withdrawal` thiếu `idempotencyKey` (TRUNG BÌNH)

- File: `backend/libs/prisma/prisma/schema/payment.prisma:105-125`
- Luật: #5
- Fix: Thêm `idempotencyKey String @unique`. `Payment` nên có comment rõ `orderId @unique` đóng vai trò idempotency key.

#### B-PRS-10 — `Device.lastActiveAt` dùng `@updatedAt` sai ngữ nghĩa (TRUNG BÌNH)

- File: `backend/libs/prisma/prisma/schema/identity.prisma:75`
- Fix: Bỏ `@updatedAt`, cập nhật chủ động trong service khi thiết bị hoạt động.

#### B-PRS-11 — `WishlistItem` thiếu `variantId` trong unique constraint (THẤP)

- File: `backend/libs/prisma/prisma/schema/engagement.prisma:70`
- Fix: `@@unique([userId, productId, variantId])` hoặc thêm comment giải thích nếu cố ý 1 product/user.

#### B-PRS-12 — `console.log`/`console.error` trong seed (THẤP)

- Files: 9 file seed, 21 lần gọi
- Fix: Chấp nhận cho seed script (ESLint đã `no-console: off`). Tối thiểu `seed.ts:61` nên mask thông tin nhạy cảm trước khi `console.error`.

### 1.6 Backend — điểm tốt

1. **Transactional outbox đúng chuẩn**: `writeOutboxEvent(tx, ...)` bắt buộc nhận `tx`, không thể ghi outbox ngoài transaction.
2. **Atomic compare-and-swap** cho refresh token rotation: `updateMany WHERE token + isRevoked=false + replacedBy=null + expiresAt > now`.
3. **RBAC 4 lớp + fail-closed guard + consistency checker**: endpoint thiếu `@Permissions`/`@Public`/`@AuthenticatedOnly` → chặn khởi động.
4. **Type-safe permission decorator**: `PermissionName` union từ contracts, gõ sai là lỗi biên dịch.
5. **Const object + type suy ra** thay enum TS trong toàn contracts.
6. **Zod là nguồn validation duy nhất**: mọi `@Body`/`@Query` qua `ZodValidationPipe`.
7. **TypeScript strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`**.
8. **DUMMY_HASH timing safety**: login email không tồn tại vẫn chạy bcrypt compare.
9. **Failed login dùng `increment`** nguyên tử, không read-then-write.
10. **UsersRepository scope trong `where`**, `totalItems` đếm trên cùng `where`.
11. **404 cho tài nguyên ngoài phạm vi** thay 403 (không rò rỉ sự tồn tại).
12. **Chống tự nâng quyền**: `assertNotSelf`, `assertCanAssignRoles`, `CANNOT_ESCALATE_PRIVILEGE`.
13. **Soft delete + thu hồi refresh token** trong cùng transaction.
14. **Prisma Decimal(14,2)** cho toàn bộ trường tiền trong schema.
15. **Idempotency** qua `@unique` trên `idempotencyKey` (Order), `vnpayTxnRef` (Payment), `referenceKey` (WalletTransaction, InventoryLedger).
16. **OrderItem snapshot bất biến** ghi một lần lúc tạo đơn.
17. **WalletTransaction sổ cái kép** không UPDATE balance trực tiếp.
18. **InventoryLedger bất biến + idempotent**.
19. **CHECK constraint viết tay đúng chỗ** (inv_non_negative, variant_price_positive, variant_compare_price).
20. **Worker shutdown graceful**.

---

## 2. Frontend

### 2.1 App routes

#### F-APP-1 — Hardcoded title metadata không qua next-intl (7 route) (TRUNG BÌNH)

- Files: `src/app/(protected)/(admin)/seller-applications/page.tsx:17`, `seller/settings/page.tsx:6`, `seller/register/page.tsx:9`, `seller/portal/page.tsx:6`, `seller/orders/page.tsx:6`, `(admin)/account/page.tsx:7`
- Luật: #14 (chuỗi hiển thị không hardcode, đi qua next-intl)
- Fix: Chuyển sang `export async function generateMetadata()` + `getTranslations()` như `users/page.tsx`.

#### F-APP-2 — Cart page là placeholder thô (THẤP)

- File: `src/app/(protected)/(home)/cart/page.tsx`
- Luật: #14, #9
- Fix: Thêm EmptyState với i18n tối thiểu hoặc ghi nhận placeholder có chủ ý.

### 2.2 Components

#### F-COM-1 — `sidebar.tsx` import trực tiếp file con thay barrel (TRUNG BÌNH)

- File: `src/components/ui/sidebar.tsx:8` — `import { useIsMobile } from '@/hooks/use-mobile'`
- Luật: ESLint rule FE, #21
- Fix: `import { useIsMobile } from '@/hooks'`.

#### F-COM-2 — UI component import trực tiếp file con trong `components/ui/` (THẤP)

- Files: `sidebar.tsx:9-14`, `sheet.tsx:7`, `pagination.tsx:4`, `input-group.tsx:7-8`, `dialog.tsx:7`, `combobox.tsx:7-8`, `calendar.tsx:7`, `alert-dialog.tsx:7`
- Luật: #21 — NHƯNG luật cho phép ngoại lệ `components/ui` shadcn (ADR-0006).
- Fix: Có thể chấp nhận; nếu muốn nhất quán thì barrel hoá `components/ui`.

#### F-COM-3 — `column-management.tsx` dùng `<Label>` + `<Checkbox>` ghép (THẤP)

- File: `src/components/common/ag-grid-table/column-management.tsx:65-72`
- Luật: #18 — nhưng đây là toggle cột AG Grid, `Label`+`Checkbox` là pattern hợp lý cho checkbox toggle.
- Fix: Ghi nhận ngoại lệ có chủ ý.

### 2.3 Features

#### F-FEA-1 — `create-product-modal.tsx` dùng `<label>` + `<Input>`/`<Textarea>`/`<Select>` thay Float\* (NGHIÊM TRỌNG)

- File: `src/features/products/components/create-product-modal.tsx` (19 lần, vd dòng 502-507)
- Luật: #18 (ô nhập form luôn dùng Float\* field, không ghép `<Label>` riêng)
- Fix: Thay toàn bộ bằng `FloatInput`, `FloatTextarea`, `FloatCombobox`.

#### F-FEA-2 — `create-product-modal.tsx` dùng `zodResolver(...) as never` (CAO)

- File: `src/features/products/components/create-product-modal.tsx:69`
- Luật: #14 (không type cast không lý do)
- Fix: Khai đúng kiểu `Resolver<CreateProductInput>` hoặc bọc `as unknown as Resolver<...>` có chủ ý như `user-form.tsx`.

#### F-FEA-3 — `create-product-modal.tsx` dùng `isUploadingMedia`/`submitting` state thủ công (CAO)

- File: `src/features/products/components/create-product-modal.tsx:97,126`
- Luật: #13 (cấm `useEffect` + `useState(loading)` hoặc gọi API client thủ công)
- Fix: Dùng `uploadMediaMutation.isPending` và `createProductMutation.isPending` từ TanStack Query.

#### F-FEA-4 — `create-product-modal.tsx` hardcode ~30 chuỗi tiếng Việt không i18n (CAO)

- File: `src/features/products/components/create-product-modal.tsx` (dòng 191,204,213,227,252,256,260,263,267,271,291,316,335,406,422,455,497,541,579,582,587,646,663-665)
- Luật: #14
- Fix: Thêm vào message catalog `products` của next-intl.

#### F-FEA-5 — `category-form.tsx` dùng `<Input>`/`<Textarea>`/`<Select>` trực tiếp (CAO)

- File: `src/features/categories/components/category-form.tsx:21-28`
- Luật: #18
- Fix: Thay bằng `FloatInput`, `FloatTextarea`, `FloatCombobox`.

#### F-FEA-6 — `category-form.tsx` dùng `zodResolver(...) as never` và `handleSubmit(onSubmit) as never` (TRUNG BÌNH)

- File: `src/features/categories/components/category-form.tsx:65,119`
- Luật: #14
- Fix: Khai đúng kiểu Resolver.

#### F-FEA-7 — `category-detail-panel.tsx` dùng `isSubmitting`/`isDeleting` state thủ công (CAO)

- File: `src/features/categories/components/category-detail-panel.tsx:30-32`
- Luật: #13
- Fix: Dùng `useMutation` từ TanStack Query, đọc `mutation.isPending`.

#### F-FEA-8 — `category-detail-panel.tsx` và `category-table.tsx` hardcode `'Error'` (CAO)

- Files: `category-detail-panel.tsx:46,49,65,68`; `category-table.tsx:84`
- Luật: #14
- Fix: Dùng `t('error.generic')` hoặc catalog `api`.

#### F-FEA-9 — `admin-products-view.tsx` dùng `restoringId` state thủ công + hardcode toast (TRUNG BÌNH)

- File: `src/features/products/components/admin-products-view.tsx:70,103-116`
- Luật: #13, #14
- Fix: Dùng `useMutation` + i18n.

#### F-FEA-10 — `admin-products-view.tsx` và `seller-products-table.tsx` dùng `<Input>` trực tiếp (TRUNG BÌNH)

- File: `src/features/products/components/admin-products-view.tsx:24`
- Luật: #18, #24
- Fix: Dùng `FloatInput` cho ô tìm kiếm.

#### F-FEA-11 — `home-page.tsx` (83.78 KB) file quá lớn + mock data hardcode tiếng Việt (CAO)

- File: `src/features/home/components/home-page.tsx` (dòng 59-131 mock `HERO_SLIDES`/`FEATURES`/`CATEGORIES`, 134+ `INITIAL_VOUCHERS`, 207+ `PRODUCTS`, 274+ `REVIEWS`, 304+ `BLOG_POSTS`)
- Luật: #14 (hàng trăm chuỗi hardcode), #22 (dữ liệu giả đáng lẽ ở `mocks/`)
- Fix: (1) Tách mock data ra `mocks/home/`. (2) Chuyển chuỗi sang i18n. (3) Tách component thành HeroSection, CategorySection, FlashSaleSection...

#### F-FEA-12 — `home-page.tsx` gọi `getMyShopAction` trực tiếp trong `useQuery` thay hook chuyên biệt (TRUNG BÌNH)

- File: `src/features/home/components/home-page.tsx:601-609`
- Luật: #13, #24
- Fix: Tạo hook `useMyShop()` trong `features/seller/`.

#### F-FEA-13 — `home-page.tsx` dùng `useEffect` + `setInterval` cho countdown/carousel (THẤP)

- File: `src/features/home/components/home-page.tsx:618-624,628-634`
- Mô tả: Timer UI, không phải data fetching. `timeLeft` state hardcode mock.
- Fix: Có thể chấp nhận; tách mock `timeLeft` ra `mocks/`.

#### F-FEA-14 — `seller-registration-form.tsx` hardcode toast (TRUNG BÌNH)

- File: `src/features/seller/components/seller-registration-form.tsx:88,92`
- Luật: #14
- Fix: Chuyển toast sang i18n.

#### F-FEA-15 — `seller-orders-view.tsx` và `seller-settings-view.tsx` hardcode toast (TRUNG BÌNH)

- Files: `seller-orders-view.tsx:269,276`; `seller-settings-view.tsx:58`
- Luật: #14
- Fix: Chuyển sang i18n.

#### F-FEA-16 — `media-library.tsx` và `media-lightbox.tsx` hardcode toast (TRUNG BÌNH)

- Files: `media-library.tsx:74,76,88,91`; `media-lightbox.tsx:36,39`
- Luật: #14
- Fix: Chuyển toast sang i18n.

#### F-FEA-17 — `media-library.tsx` thiếu 7 trạng thái đầy đủ (TRUNG BÌNH)

- File: `src/features/media/components/media-library.tsx`
- Luật: #9
- Fix: Thêm `ErrorState` khi `isError`, `EmptyState` khi `assets.length === 0`.

#### F-FEA-18 — `home-footer.tsx` hardcode footer links tiếng Việt (TRUNG BÌNH)

- File: `src/components/layout/home-footer.tsx:24-39`
- Luật: #14
- Fix: Chuyển `label` sang i18n keys.

#### F-FEA-19 — `home-footer.tsx` dùng `<Input>` trực tiếp cho email subscription (TRUNG BÌNH)

- File: `src/components/layout/home-footer.tsx:19`
- Luật: #18, #24
- Fix: Dùng `FloatInput`.

#### F-FEA-20 — `home-footer.tsx` hardcode toast + `useState` validation thay Zod (TRUNG BÌNH)

- File: `src/components/layout/home-footer.tsx:79,82`
- Luật: #14, #15
- Fix: Dùng Zod schema cho email validation.

### 2.4 Hooks / stores / services

#### F-HOO-1 — `use-media.ts` thiếu `'use client'` (TRUNG BÌNH)

- File: `src/hooks/use-media.ts`
- Luật: #13
- Fix: Thêm `'use client'` ở đầu file.

#### F-HOO-2 — `use-media.ts` gọi `apiClient.delete()` trực tiếp trong mutationFn (THẤP)

- File: `src/hooks/use-media.ts:148`
- Fix: Có thể chấp nhận (dọn dẹp orphan asset); nên bọc trong `useMutation` riêng nếu muốn testable.

#### F-HOO-3 — `use-media.ts` dùng `axios` trực tiếp thay `apiClient` (TRUNG BÌNH)

- File: `src/hooks/use-media.ts:2,155`
- Mô tả: Presigned URL upload lên S3 khác base URL, không cần interceptor auth.
- Fix: Thêm bình luận giải thích hoặc tạo `s3Client` riêng.

### 2.5 Type cast toàn dự án FE

#### F-TYP-1 — `as unknown as` / `as never` nhiều nơi (TRUNG BÌNH)

- Files: `user-form.tsx:67`, `role-form.tsx:78`, `create-product-modal.tsx:69`, `category-form.tsx:65,119`, `upload-section.tsx:207-208`, `ag-grid-table.tsx:519`, `account/components/{security,profile,addresses}-tab.tsx`
- Luật: #14
- Fix: (1) Cho `zodResolver`, tạo wrapper type-safe. (2) Cho `tAccount`, tạo helper `hasTranslationKey(t, key)`. (3) Loại bỏ `as never`.

### 2.6 Frontend — điểm tốt

1. **Server Component mặc định đúng luật #13**: app routes đều Server Component, `'use client'` phạm vi nhỏ nhất.
2. **Data fetching đúng pattern**: Server Component fetch (users, audit, seller-applications) hoặc TanStack Query (`usePermissions`, `useUsers`, `useRbac`).
3. **Zod duy nhất + `@timmyhub/contracts`** đúng luật #15.
4. **Const object + type suy ra** đúng luật #23.
5. **AG Grid dynamic import** đúng luật #12.
6. **Zustand selector** đúng luật #25 (100% nơi dùng store).
7. **Float\* components đầy đủ** đúng luật #18 (6 field với label nổi, a11y, motion-reduce).
8. **Animation chỉ transform/opacity + prefers-reduced-motion** đúng luật #10.
9. **Radix primitive** đúng luật #11.
10. **Tổ chức component `// =====`** đúng luật #20 (233+ matches).
11. **Import barrel** đúng luật #21 (1 ngoại lệ `sidebar.tsx`).
12. **a11y tốt**: `role="alert"`, `aria-busy`, `aria-invalid`, `aria-describedby` xuyên suốt.
13. **Error handling phân tầng**: `permissionsUnavailable` tách biệt "không có quyền".
14. **Refresh token cross-tab lock** (`withAuthRefreshLock` Web Locks + `refreshInFlight` dedup).
15. **Skeleton đúng kích thước** responsive.
16. **`proxy.ts` đúng pattern** (`auth()` không tự đọc cookie, lọc open-redirect).
17. **`api-client.ts` xuất sắc** (interceptor Bearer từ RAM token, retry 401 cross-tab, không persist localStorage).

---

## 3. Shared packages

### 3.1 `@timmyhub/contracts`

#### S-CON-1 — `ProductStatusSchema` dùng `z.nativeEnum` với const object (NGHIÊM TRỌNG)

- File: `shared/contracts/src/product.schema.ts:13`
- Luật: #23, #15
- Mô tả: `z.nativeEnum(ProductStatus)` sinh cho TS `enum` thật; với const object thuần nên dùng `z.enum(ProductStatus)`.
- Fix: `export const ProductStatusSchema = z.enum(ProductStatus)` khớp `UserStatusSchema`.

#### S-CON-2 — Giá tiền trong `product.schema.ts` là `number` (NGHIÊM TRỌNG)

- File: `shared/contracts/src/product.schema.ts:30-31,127,161-162,192-193`
- Luật: #1, #15
- Fix: `price: MoneySchema`, `compareAtPrice: MoneySchema.optional().nullable()`, interface trả về `price: string`.

#### S-CON-3 — `seller.schema.ts` dùng chuỗi trần trong `z.enum` (CAO)

- File: `shared/contracts/src/seller.schema.ts:13,37,47`
- Luật: #23
- Fix: `z.enum(ResourceStatus)`; tách `SELLER_REVIEW_ACTION` const object.

#### S-CON-4 — `product.schema.ts:75` chuỗi trần `z.enum(['APPROVE','REJECT'])` (CAO)

- File: `shared/contracts/src/product.schema.ts:75`
- Luật: #23
- Fix: Tạo `PRODUCT_REVIEW_ACTION` const object (hoặc gộp `ReviewAction` dùng chung với seller).

#### S-CON-5 — `category.schema.ts` toàn message tiếng Việt cứng, không `apiMessageKey` (CAO)

- Files: `category.schema.ts:5-39`; tương tự `seller.schema.ts:19,20,22,24,38,71`; `product.schema.ts:17,19,21,30,31,32,33,41,42,43,46,47,50,56,64,65,66,82`; `media.schema.ts:63,66`
- Luật: #15
- Mô tả: Schema mới (auth/user/rbac/audit) dùng `apiMessageKey()` trả khoá rồi BE/FE dịch. Schema cũ (category/seller/product/media) lệch khuôn.
- Fix: Bổ sung khoá vào `messages.vi.ts`/`messages.en.ts` namespace `validation`, thay bằng `apiMessageKey('validation.xxx')`.

#### S-CON-6 — `media.schema.ts` dùng `z.refine` + ép kiểu thay `z.enum` (CAO)

- File: `shared/contracts/src/media.schema.ts:62-67`
- Luật: #15, #23
- Fix: `z.enum(ALLOWED_ALL_MIME_TYPES)` (đã có const tuple ở `media.constants.ts:51`).

#### S-CON-7 — `audit.schema.ts` dùng `unknown` cho `before`/`after` (TRUNG BÌNH)

- File: `shared/contracts/src/audit.schema.ts:71-72`
- Luật: #14
- Fix: Định nghĩa `JsonValue` schema (Zod v4 `z.json()`) hoặc ghi chú rõ lý do JSON tùy biến.

#### S-CON-8 — `rbac.schema.ts` dùng `z.string().min(1)` thay `PermissionName` (TRUNG BÌNH)

- File: `shared/contracts/src/rbac.schema.ts:27,32-37,43,48,72,77`
- Luật: #15, #23
- Fix: Export `PermissionNameSchema` từ `permissions.catalog.ts`, dùng `z.array(PermissionNameSchema)`.

#### S-CON-9 — `category.schema.ts`/`product.schema.ts` dùng `z.preprocess` thay idiom Zod (TRUNG BÌNH)

- Files: `category.schema.ts:50-54`; `product.schema.ts:91-95`
- Luật: #15
- Fix: Trích `BooleanQuerySchema` dùng chung (`z.union([z.literal('true'), z.literal('false'), z.boolean()]).transform()`).

#### S-CON-10 — Không nhất quán `z.iso.datetime()` giữa schema mới và cũ (TRUNG BÌNH)

- Files: `audit.schema.ts:42-43`, `user.schema.ts:80-81` dùng `z.iso.datetime()`; category/product/seller/media không dùng.
- Fix: Rà soát toàn bộ schema datetime dùng `z.iso.datetime()` thống nhất.

#### S-CON-11 — `permissions.catalog.ts:216` ép kiểu `as [PermissionName, ...]` (THẤP)

- File: `shared/contracts/src/permissions.catalog.ts:216`; tương tự `locale.ts:10`, `roles.ts:18`
- Luật: #14
- Fix: Helper `asNonEmpty<T>()` có runtime check, hoặc unit test asserting `length > 0`.

#### S-CON-12 — `common/index.ts` barrel không xuất constants/utils (THẤP)

- File: `shared/common/src/index.ts`
- Fix: `export * from './constants'`; `export * from './utils'`.

#### S-CON-13 — `product.schema.ts:90` `status: z.string().optional()` thay `ProductStatusSchema` (THẤP)

- File: `shared/contracts/src/product.schema.ts:90`
- Fix: `status: ProductStatusSchema.optional()`.

#### S-CON-14 — `media.constants.ts`/`media.schema.ts` không dùng `// =====` nhóm (THẤP)

- Luật: #20
- Fix: Thêm `// ===== Media Types =====`, `// ===== Allowed Extensions =====`.

#### S-CON-15 — `password-hashing.ts` an toàn (THẤP — không vi phạm)

- File: `shared/contracts/src/password-hashing.ts`
- Mô tả: Chỉ `BCRYPT_COST = 12` (tham số công khai). Đạt.
- Fix: Bổ sung comment "BCRYPT_COST là tham số công khai, không phải bí mật".

### 3.2 Shared — điểm tốt

1. `tsconfig.base.json` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
2. Không `any`, không `@ts-ignore`, không enum TS.
3. i18n nhất quán ở auth/user/rbac: `apiMessageKey()` + `satisfies Record<ApiErrorCode, string>`.
4. `ApiError` mang `messageKey` + `messageParams` thay câu đã dịch.
5. `permissions.catalog.ts` hàm `perm<const M, const R, const A>()` giữ literal type.
6. `ZodValidationPipe` generic tách trách nhiệm sạch.
7. `ApiExceptionFilter` chuẩn hoá mọi exception, dịch theo locale, `randomUUID()` requestId.
8. `money.schema.ts` đúng luật (chuỗi decimal + `currency: VND`).
9. Barrel `contracts/src/index.ts` xuất đủ 17 module.

---

## 4. Phương án optimize & fix bug

### 4.1 Cấp 1 — chặn merge (làm ngay)

| ID | Vấn đề | Phương án |
|---|---|---|
| B-PRS-1 | `.env` lộ mật khẩu DB | Kiểm tra git history → xoá lịch sử nếu từng track → **đổi mật khẩu Supabase ngay** → xoá file `.env` khỏi disk, chỉ dùng env CI/runtime |
| B-CAT-1 | Phân trang `findPublicProducts` lệch | Đưa `shopId: { in: nonSuspendedShopIds }` vào `where`; đếm `totalItems` trên cùng `where` |
| B-CAT-2 / S-CON-2 | Tiền truyền dạng `number` | Đổi `product.schema.ts` `price` sang `MoneySchema`; mapper dùng `.toString()`; interface trả về `string` |
| S-CON-1 | `z.nativeEnum` với const object | Đổi `z.enum(ProductStatus)` |
| F-FEA-1 | Form dùng `<label>+<Input>` thay Float\* | Thay toàn bộ `create-product-modal.tsx` bằng `FloatInput`/`FloatTextarea`/`FloatCombobox` |
| B-SEL-1 | Cross-write `user.roles` | Seller approve chỉ tạo profile + outbox event; identity consumer gán role |

### 4.2 Cấp 2 — fix ngay sau merge

| ID | Vấn đề | Phương án |
|---|---|---|
| B-CAT-4 | Read-then-write suspend/restore/update/delete | Đổi `updateMany` + `WHERE status=...`, check `count === 0` |
| B-CAT-3 / B-SEL-2 | Query chéo `sellerProfile`/`User` | Event projection (catalog cache shop info) hoặc RPC `SellerService.getProfileById()` |
| B-CAT-5 | minPrice/maxPrice bằng `Math.min`/`number` | `Prisma.Decimal.min()`/`.max()` sau khi price sang chuỗi |
| B-MED-1 | `as never`/`as unknown as` media | `Prisma.MediaAssetWhereInput`/`CreateInput` |
| B-MED-4 / B-MED-5 | Anonymous fallback + thiếu Idempotency-Key | Ném `UNAUTHORIZED` nếu `user` undefined; thêm `Idempotency-Key` header |
| B-PRS-2 | PrismaService thiếu transaction helper | Thêm `withTransaction(fn)` / `withOutbox(fn, events)` |
| F-FEA-2 / F-FEA-6 / F-TYP-1 | `as never` type cast | Wrapper type-safe cho `zodResolver`; helper `hasTranslationKey` |
| F-FEA-3 / F-FEA-7 / F-FEA-9 | State loading thủ công | Dùng `mutation.isPending` từ TanStack Query |
| F-FEA-4 / F-FEA-8 / F-FEA-14/15/16/18 | Hardcoded toast/chuỗi | Chuyển sang next-intl catalog |
| F-FEA-5 / F-FEA-10 / F-FEA-19 | `<Input>` trực tiếp | Dùng `FloatInput` |
| S-CON-3/4/6 | Chuỗi trần `z.enum` | `z.enum(constObject)` |
| S-CON-5 | Message cứng schema cũ | `apiMessageKey('validation.xxx')` |

### 4.3 Cấp 3 — lô kỹ thuật / optimize

| ID | Vấn đề | Phương án |
|---|---|---|
| B-PRS-6/7 | `String` không CHECK constraint | Thêm CHECK constraint migration hoặc enum Prisma tiền tố module |
| B-PRS-3 | PrismaService không log slow query | `$on('query')` log > 500ms |
| B-PRS-4/5 | Seed truyền `number`/hardcode password | `String(price)`; `process.env.SEED_PASSWORD` |
| B-PRS-8 | Không multi-schema vật lý | PostgreSQL schema per-module hoặc guard interceptor |
| B-PRS-9/10/11 | Withdrawal idempotency / `@updatedAt` ngữ nghĩa / Wishlist unique | Thêm `idempotencyKey @unique`; bỏ `@updatedAt`; `@@unique([userId, productId, variantId])` |
| B-CAT-6/7 | `.filter()` root categories / slug while-loop | Query `parentId: null`; catch `P2002` retry |
| B-MED-2/3/6 | Media route chuỗi trần / thiếu `// =====` / constants rỗng | `MEDIA_ROUTE`/`MEDIA_EVENT` const object |
| F-APP-1 | Hardcoded metadata title | `generateMetadata()` + `getTranslations()` |
| F-FEA-11 | `home-page.tsx` 83 KB + mock hardcode | Tách mock ra `mocks/home/`, tách component con, i18n |
| F-FEA-12/17 | Hook chuyên biệt / 7 trạng thái media | `useMyShop()`; thêm `ErrorState`/`EmptyState` |
| F-HOO-1/3 | `use-media.ts` thiếu `'use client'` / `axios` trực tiếp | Thêm directive; bình luận hoặc `s3Client` |
| S-CON-7/8/9/10 | `unknown` audit / `z.string()` rbac / `preprocess` / ISO datetime | `z.json()`; `PermissionNameSchema`; `BooleanQuerySchema`; `z.iso.datetime()` thống nhất |
| S-CON-11/12/13/14 | Ép kiểu tuple / barrel common / `z.string()` status / `// =====` | `asNonEmpty` helper; mở rộng barrel; `ProductStatusSchema.optional()`; thêm nhóm |

### 4.4 Optimise hiệu năng (gợi ý thêm)

- **Catalog `findPublicProducts`**: sau khi sửa `.filter()`, cân nhắc cursor-based pagination thay offset cho dataset lớn.
- **Catalog slug loop trong transaction**: rút ngắn transaction bằng `catch P2002` retry ngoài transaction.
- **Media presigned upload**: cân nhắc Streaming upload (S3 multipart) cho video lớn thay PUT đơn lần.
- **Home page**: tách `home-page.tsx` 83 KB thành các Server Component con, dữ liệu mock chuyển sang `mocks/` và render phía server để giảm bundle client.
- **AG Grid**: đã dynamic import đúng; cân nhắc `rowModelType: 'infinite'` cho dataset > 10k row.
- **Prisma**: thêm `$on('query')` slow query log + index review cho các query path `findPublicProducts` (shop status filter), `listApplications` (status + createdAt).
- **Worker**: triển khai consumer outbox thật (`apps/worker/src/main.ts` hiện là placeholder) — đọc `OutboxEvent` + ghi `ProcessedEvent` cho idempotency.

---

## 5. Kết luận

Dự án có **nền tảng kiến trúc và kỷ luật chất lượng rất cao** — outbox, RBAC fail-closed, Zod duy nhất, const object thay enum, TypeScript strict nghiêm ngặt, i18n-backend qua `apiMessageKey`. Điểm yếu tập trung ở:

1. **Module catalog** — vi phạm nặng luật tiền tệ + phân trang + read-then-write + query chéo.
2. **Component FE legacy** (`create-product-modal.tsx`, `category-form.tsx`, `home-page.tsx`) — chưa align Float\* + TanStack Query + i18n.
3. **Schema cũ trong contracts** (category/seller/product/media) — chưa align `MoneySchema` + `apiMessageKey` + `z.enum(constObject)`.
4. **Bí mật DB trong `.env`** — cần đổi mật khẩu và xoá lịch sử ngay.

Ưu tiên xử lý **Cấp 1** trước khi merge bất kỳ thay đổi nào vào catalog/seller/media. Sau đó theo **Cấp 2** rồi **Cấp 3**. Lô **Cấp 3** có thể chia nhiều PR nhỏ để review dễ dàng.

> Báo cáo này chưa commit. Sau khi chốt phương án, tạo các task `TASK-REVIEW-*` tương ứng và triển khai fix theo cấp ưu tiên.
