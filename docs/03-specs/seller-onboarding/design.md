---
title: Thiết kế — seller-onboarding
status: draft
owner: Backend Lead
updated: 2026-09-19
related: [docs/03-specs/seller-onboarding/requirements.md, docs/02-domain/schemas/seller-service.prisma.md, docs/01-architecture/service-catalog.md, docs/01-architecture/event-catalog.md, docs/01-architecture/rbac-advanced.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md, docs/01-architecture/adr/ADR-0002-database-per-service.md]
---

# Thiết kế — seller-onboarding (`SEL`)

Module sở hữu: `seller` (`src/modules/seller/` trong `backend/apps/api`), dùng chung một database Postgres với các
module khác — theo [ADR-0015](../../01-architecture/adr/ADR-0015-modular-monolith.md). Tên `seller-service` chỉ còn
giữ lại làm tên file schema/tài liệu lịch sử (`seller-service.prisma.md`), không phải một đơn vị triển khai riêng.
Xem [requirements.md](requirements.md) cho danh sách `REQ-SEL-*` đầy đủ.

## 1. Mô hình dữ liệu

Trích từ [seller-service.prisma.md](../../02-domain/schemas/seller-service.prisma.md) — chỉ giữ các trường liên quan
tới spec này:

```prisma
enum ResourceStatus {
    PENDING
    APPROVED
    REJECTED
    DELETED
}

model SellerProfile {
    id                String         @id @default(uuid())
    userId            String         @unique   // tham chiếu logic sang identity-service
    shopName          String
    shopSlug          String         @unique
    shopLogo          String?
    shopBanner        String?
    description       String?
    warehouseAddressLine String?
    provinceCode      String?
    districtCode      String?
    wardCode          String?
    status            ResourceStatus @default(PENDING)
    isVerified        Boolean        @default(false)
    verifiedAt        DateTime?
    isSuspended       Boolean        @default(false)
    suspendedReason   String?
    rating            Float          @default(0)
    cancelRate        Float          @default(0)   // FEAT-SEL-008, event order.completed
    avgResponseHours  Float          @default(0)   // FEAT-SEL-008
    returnPolicyDays  Int            @default(7)    // FEAT-SEL-009
    prepTimeHours     Int            @default(24)   // FEAT-SEL-009
    createdAt         DateTime       @default(now())
    updatedAt         DateTime       @updatedAt
    application       SellerApplication?
    brandProfile       BrandProfile?
    followers          ShopFollow[]                 // FEAT-USR-010, không thuộc phạm vi spec này

    @@index([shopSlug])
    @@index([status])
}

model SellerApplication {
    id              String         @id @default(uuid())
    userId          String
    sellerProfileId String?        @unique
    shopName        String
    shopDescription String?
    idDocumentUrl   String
    taxCode         String?
    status          ResourceStatus @default(PENDING)
    reviewNote      String?
    reviewedById    String?
    reviewedAt      DateTime?
    createdAt       DateTime       @default(now())
    updatedAt       DateTime       @updatedAt
    sellerProfile   SellerProfile? @relation(fields: [sellerProfileId], references: [id])

    @@index([userId])
    @@index([status])
}

model BrandProfile {
    id              String        @id @default(uuid())
    sellerProfileId String        @unique
    userId          String
    brandName       String        @unique
    brandSlug       String        @unique
    brandLogo       String?
    description     String?
    isVerified      Boolean       @default(false)
    createdAt       DateTime      @default(now())
    updatedAt       DateTime      @updatedAt
    sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

    @@index([brandSlug])
}

/// FEAT-USR-010 — nằm trong cùng phần schema module seller nhưng thuộc domain user-profile, tham chiếu ở đây
/// chỉ vì SellerProfile.followers trỏ tới model này, không đặc tả lại yêu cầu ở spec này.
model ShopFollow {
    id              String        @id @default(uuid())
    userId          String
    sellerProfileId String
    createdAt       DateTime      @default(now())
    sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

    @@unique([userId, sellerProfileId])
    @@index([sellerProfileId])
}

model OutboxEvent {
    id            String    @id @default(uuid())
    aggregateType String
    aggregateId   String
    eventType     String
    payload       Json
    createdAt     DateTime  @default(now())
    publishedAt   DateTime?

    @@index([publishedAt])
    @@map("outbox_events")
}

model ProcessedEvent {
    eventId      String   @id
    consumerName String
    processedAt  DateTime @default(now())

    @@map("processed_events")
}
```

Quan hệ 1-1 `SellerApplication.sellerProfileId → SellerProfile.id` chỉ được điền **khi đơn được duyệt** — đơn
`PENDING`/`REJECTED` không có `sellerProfileId`. Một user có thể có nhiều `SellerApplication` theo thời gian (lịch
sử nộp lại — `REQ-SEL-004`) nhưng tối đa **một** `SellerProfile` (`userId @unique`).

