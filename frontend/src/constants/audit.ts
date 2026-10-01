import type { PermissionName } from '@timmyhub/contracts'

import { StatusTone } from './status'

// Hằng số của màn tra cứu audit log (module audit, FEAT-AUD-004). Cùng khuôn với `constants/user.ts`: tab nằm trong URL,
// tập giá trị hữu hạn nên dùng const object + type suy ra (luật #17), không dùng `enum` TS.

// Quyền giao diện cần biết để ẩn/hiện. Tên phải khớp permission catalog của `@timmyhub/contracts` — `satisfies` biến
// việc gõ sai thành lỗi biên dịch, không phải lỗi 403 lúc chạy.
export const AUDIT_PERMISSION = {
    LIST: 'audit:logs:list',
    READ: 'audit:logs:read',
} as const satisfies Record<string, PermissionName>

export type AuditPermissionKey = keyof typeof AUDIT_PERMISSION
export type AuditPermissionFlags = Record<AuditPermissionKey, boolean>

export function toAuditPermissionFlags(permissions: ReadonlySet<string>): AuditPermissionFlags {
    return {
        LIST: permissions.has(AUDIT_PERMISSION.LIST),
        READ: permissions.has(AUDIT_PERMISSION.READ),
    }
}

// Tham số URL của danh sách — tên phải trùng trường của `AuditLogListQuerySchema` (backend validate bằng chính schema
// đó). Server Component đọc và component client ghi cùng bộ khoá này nên khai một chỗ.
export const AUDIT_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    SORT: 'sort',
    // Bộ lọc theo cột (menu lọc ở tiêu đề bảng).
    ACTOR_ID: 'actorId',
    ACTION: 'action',
    ENTITY_TYPE: 'entityType',
    ENTITY_ID: 'entityId',
    SERVICE: 'service',
    OCCURRED_FROM: 'occurredFrom',
    OCCURRED_TO: 'occurredTo',
    // Tab hiện tại (`detail:<id>`; vắng mặt = danh sách). Chỉ là mối quan tâm giao diện nên KHÔNG nằm trong schema.
    TABS: 'tabs',
} as const

// Tab của màn audit log. Danh sách là **nền**: không có tham số `tabs` nghĩa là đang ở danh sách. Chỉ có tab chi tiết —
// bảng audit là bất biến (ADR-0011) nên không có tab tạo/sửa.
export const AUDIT_TAB = {
    LIST: 'list',
    DETAIL: 'detail',
} as const
export type AuditTab = (typeof AUDIT_TAB)[keyof typeof AUDIT_TAB]

export const AUDIT_TAB_ID_SEPARATOR = ':'
export const AUDIT_TAB_ID_LABEL_LENGTH = 8

// Bộ lọc theo cột đang có trên URL, dạng danh sách khoá thật — `useAuditListQuery` cần biết phải xoá những khoá nào khi
// bộ lọc trên lưới rỗng ("xoá hết" mà chỉ ghi đè khoá đang có thì khoá cũ ở lại trên URL và server vẫn lọc).
export const AUDIT_COLUMN_FILTER_PARAMS = [
    AUDIT_QUERY_PARAM.ACTION,
    AUDIT_QUERY_PARAM.ENTITY_TYPE,
    AUDIT_QUERY_PARAM.ENTITY_ID,
    AUDIT_QUERY_PARAM.SERVICE,
    AUDIT_QUERY_PARAM.ACTOR_ID,
    AUDIT_QUERY_PARAM.OCCURRED_FROM,
    AUDIT_QUERY_PARAM.OCCURRED_TO,
] as const

// Nhãn trạng thái kết quả hành động trong namespace i18n `auditLog`. Giá trị `result` do backend ghi vào cột `result`
// của AuditLog (ADR-0011) — chưa có hằng số trong contracts nên khai tường minh ở đây kèm sắc thái badge.
export const AUDIT_RESULT = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
} as const
export type AuditResult = (typeof AUDIT_RESULT)[keyof typeof AUDIT_RESULT]

export const AUDIT_RESULT_LABEL_KEY = {
    [AUDIT_RESULT.SUCCESS]: 'resultSuccess',
    [AUDIT_RESULT.FAILURE]: 'resultFailure',
} as const satisfies Record<string, string>

export const AUDIT_RESULT_TONE = {
    [AUDIT_RESULT.SUCCESS]: StatusTone.SUCCESS,
    [AUDIT_RESULT.FAILURE]: StatusTone.DANGER,
} as const satisfies Record<string, StatusTone>

// Mã hành động do backend ghi (`identity.user.create`…) → khoá i18n mô tả tiếng người. Mã thô là định danh kỹ thuật,
// người dùng bảng cần đọc được *đã làm gì*; mã gốc vẫn hiện ở tab chi tiết.
//
// Danh sách khớp action đang ghi trong `rbac.repository.ts` / `users.repository.ts` của backend. Mã lạ (backend thêm
// mới mà FE chưa cập nhật) rơi về hiển thị mã thô — không vỡ giao diện.
export const AUDIT_ACTION_LABEL_KEY = {
    'identity.user.create': 'actionUserCreate',
    'identity.user.update': 'actionUserUpdate',
    'identity.user.delete': 'actionUserDelete',
    'identity.user.role.grant': 'actionUserRoleGrant',
    'identity.user.role.revoke': 'actionUserRoleRevoke',
    'identity.permission.create': 'actionPermissionCreate',
    'identity.permission.delete': 'actionPermissionDelete',
    'identity.role.create': 'actionRoleCreate',
    'identity.role.update': 'actionRoleUpdate',
    'identity.role.delete': 'actionRoleDelete',
    'identity.role.permissions.replace': 'actionRolePermissionsReplace',
} as const satisfies Record<string, string>

// Loại đối tượng bị tác động → khoá i18n. Cùng lý do với mã hành động: `User`/`SystemRole` là tên lớp kỹ thuật.
export const AUDIT_ENTITY_LABEL_KEY = {
    User: 'entityUser',
    SystemRole: 'entitySystemRole',
    Permission: 'entityPermission',
    RolePermission: 'entityRolePermission',
    UserPermission: 'entityUserPermission',
} as const satisfies Record<string, string>

// Loại tác nhân → khoá i18n. `SYSTEM` là hành động tự động, hai loại còn lại là người.
export const AUDIT_ACTOR_TYPE_LABEL_KEY = {
    ADMIN: 'actorTypeAdmin',
    USER: 'actorTypeUser',
    SYSTEM: 'actorTypeSystem',
} as const satisfies Record<string, string>
