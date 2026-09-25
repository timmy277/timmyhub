---
title: Schema dữ liệu — identity-service
status: review
owner: Backend Lead
updated: 2026-09-16
related: [docs/02-domain/domain-model.md, docs/03-specs/identity-auth, docs/03-specs/rbac-permission, docs/01-architecture/rbac-advanced.md]
---

# Schema dữ liệu — identity-service (`identity_db`)

Sở hữu danh tính người dùng, phiên đăng nhập, thiết bị, và hai lớp RBAC đầu (role trên `User`, permission động qua
`SystemRole`/`Permission`). Không lưu bất kỳ dữ liệu nghiệp vụ nào của shop/đơn hàng — những service khác chỉ giữ
`userId` dạng tham chiếu logic.

```prisma
enum UserRole {
    USER
    SELLER
    BRAND
    SHIPPER
    MODERATOR
    ADMIN
    SUPER_ADMIN
}

model User {
    id                  String                @id @default(cuid())
    email               String                @unique
    phone               String?               @unique
    passwordHash        String?
    googleId            String?               @unique
    facebookId          String?               @unique
    roles               UserRole[]            @default([USER])
    isEmailVerified     Boolean               @default(false)
    isPhoneVerified     Boolean               @default(false)
    isActive            Boolean               @default(true)
    isBanned            Boolean               @default(false)
    banReason           String?
    twoFactorEnabled    Boolean               @default(false)
    twoFactorSecret     String?
    failedLoginCount    Int                   @default(0)
    lockedUntil         DateTime?
    lastLoginAt         DateTime?
    lastLoginIp         String?
    createdAt           DateTime              @default(now())
    updatedAt           DateTime              @updatedAt
    deletedAt           DateTime?
    profile             Profile?
    devices             Device[]
    refreshTokens       RefreshToken[]
    userRoles           UserSystemRole[]
    userPermissions     UserPermission[]
    passwordResetTokens PasswordResetToken[]

    @@index([email])
    @@index([phone])
    @@index([deletedAt])
}

model Profile {
    id          String    @id @default(cuid())
    userId      String    @unique
    firstName   String
    lastName    String
    displayName String?
    avatar      String?
    dateOfBirth DateTime?
    gender      String?
    bio         String?
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt
    user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Device {
    id            String         @id @default(cuid())
    userId        String
    userAgent     String?
    ip            String?
    deviceName    String?
    isActive      Boolean        @default(true)
    lastActiveAt  DateTime       @updatedAt
    createdAt     DateTime       @default(now())
    user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
    refreshTokens RefreshToken[]

    @@index([userId])
}

model RefreshToken {
    id          String   @id @default(cuid())
    userId      String
    deviceId    String?
    token       String   @unique
    // token trước đó trong chuỗi rotation — phát hiện tái sử dụng (FEAT-IDN-003)
    replacedBy  String?
    expiresAt   DateTime
    isRevoked   Boolean  @default(false)
    revokedAt   DateTime?
    createdAt   DateTime @default(now())
    device      Device?  @relation(fields: [deviceId], references: [id], onDelete: Cascade)
    user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([token])
}

model PasswordResetToken {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique
    expiresAt DateTime
    used      Boolean  @default(false)
    createdAt DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([token])
    @@index([userId])
}

model SystemRole {
    id          String           @id @default(cuid())
    name        String           @unique
    displayName String
    description String?
    isSystem    Boolean          @default(false)
    createdAt   DateTime         @default(now())
    updatedAt   DateTime         @updatedAt
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
    name            String           @unique
    displayName     String
    description     String?
    module          String
    resource        String
    action          String
    createdAt       DateTime         @default(now())
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

// --- Outbox / idempotent consumer (ADR-0002) ---

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
    eventId     String   @id
    consumerName String
    processedAt DateTime @default(now())

    @@map("processed_events")
}
```

## Sự kiện

| Hướng | Event | Ghi chú |
|---|---|---|
| Phát | `user.registered`, `user.email-verified`, `user.locked`, `user.role-granted`, `user.role-revoked`, `rbac.permissions.changed`, `user.profile-updated` | Qua `OutboxEvent`, cùng transaction với thay đổi `User`/`RolePermission` |
| Nghe | `seller.application.approved` | Gán `UserRole.SELLER`; kiểm `ProcessedEvent` trước khi xử lý |

## Tham chiếu ngoài (external reference)

Không có — `identity-service` là service gốc, không giữ ID trỏ sang service khác.

## Bảng field bị các service khác tham chiếu

| Field | Được tham chiếu bởi |
|---|---|
| `User.id` | `sellerId`/`buyerId`/`userId` ở gần như mọi service (seller, order, cart, payment, promotion, content, engagement, chat, notification, media) |