## 2. API

Mọi endpoint đi qua module `platform` (entrypoint HTTP/WS trong `backend/apps/api`, thay cho `api-gateway` cũ),
xác thực JWT + `@Roles` + `@Permissions` + `whereForScope` (bốn lớp, xem
[rbac-advanced.md](../../01-architecture/rbac-advanced.md)). Quy ước tên permission `module:resource:action[:scope]`.
Nhóm `application` giữ số ít để khớp với ví dụ đã chốt ở `rbac-advanced.md` (`seller:application:approve`); nhóm
`shop`/`brand` dùng số nhiều theo quy ước chung.

| Endpoint | Method | Permission | Phạm vi | Ref |
|---|---|---|---|---|
| `/seller/applications` | POST | `seller:application:create` | own (user tự nộp cho chính mình) | `REQ-SEL-001`, `REQ-SEL-002`, `REQ-SEL-003` |
| `/seller/applications/me` | GET | `seller:application:read` | own | `REQ-SEL-004` |
| `/admin/seller/applications` | GET | `seller:application:read:any` | all, lọc theo `status` | `REQ-SEL-006`, `REQ-SEL-007` |
| `/admin/seller/applications/:id/approve` | POST | `seller:application:approve` | all | `REQ-SEL-006`, `REQ-SEL-008` |
| `/admin/seller/applications/:id/reject` | POST | `seller:application:reject` | all | `REQ-SEL-007`, `REQ-SEL-008` |
| `/seller/shop/me` | GET | `seller:shops:read` | own | `REQ-SEL-020` |
| `/seller/shop/me` | PATCH | `seller:shops:update` | own | `REQ-SEL-009`, `REQ-SEL-010`, `REQ-SEL-021`, `REQ-SEL-022` |
| `/shops/:slug` | GET | — (public, guest) | `status = APPROVED AND isSuspended = false` lọc trong query | `REQ-SEL-011`, `REQ-SEL-012` |
| `/admin/seller/shops/:id/verify` | POST | `seller:shops:verify` | all | `REQ-SEL-015` |
| `/admin/seller/shops/:id/suspend` | POST | `seller:shops:suspend` | all | `REQ-SEL-016` |
| `/admin/seller/shops/:id/restore` | POST | `seller:shops:restore` | all | `REQ-SEL-017` |
| `/seller/brand` | POST | `seller:brands:create` | own | `REQ-SEL-013`, `REQ-SEL-014` |
| `/seller/brand` | PATCH | `seller:brands:update` | own | `REQ-SEL-013`, `REQ-SEL-014` |

