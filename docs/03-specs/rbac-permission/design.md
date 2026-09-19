---
title: Design — rbac-permission
status: draft
owner: Backend Lead
updated: 2026-09-19
related: [docs/03-specs/rbac-permission/requirements.md, docs/03-specs/rbac-permission/tasks.md, docs/01-architecture/rbac-advanced.md, docs/00-overview/roles-and-permissions.md, docs/01-architecture/service-catalog.md, docs/02-domain/schemas/identity-service.prisma.md, docs/01-architecture/event-catalog.md, docs/01-architecture/security.md, docs/01-architecture/adr/ADR-0015-modular-monolith.md]
---

# Design — `rbac-permission`

Module sở hữu: `identity` trong `backend/apps/api` (một database Postgres dùng chung, theo
[ADR-0015](../../01-architecture/adr/ADR-0015-modular-monolith.md)), thư mục `rbac/`, `casl/`
([service-catalog.md §1](../../01-architecture/service-catalog.md), đọc như bản đồ module). Bốn lớp kiểm quyền và cơ
chế cache/vô hiệu hoá đã được đặc tả đầy đủ ở [rbac-advanced.md](../../01-architecture/rbac-advanced.md) — tài liệu
này **không lặp lại**, chỉ trích và tham chiếu khi cần cho thiết kế cụ thể của domain `rbac-permission`.

---

## 1. Mô hình dữ liệu

Trích từ [identity-service.prisma.md](../../02-domain/schemas/identity-service.prisma.md) — các model dùng cho RBAC:

```prisma
model SystemRole {
    id          String           @id @default(cuid())
    name        String           @unique
    displayName String
    description String?
    isSystem    Boolean          @default(false)
    permissions RolePermission[]
    users       UserSystemRole[]
}

model UserSystemRole {
    userId String
    roleId String
    role   SystemRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
    user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@id([userId, roleId])
}

model Permission {
    id              String           @id @default(cuid())
    name            String           @unique   // "catalog:products:approve"
    displayName     String
    description     String?
    module          String                     // "catalog"
    resource        String                     // "products"
    action          String                     // "approve"
    rolePermissions RolePermission[]
    userPermissions UserPermission[]

    @@index([module, resource, action])
}

model RolePermission {
    id           String     @id @default(cuid())
    roleId       String
    permissionId String
    permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
    role         SystemRole @relation(fields: [roleId], references: [id], onDelete: Cascade)

    @@unique([roleId, permissionId])
}

model UserPermission {
    id           String     @id @default(cuid())
    userId       String
    permissionId String
    // true = cấp thêm ngoài role, false = khước từ dù role có quyền này (lớp 2b)
    isGranted    Boolean    @default(true)
    grantedAt    DateTime   @default(now())
    permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
    user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([userId, permissionId])
}
```

`User.roles: UserRole[]` (lớp 1) và `isSystem` trên `SystemRole`/permission lõi đã có sẵn trong schema hiện tại và
được dùng nguyên trạng — xem file trên.

