---
title: Tasks — rbac-permission
status: draft
owner: Backend Lead
updated: 2026-09-16
related: [docs/03-specs/rbac-permission/requirements.md, docs/03-specs/rbac-permission/design.md]
---

# Tasks — `rbac-permission`

- [ ] **TASK-RBAC-001** Dựng `RolesGuard` đọc `User.roles` (lớp 1), gắn trước `PermissionsGuard` trong pipeline guard
    - Ref: `REQ-RBAC-001`
    - Ước lượng: 0.5 ngày · Vai: BE
    - Xong khi: test tích hợp chứng minh `403` dừng ở lớp 1 không gọi tới lớp 2/3; `SUPER_ADMIN` qua lớp 1 và ghi audit bypass

- [ ] **TASK-RBAC-002** Cài `PermissionsGuard` hợp permission theo `UserSystemRole → RolePermission` và áp `UserPermission` lớp 2b
    - Ref: `REQ-RBAC-002`, `REQ-RBAC-003`
    - Ước lượng: 1.5 ngày · Vai: BE
    - Xong khi: test phủ ba ca trong REQ-RBAC-002 và REQ-RBAC-003 (hợp permission nhiều role, khước từ ghi đè role, chặn tự nâng cấp)

- [ ] **TASK-RBAC-003** Định nghĩa `PERMISSIONS` const trong `@timmyhub/contracts` đúng chuẩn `module:resource:action[:any]`
    - Ref: `REQ-RBAC-004`
    - Ước lượng: 1 ngày · Vai: BE
    - Xong khi: toàn bộ permission ở roles-and-permissions.md §4 có mặt trong const; lint chặn chuỗi permission viết tay không qua const

- [ ] **TASK-RBAC-004** Viết lại `CaslAbilityFactory.mapSubject` dùng `SUBJECT_REGISTRY` tường minh, ném lỗi cho subject lạ
    - Ref: `REQ-RBAC-005`, `REQ-RBAC-006`
    - Ước lượng: 2 ngày · Vai: BE
    - Xong khi: mọi subject ở roles-and-permissions.md §6 có ít nhất 1 test `can` + 1 test `cannot`; test riêng khẳng định subject chưa đăng ký ném `UnregisteredCaslSubjectError` thay vì cho qua

- [ ] **TASK-RBAC-005** Cài `DataScope`/`whereForScope` dùng chung, áp cho mọi `findMany` nghiệp vụ trong `identity-service`
    - Ref: `REQ-RBAC-007`
    - Ước lượng: 1.5 ngày · Vai: BE
    - Xong khi: lint rule bắt `findMany` không kèm `whereForScope`; endpoint đọc một bản ghi ngoài phạm vi trả `404` (test ca 1–3 của REQ-RBAC-007)

- [ ] **TASK-RBAC-006** Viết `prisma/seed.ts` seed đầy đủ `Permission` + `RolePermission` theo bảng ở design.md §2, bổ sung các permission bản cũ thiếu
    - Ref: `REQ-RBAC-008`
    - Ước lượng: 1.5 ngày · Vai: BE
    - Xong khi: seed idempotent chạy 2 lần không lỗi; test khẳng định `catalog:products:approve`, `identity:users:create`, `rbac:permissions:create/update/delete` tồn tại sau seed

- [ ] **TASK-RBAC-007** API CRUD `SystemRole` + gán `RolePermission` qua admin console, chặn sửa/xoá role `isSystem`
    - Ref: `REQ-RBAC-009`
    - Ước lượng: 2 ngày · Vai: BE
    - Xong khi: test 3 ca của REQ-RBAC-009 xanh; audit log ghi diff trước/sau + lý do bắt buộc

- [ ] **TASK-RBAC-008** API gán/gỡ role cho user (`POST/DELETE /v1/users/:id/roles`), phát `user.role-granted`/`user.role-revoked` qua outbox
    - Ref: `REQ-RBAC-010`
    - Ước lượng: 1 ngày · Vai: BE
    - Xong khi: gán/gỡ role cập nhật `UserSystemRole` trong cùng transaction với outbox event; test chặn admin tự gán `SUPER_ADMIN` cho người khác

- [ ] **TASK-RBAC-009** RPC `rbac.getEffectivePermissions(userId)` + endpoint `GET /v1/rbac/users/:id/effective-permissions`
    - Ref: `REQ-RBAC-011`
    - Ước lượng: 1 ngày · Vai: BE
    - Xong khi: kết quả RPC khớp chính xác với những gì `PermissionsGuard` dùng để chặn (test đối chiếu chéo); user không tồn tại trả lỗi rõ ràng thay vì mảng rỗng

- [ ] **TASK-RBAC-010** Cache permission Redis `perm:{userId}` TTL 15 phút + consumer vô hiệu hoá theo `rbac.permissions.changed`/`user.role-granted`/`user.role-revoked`/`user.locked`
    - Ref: `REQ-RBAC-012`
    - Ước lượng: 2 ngày · Vai: BE
    - Xong khi: đổi role/permission → cache liên quan bị xoá trong < 1 giây (test đo thời gian); xoá theo lô dùng `SCAN`, không dùng `KEYS`

- [ ] **TASK-RBAC-011** Đường chậm fail-closed khi Redis lỗi: đọc DB trực tiếp, cache cục bộ LRU 30 giây trong pod, `503` khi cả hai đều không phản hồi
    - Ref: `REQ-RBAC-013`
    - Ước lượng: 1.5 ngày · Vai: BE
    - Xong khi: test giả lập Redis timeout chứng minh request vẫn được đánh giá đúng quyền qua DB; test giả lập cả Redis và DB lỗi chứng minh trả `503`, không có nhánh nào `allow()` mặc định

- [ ] **TASK-RBAC-012** Script `check-permissions-consistency` chạy lúc bootstrap, đối chiếu `@Permissions` metadata với `PERMISSIONS` const và bảng `Permission`
    - Ref: `REQ-RBAC-014`
    - Ước lượng: 2 ngày · Vai: BE
    - Xong khi: service cố tình thiếu một permission trong DB không khởi động được (test integration khởi động thất bại có log rõ ràng); permission thừa trong const chỉ cảnh báo không chặn

- [ ] **TASK-RBAC-013** Test ma trận vai × endpoint sinh tự động từ metadata cho toàn bộ endpoint `identity-service`
    - Ref: `REQ-RBAC-001`, `REQ-RBAC-002`, `REQ-RBAC-004`
    - Ước lượng: 2 ngày · Vai: QA/BE
    - Xong khi: phủ 100% endpoint có `@Roles`/`@Permissions`, chạy trong CI, chặn merge khi có endpoint mới không nằm trong ma trận

- [ ] **TASK-RBAC-014** Test rò rỉ theo phạm vi: seller A gọi mọi endpoint đọc của `rbac-permission` với id thuộc seller/user B
    - Ref: `REQ-RBAC-007`
    - Ước lượng: 1 ngày · Vai: QA
    - Xong khi: mọi ca trả `403`/`404` đúng quy ước (không bao giờ `200`), không phân biệt được với ca "không tồn tại" qua response

- [ ] **TASK-RBAC-015** Màn hình admin console: quản lý role & permission, gán/gỡ role cho user, tra cứu effective permissions
    - Ref: `REQ-RBAC-009`, `REQ-RBAC-010`, `REQ-RBAC-011`
    - Ước lượng: 3 ngày · Vai: FE
    - Xong khi: đủ 7 trạng thái component (CLAUDE.md luật #9); dùng `next/dynamic` nếu cần bảng nặng; không hardcode chuỗi hiển thị, qua `next-intl`