Thao tác tạo đơn (`POST /seller/applications`) và duyệt/từ chối nhận `Idempotency-Key` (luật cứng #5). Danh sách
đơn cho admin (`GET /admin/seller/applications`) **luôn** đi qua `whereForScope(scope)` — không `.filter()` sau khi
lấy về (luật cứng #7).

## 3. Sự kiện

Chỉ dùng tên đã có ở [event-catalog.md](../../01-architecture/event-catalog.md) mục `seller`.

### Phát (producer)

| Event | Khi nào | Payload chính | Consumer |
|---|---|---|---|
| `seller.application.submitted` | Sau `INSERT SellerApplication` (nộp mới hoặc nộp lại) | `applicationId`, `userId`, `shopName` | NTF, AUD |
| `seller.application.approved` | Sau khi `SellerApplication → APPROVED` và tạo `SellerProfile` trong cùng transaction | `applicationId`, `sellerProfileId`, `userId`, `shopSlug` | IDN (gán role `SELLER`), NTF, SRC, ANA, AUD |
| `seller.application.rejected` | Sau `SellerApplication → REJECTED` | `applicationId`, `userId`, `reviewNote` | NTF, AUD |
| `seller.shop.updated` | Sau `PATCH` hồ sơ shop, khôi phục shop tạm ngưng | `sellerProfileId`, `shopSlug`, các trường đổi | CAT, SRC, ORD *(read model)* |
| `seller.shop.suspended` | Sau tạm ngưng shop | `sellerProfileId`, `suspendedReason` | CAT, CNT, SRC, NTF, AUD |

Theo [ADR-0015](../../01-architecture/adr/ADR-0015-modular-monolith.md) và
[communication-patterns.md §3](../../01-architecture/communication-patterns.md#3-outbox--chỉ-cho-hệ-quả-bất-đồng-bộ-ra-ngoài-process),
cách phát tách theo đích đến:

- Listener nằm **trong cùng process** (`IDN` gán role, `CAT`/`SRC`/`ANA` dựng read model) nhận sự kiện qua
  `EventEmitter2` (`@OnEvent('seller.application.approved')`, …) — gọi ngay sau khi transaction Prisma commit, không
  cần bảng outbox vì không có rủi ro "publish rồi crash trước khi gửi" của broker riêng.
- Hệ quả phải chắc chắn xảy ra dù process crash và đi **ra ngoài** process (`NTF` gửi email, `AUD` ghi audit log bất
  biến) vẫn ghi qua `OutboxEvent` trong cùng transaction Prisma với thay đổi nghiệp vụ; một BullMQ worker
  (`outbox-dispatch`, không phải RabbitMQ relay) quét bảng mỗi 500 ms và gửi đi, đánh dấu `publishedAt` sau khi
  gửi thành công.

Không có đường phát event nào bỏ qua hai cơ chế trên.

### Nghe (consumer)

| Event | Xử lý | Ref |
|---|---|---|
| `order.completed` | `UPDATE SellerProfile SET cancelRate = …, avgResponseHours = … WHERE id = :sellerProfileId` nguyên tử | `REQ-SEL-018` |
| `review.created` | `UPDATE SellerProfile SET rating = …` nguyên tử | `REQ-SEL-019` |

Cả hai được nghe qua `@OnEvent` trong cùng process (module `order`/`review` emit, module `seller` lắng nghe) —
không còn nguy cơ "broker gửi lại" như bản RabbitMQ cũ. Vẫn giữ kiểm tra `ProcessedEvent(eventId)` trước khi xử lý
như một lớp chặn phòng hờ (event bị phát lại do retry logic nội bộ của module phát, hoặc do chạy lại thủ công/backfill),
theo tinh thần luật cứng #3.

## 4. Sequence diagram — nộp đơn → duyệt → tạo shop

```mermaid
sequenceDiagram
    actor U as User
    participant PLT as platform (module, cùng process)
    participant SEL as SellerService (module seller)
    participant DB as Postgres (database dùng chung)
    participant OB as BullMQ worker (outbox-dispatch)
    actor A as Admin
    participant IDN as IdentityService (module identity, @OnEvent)

    U->>PLT: POST /seller/applications (Idempotency-Key)
    PLT->>SEL: gọi trực tiếp (DI) createApplication()
    SEL->>DB: Transaction: INSERT SellerApplication (PENDING) + INSERT OutboxEvent(submitted)
    SEL-->>PLT: 201 applicationId
    OB->>DB: Poll outbox_events (status = PENDING)
    OB->>OB: Gửi email xác nhận đã nộp đơn (NTF), ghi audit log (AUD)

    A->>PLT: POST /admin/seller/applications/:id/approve
    PLT->>SEL: Kiểm quyền seller:application:approve, gọi trực tiếp (DI) approve()
    SEL->>DB: Transaction: UPDATE application WHERE status='PENDING' SET APPROVED<br/>+ INSERT SellerProfile(APPROVED)<br/>+ INSERT OutboxEvent(approved)
    SEL-->>PLT: 200 sellerProfileId
    SEL->>IDN: emit EventEmitter2('seller.application.approved') sau khi commit
    IDN->>IDN: (phòng hờ) kiểm ProcessedEvent(eventId) rồi gán role SELLER cho userId
    OB->>OB: Gửi email chào mừng seller (NTF), ghi audit log (AUD)
```

## 5. Trường hợp biên

### 5.1 Nộp lại đơn sau khi bị từ chối

Không sửa đè `SellerApplication` bị `REJECTED` — luôn `INSERT` bản ghi mới, giữ bản cũ làm lịch sử tra cứu
(`reviewNote` cũ vẫn còn để user xem lý do lần trước). Ràng buộc chặn spam: `REQ-SEL-005` (24 giờ từ
`reviewedAt`). Truy vấn "đơn đang chờ của user" luôn lấy bản ghi mới nhất theo `createdAt` với `status = PENDING`,
không giả định chỉ có một bản ghi cho `userId`.

### 5.2 Đổi tên shop trùng slug

```mermaid
sequenceDiagram
    actor S as Seller
    participant SEL as SellerService (module seller)
    participant DB as Postgres (database dùng chung)

    S->>SEL: PATCH /seller/shop/me { shopName: "Cửa Hàng Việt" }
    SEL->>SEL: candidateSlug = slugify("Cửa Hàng Việt") = "cua-hang-viet"
    SEL->>DB: UPDATE SellerProfile SET shopSlug = candidateSlug WHERE id = :id
    DB-->>SEL: unique constraint violation (P2002 trên shopSlug)
    SEL->>SEL: candidateSlug = "cua-hang-viet-2"
    SEL->>DB: UPDATE … SET shopSlug = candidateSlug WHERE id = :id
    DB-->>SEL: OK
    SEL-->>S: 200 { shopSlug: "cua-hang-viet-2" }
```

Vòng lặp thử hậu tố (`-2`, `-3`, …) dựa vào **bắt lỗi vi phạm ràng buộc `@unique` của DB**, không phải
`SELECT … rồi kiểm tra rồi UPDATE` — tránh race giữa hai request đổi tên cùng lúc (đọc-rồi-ghi sẽ cho cả hai cùng
thấy slug "trống" rồi cùng ghi, một trong hai lỗi 500 ở tầng DB thay vì tự khắc phục).

## 6. Điểm tranh chấp đồng thời

| Điểm tranh chấp | Cách xử lý |
|---|---|
| Hai admin duyệt cùng một đơn gần như đồng thời | `UPDATE SellerApplication SET status='APPROVED' WHERE id=:id AND status='PENDING'` — request thứ hai nhận 0 dòng bị ảnh hưởng → map sang `409`, không tạo `SellerProfile` thứ hai |
| Hai request đổi `shopName` cùng lúc dẫn tới cùng `shopSlug` | Ràng buộc `@unique(shopSlug)` ở DB + retry với hậu tố, xem §5.2 |
| `userId` cố nộp hai đơn cùng lúc | Ràng buộc nghiệp vụ kiểm `PENDING`/`APPROVED` hiện có trong cùng transaction tạo đơn (`SELECT … FOR UPDATE` theo `userId` hoặc unique index có điều kiện qua ứng dụng) trước khi `INSERT` |

## 7. Ảnh hưởng tới module khác

Dùng chung một database (`ADR-0015`), nhưng ranh giới vẫn giữ ở tầng code, ép bằng ESLint boundary rule — không
module nào được import thẳng repository/Prisma model của module `seller`, chỉ gọi qua `SellerService` đã export.

- Module `identity`: nghe `seller.application.approved` qua `EventEmitter2` để gán role `SELLER` — không import
  thẳng repository của module `seller`.
- Module `catalog`: nghe `seller.shop.suspended`/`seller.shop.updated` để ẩn/hiện sản phẩm của shop — không tự viết
  Prisma query chéo sang bảng của module `seller`.
- Module `search`, `analytics`, `notification`: dựng read model riêng từ các event `seller.*`, không JOIN qua ranh
  giới module (luật cứng #2, xem ADR-0015 §"Ranh giới module").
- Module `order` dùng `seller.shop.updated` như read model không chuẩn hoá để hiển thị tên shop trên đơn hàng mà
  không cần gọi trực tiếp `SellerService` mỗi lần render.

## 8. ❌ BAD / ✅ GOOD

**Kiểm tra `shopSlug` trùng trước khi ghi (đọc-rồi-ghi) thay vì dựa vào ràng buộc DB:**

❌ BAD:

```ts
const existing = await prisma.sellerProfile.findUnique({ where: { shopSlug: candidateSlug } })
if (existing) candidateSlug = `${candidateSlug}-2`
await prisma.sellerProfile.update({ where: { id }, data: { shopSlug: candidateSlug } })
// Giữa lúc findUnique và update, request khác có thể đã chiếm candidateSlug → vẫn dính lỗi @unique
// hoặc tệ hơn, nếu @unique không có, tạo ra hai shop trùng slug thật sự.
```

✅ GOOD:

```ts
async function updateShopWithUniqueSlug(id: string, candidateSlug: string, attempt = 1): Promise<SellerProfile> {
    try {
        return await prisma.sellerProfile.update({ where: { id }, data: { shopSlug: candidateSlug } })
    } catch (e) {
        if (isUniqueConstraintError(e, 'shopSlug') && attempt <= 5) {
            return updateShopWithUniqueSlug(id, `${baseSlug}-${attempt + 1}`, attempt + 1)
        }
        throw e
    }
}
```

**Duyệt đơn: phát event trước khi commit transaction DB:**

❌ BAD:

```ts
await eventBus.publish('seller.application.approved', payload) // publish trước
await prisma.$transaction([
    prisma.sellerApplication.update({ where: { id }, data: { status: 'APPROVED' } }),
    prisma.sellerProfile.create({ data: sellerProfileData }),
])
// Nếu transaction rollback sau khi publish thành công, identity-service đã gán role SELLER
// cho một user chưa hề có SellerProfile — dữ liệu hai service lệch nhau vĩnh viễn.
```

✅ GOOD:

```ts
await prisma.$transaction([
    prisma.sellerApplication.update({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED' } }),
    prisma.sellerProfile.create({ data: sellerProfileData }),
    prisma.outboxEvent.create({ data: { eventType: 'seller.application.approved', payload, aggregateId: sellerProfileId } }),
])
// Poller riêng đọc outbox_events sau khi transaction đã commit thành công, publish rồi mới đánh dấu publishedAt.
```