> **Khoảng trống đã biết:** [rbac-advanced.md §5](../../01-architecture/rbac-advanced.md#5-trao-quyền-tạm-thời-uỷ-quyền-và-mạo-danh)
> mô tả cơ chế "permission tạm thời" với `UserPermission.expiresAt`, nhưng schema hiện tại **chưa có** cột này —
> không nằm trong `FEAT-RBAC-*` nào ở P0/P1 hiện hành nên **không** đưa vào scope của spec này. Khi domain nào cần
> permission có hạn (vd trực ca hỗ trợ), thêm migration `expiresAt DateTime?` vào `UserPermission` và một `REQ-RBAC-*`
> mới, không tự ý thêm ngầm ở đây.

---

## 2. Bảng permission seed (theo module · resource · action)

Nguồn sự thật là [roles-and-permissions.md §4](../../00-overview/roles-and-permissions.md#4-danh-mục-permission) —
đây chỉ là bảng kiểm tra chéo để `prisma/seed.ts` của `identity-service` đối chiếu, nhấn mạnh các permission mà bản cũ
**thiếu seed** (đánh dấu `⚠`) khiến endpoint tương ứng không ai gọi được (`FEAT-RBAC-006`, kế thừa*):

| Module | Resource | Action | Mặc định cho | Trạng thái bản cũ |
|---|---|---|---|---|
| `identity` | `users` | `create` | ADMIN | ⚠ thiếu |
| `identity` | `users` | `list` / `read` / `update` / `delete` / `lock` / `assign-role` | ADMIN / SUPER_ADMIN | có |
| `identity` | `devices` | `list:any` / `revoke:any` | ADMIN | có |
| `identity` | `sessions` | `stats` | ADMIN | có |
| `rbac` | `roles` | `list` / `read` / `create` / `update` / `delete` | ADMIN / SUPER_ADMIN | có |
| `rbac` | `permissions` | `list` / `read` | ADMIN | có |
| `rbac` | `permissions` | `create` / `update` / `delete` | SUPER_ADMIN | ⚠ thiếu |
| `rbac` | `role-permissions` | `assign` | SUPER_ADMIN | có |
| `rbac` | `user-permissions` | `assign` | SUPER_ADMIN | có |
| `catalog` | `products` | `approve` / `reject` | ADMIN | ⚠ thiếu |
| `catalog` | `products` | `create` / `update` / `delete` / `update:any` / `delete:any` / `list:any` / `import` / `export` | SELLER / ADMIN | có |
| `catalog` | `categories` | `create` / `update` / `delete` | ADMIN | có |
| `catalog` | `inventory` | `read` / `adjust` / `read:any` | SELLER / ADMIN | có |

Danh mục đầy đủ 10 module (`identity`, `rbac`, `seller`, `catalog`, `cart`/`orders`, `payment`/`wallet`, `promotion`,
`content`/`ads`, `engagement`/`chat`/`notification`, `search`/`media`/`analytics`/`audit`/`masterdata`) nằm ở
roles-and-permissions.md §4.1–§4.10; `identity-service` seed **toàn bộ**, kể cả permission của service khác, vì bảng
`Permission` là danh mục dùng chung — mỗi service chỉ tự seed các `RolePermission` liên quan tới permission của chính
module mình khi cần, còn danh mục gốc tập trung ở đây để tránh trùng tên qua nhiều service.

**Đối chiếu bắt buộc (REQ-RBAC-014):** script `check-permissions-consistency` chạy lúc bootstrap của app
`backend/apps/api`, quét metadata `@Permissions(...)` trên toàn bộ module — không riêng module `identity` — vì bảng
`Permission` chỉ có ở database dùng chung. Mỗi module không phải `identity` lấy snapshot permission qua gọi trực tiếp
`RbacService.listPermissions()` qua DI lúc build/CI (không gọi runtime mỗi lần boot) và so với `PERMISSIONS` const
của chính nó.

---

## 3. API

| Endpoint | Permission | Phạm vi | Req |
|---|---|---|---|
| `GET /v1/rbac/roles` | `rbac:roles:list` | `all` | REQ-RBAC-009 |
| `POST /v1/rbac/roles` | `rbac:roles:create` | `all` | REQ-RBAC-009 |
| `PATCH /v1/rbac/roles/:id` | `rbac:roles:update` | `all` (chặn `isSystem`) | REQ-RBAC-009 |
| `DELETE /v1/rbac/roles/:id` | `rbac:roles:delete` | `all` (chặn `isSystem`, chặn còn user gán) | REQ-RBAC-009 |
| `PUT /v1/rbac/roles/:id/permissions` | `rbac:role-permissions:assign` | `all` | REQ-RBAC-009 |
| `GET /v1/rbac/permissions` | `rbac:permissions:list` | `all` | REQ-RBAC-008 |
| `POST /v1/rbac/permissions` | `rbac:permissions:create` | `all` | REQ-RBAC-008 |
| `PATCH /v1/rbac/permissions/:id` | `rbac:permissions:update` | `all` | REQ-RBAC-008 |
| `DELETE /v1/rbac/permissions/:id` | `rbac:permissions:delete` | `all` | REQ-RBAC-008 |
| `POST /v1/users/:id/roles` | `identity:users:assign-role` | `all` | REQ-RBAC-010 |
| `DELETE /v1/users/:id/roles/:roleId` | `identity:users:assign-role` | `all` | REQ-RBAC-010 |
| `PUT /v1/rbac/users/:id/permissions` | `rbac:user-permissions:assign` | `all` | REQ-RBAC-003 |
| `GET /v1/rbac/users/:id/effective-permissions` | `identity:users:read` hoặc chính chủ | `own` \| `all` | REQ-RBAC-011 |

Gọi trực tiếp qua NestJS DI giữa module (không qua module `platform`, module khác import `RbacService` đã export qua
`index.ts`): `rbac.getEffectivePermissions(userId)`, `rbac.listPermissions()`, `rbac.assignRole(userId, roleName)`,
`rbac.checkPermission(userId, permission)` ([service-catalog.md §1](../../01-architecture/service-catalog.md)) — tên
method giữ nguyên, chỉ đổi khung giao tiếp so với bản RPC network cũ.

---

## 4. Event phát / nghe

| Hướng | Event | Payload chính | Trigger |
|---|---|---|---|
| Phát | `user.role-granted` | `{ userId, roleName, grantedBy }` | REQ-RBAC-010 |
| Phát | `user.role-revoked` | `{ userId, roleName, revokedBy }` | REQ-RBAC-010 |
| Phát | `rbac.permissions.changed` | `{ roleId?, permissionId?, affectedUserIds? }` | REQ-RBAC-009, REQ-RBAC-003 |
| Nghe | `seller.application.approved` | — | Gán `UserRole.SELLER` (đã có ở service-catalog, không thuộc `rbac-permission` mà thuộc `identity-auth`; nêu ở đây vì cùng chạm `UserSystemRole`) |

Tất cả phát qua `OutboxEvent` cùng transaction với thay đổi `RolePermission`/`UserSystemRole`/`UserPermission`
(CLAUDE.md luật #3). Consumer (gateway, `audit-service`, `seller-service`) idempotent qua `ProcessedEvent`.

---

## 5. CASL `mapSubject` — đúng cách, khác bản cũ ra sao

Bản cũ (lỗi, **không dùng lại**):

❌ **BAD** — nhánh mặc định nuốt subject lạ, mọi rule từ DB coi như khớp bừa:

```ts
function mapSubject(type: string, record: unknown) {
    switch (type) {
        case 'Product':
            return subject('Product', record as Product)
        default:
            // subject lạ vẫn được trả về như thể hợp lệ → CASL so sánh sai kiểu,
            // rule "can('update', 'Order', { sellerId: user.id })" không bao giờ khớp
            // vì subject thực tế nhận được không phải instance CASL mong đợi → rule luôn coi là không định nghĩa
            // → nhiều codepath âm thầm rơi về "không có rule cấm" = cho qua
            return record
    }
}
```

✅ **GOOD** — đăng ký tường minh mọi subject, subject lạ ném lỗi cấu hình (REQ-RBAC-006):

```ts
const SUBJECT_REGISTRY = {
    Product: (r: Product) => subject('Product', r),
    ProductVariant: (r: ProductVariant) => subject('ProductVariant', r),
    Order: (r: Order) => subject('Order', r),
    Post: (r: Post) => subject('Post', r),
    AdCampaign: (r: AdCampaign) => subject('AdCampaign', r),
    Review: (r: Review) => subject('Review', r),
    Address: (r: Address) => subject('Address', r),
    Wallet: (r: Wallet) => subject('Wallet', r),
    Conversation: (r: Conversation) => subject('Conversation', r),
} as const satisfies Record<string, (record: unknown) => Subject>

type RegisteredSubject = keyof typeof SUBJECT_REGISTRY

function mapSubject<T extends RegisteredSubject>(type: T, record: unknown) {
    const mapper = SUBJECT_REGISTRY[type]
    if (!mapper) {
        // subject lạ KHÔNG được coi là hợp lệ — ném lỗi cấu hình, chặn ngay ở dev/CI
        throw new UnregisteredCaslSubjectError(type)
    }
    return mapper(record)
}
```

Mỗi khoá trong `SUBJECT_REGISTRY` bắt buộc có ít nhất một test khẳng định (`can`) và một test phủ định (`cannot`) —
xem [rbac-advanced.md §8](../../01-architecture/rbac-advanced.md#8-kiểm-chứng-bằng-test). `satisfies Record<...>` khiến
TypeScript chặn quên đăng ký subject mới ngay lúc biên dịch nếu subject đó được dùng ở `@CheckPolicies` nhưng chưa có
trong registry (kiểm bằng generic ràng buộc `RegisteredSubject`, không dùng `string` trần).

---

## 6. Phạm vi dữ liệu — `whereForScope` thay vì lọc sau khi lấy về

Áp dụng nguyên tắc ở [rbac-advanced.md §3](../../01-architecture/rbac-advanced.md#3-phạm-vi-dữ-liệu-data-scope) và
CLAUDE.md luật #7: lọc phạm vi phải nằm **trong** câu truy vấn.

❌ **BAD** — lấy hết permission/role rồi lọc theo shop ở tầng ứng dụng, rò rỉ qua tổng số bản ghi và thời gian phản hồi:

```ts
async listUsersWithRole(roleId: string, requester: AuthUser) {
    const rows = await this.prisma.userSystemRole.findMany({ where: { roleId }, include: { user: true } })
    // ❌ lọc sau khi đã lấy toàn bộ user mang role, requester chỉ nên thấy user thuộc shop mình quản lý
    return rows.filter((r) => r.user.sellerProfileId === requester.sellerProfileId)
}
```

✅ **GOOD** — phạm vi đi vào `where` ngay từ đầu, resource ngoài phạm vi không lộ ra dù qua `count`/phân trang:

```ts
async listUsersWithRole(roleId: string, requester: AuthUser) {
    const scope = scopeFor(requester, 'identity:users:list')
    return this.prisma.userSystemRole.findMany({
        where: { roleId, user: whereForScope(scope) },   // { sellerProfileId: { in: [...] } } hoặc {} nếu scope 'all'
        include: { user: true },
        take: pagination.limit,
    })
}
```

Với endpoint đọc một bản ghi theo id (vd `GET /v1/rbac/users/:id/effective-permissions`), cùng nguyên tắc áp dụng
bằng cách đưa điều kiện scope vào `findFirst`/`findUnique` kết hợp `where`, và trả `404` khi không khớp
(REQ-RBAC-007) — **không** `findUnique` trước rồi so sánh `if (record.ownerId !== user.id) throw 403`.

---

## 7. Sequence diagram — một request qua đủ bốn lớp

```mermaid
sequenceDiagram
    participant C as Client
    participant Api as backend/apps/api (module platform)
    participant G1 as JwtAuthGuard
    participant G2 as RolesGuard
    participant G3 as PermissionsGuard
    participant R as Redis perm:{userId}
    participant Rbac as RbacService (module identity)
    participant G4 as PoliciesGuard (CASL)
    participant H as Handler

    C->>Api: PATCH /v1/catalog/products/:id/approve
    Api->>G1: Xác thực JWT (RS256), kiểm sessionId chưa bị thu hồi
    G1-->>Api: OK hoặc 401
    Api->>G2: @Roles(ADMIN) so với User.roles
    G2-->>Api: OK hoặc 403 (dừng, không tới lớp 2)
    Api->>G3: @Permissions(catalog:products:approve)
    G3->>R: GET perm:{userId}
    alt cache hit
        R-->>G3: Set<permission>
    else cache miss hoặc Redis lỗi
        G3->>Rbac: rbacService.getEffectivePermissions(userId) (gọi DI, REQ-RBAC-013, đường chậm)
        Rbac-->>G3: Set<permission>
        G3->>R: SET perm:{userId} TTL 15p (best-effort)
    end
    G3-->>Api: OK hoặc 403 (dừng, không tới lớp 3)
    Api->>G4: ab.can('approve', subject('Product', record))
    G4->>G4: mapSubject tường minh; scope theo whereForScope khi là danh sách
    alt trong phạm vi + rule cho phép
        G4-->>H: Cho phép
        H-->>C: 200
    else ngoài phạm vi (tồn tại nhưng không thuộc scope)
        G4-->>C: 404 (REQ-RBAC-007)
    else rule CASL từ chối
        G4-->>C: 403
    end
```

---

## 8. Trường hợp biên

- Redis sập giữa lúc cache đang TTL còn hiệu lực: cache cục bộ LRU 30 giây trong pod chịu tải tạm, quá 30 giây đi
  đường chậm đọc DB qua `rbac.getEffectivePermissions` (REQ-RBAC-013).
- Một user vừa bị gỡ role vừa đang giữ access token còn hạn 10 phút: cache permission bị xoá ngay
  (REQ-RBAC-010/012) nên request tiếp theo bị chặn dù JWT chưa hết hạn — vì permission không nằm trong JWT
  ([security.md §3](../../01-architecture/security.md#3-token)).
- `SUPER_ADMIN` bypass toàn bộ lớp 2 và 3 nhưng **không** bypass lớp 4 khi lớp 4 chỉ là kiểm tra tồn tại tài
  nguyên (nếu id không tồn tại, vẫn `404`, không phải "toàn quyền nên luôn 200").
- Role bị xoá trong khi có user đang giữ: chặn xoá ở REQ-RBAC-009 test 3; nếu buộc phải xoá (nghiệp vụ gộp role),
  phải là một thao tác riêng "migrate user sang role khác" trước, không xoá trực tiếp gây `UserSystemRole` mồ côi.
- Seed chạy trên môi trường đã có permission tên trùng nhưng khác `module`/`resource`/`action` do lỗi nhập liệu
  thủ công trước đó: seed idempotent theo `name` (unique), không theo bộ ba `module/resource/action`, nên không tạo
  bản ghi trùng nhưng cũng không tự sửa bản ghi sai — cần script kiểm tra riêng, không thuộc scope `prisma db seed`.

---

## 9. Điểm tranh chấp đồng thời

RBAC không có số dư hay tồn kho nên không có tranh chấp kiểu `UPDATE … WHERE` như tiền/kho, nhưng có hai điểm cần
khoá/ràng buộc:

- **Xoá theo lô cache Redis khi đổi định nghĩa role**: dùng `SCAN` theo mẫu `perm:*` kèm cursor theo lô, **không**
  dùng `KEYS` (chặn Redis sản xuất) — đúng như rbac-advanced.md §6.
- **Ghi `RolePermission`/`UserPermission` đồng thời từ hai request Super Admin**: dựa vào ràng buộc
  `@@unique([roleId, permissionId])` / `@@unique([userId, permissionId])` ở tầng DB để tránh tạo trùng khi hai
  request race; xử lý lỗi unique constraint thành no-op (idempotent) thay vì lỗi 500.

---

## 10. Ảnh hưởng tới domain khác

- Mọi module khác **đọc** permission bằng cách gọi trực tiếp `RbacService.getEffectivePermissions()`/
  `RbacService.checkPermission()` qua DI, không tự import Prisma model của module `identity` (CLAUDE.md luật #2).
- Module `audit` nghe mọi thay đổi RBAC (`rbac.permissions.changed`, `user.role-granted/revoked`) qua `EventEmitter2`
  trong process để ghi audit — xem `FEAT-AUD-001`.
- Module `platform` là nơi thực thi guard chain thực tế cho request từ FE; module `identity` chỉ là nguồn sự thật cho
  dữ liệu quyền — guard trong `platform` gọi trực tiếp `RbacService` (DI) để lấy permission hiệu lực, không phải mỗi
  module tự dựng guard gọi RPC riêng.
- Module `seller` nghe `seller.application.approved` để yêu cầu module `identity` gán role `SELLER` — quan hệ hai
  chiều đã ghi ở [service-catalog.md §1](../../01-architecture/service-catalog.md).
