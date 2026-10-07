import { z } from 'zod'

// Zod DTO cho API audit log (/v1/audit/logs) — nguồn validation duy nhất (CLAUDE.md luật #15), dùng chung FE/BE.
// Truy vết: FEAT-AUD-004 (giao diện tra cứu audit log cho admin). Audit log là bảng bất biến (chỉ INSERT/SELECT),
// không có thao tác ghi qua API — mọi audit entry được sinh trong transaction nghiệp vụ qua `writeAuditLog`.

// Mã HTTP + phân trang theo docs/01-architecture/api-conventions.md §3.2/§6 — khớp khuôn `UserListQuerySchema`.
export const AUDIT_LOG_LIST_DEFAULT_PAGE_SIZE = 20
export const AUDIT_LOG_LIST_MAX_PAGE_SIZE = 100
export const AUDIT_LOG_MAX_QUERY_LENGTH = 100

// `sort` của danh sách audit log. `occurredAt` là cột chính để tra cứu theo thời gian — DESC (mới nhất trước) là
// mặc định. `action`/`actorId`/`entityType` cho nhóm theo loại hành động/tác nhân/đối tượng.
export const AUDIT_LOG_LIST_SORT = {
    NEWEST: '-occurredAt',
    OLDEST: 'occurredAt',
    ACTION_ASC: 'action',
    ACTION_DESC: '-action',
    ENTITY_ASC: 'entityType',
    ENTITY_DESC: '-entityType',
} as const
export type AuditLogListSort = (typeof AUDIT_LOG_LIST_SORT)[keyof typeof AUDIT_LOG_LIST_SORT]
export const AuditLogListSortSchema = z.enum(AUDIT_LOG_LIST_SORT)

export const AUDIT_LOG_MAX_FILTER_LENGTH = 100

export const AuditLogListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(AUDIT_LOG_LIST_MAX_PAGE_SIZE)
        .default(AUDIT_LOG_LIST_DEFAULT_PAGE_SIZE),
    // Lọc theo cột — AND với nhau, đi thẳng vào `where` của Prisma (luật cứng #7).
    actorId: z.string().trim().max(AUDIT_LOG_MAX_FILTER_LENGTH).optional(),
    action: z.string().trim().max(AUDIT_LOG_MAX_FILTER_LENGTH).optional(),
    entityType: z.string().trim().max(AUDIT_LOG_MAX_FILTER_LENGTH).optional(),
    entityId: z.string().trim().max(AUDIT_LOG_MAX_FILTER_LENGTH).optional(),
    service: z.string().trim().max(AUDIT_LOG_MAX_FILTER_LENGTH).optional(),
    // Khoảng thời gian xảy ra hành động, ISO-8601 đầy đủ có `Z` (cùng quy ước với UserListQuerySchema).
    occurredFrom: z.iso.datetime().optional(),
    occurredTo: z.iso.datetime().optional(),
    sort: AuditLogListSortSchema.default(AUDIT_LOG_LIST_SORT.NEWEST),
})
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>

// ===== Kiểu phản hồi =====

// Mục tóm tắt trong danh sách — không mang `before`/`after` (JSON nặng, chỉ lấy ở detail).
// `actorName` là tên hiển thị đã resolve từ `actorId` (email người dùng). AuditLog chỉ lưu id nên backend tra bảng
// người dùng để bảng hiện tên thay vì một chuỗi cuid vô nghĩa với người đọc; null khi tác nhân là hệ thống hoặc id
// không còn tồn tại.
export type AuditLogSummary = {
    id: string
    service: string
    action: string
    entityType: string
    entityId: string
    actorId: string | null
    actorName: string | null
    actorType: string
    result: string
    occurredAt: string
}

// Chi tiết — thêm `before`/`after` (diff) và `errorMessage`/`actorIp`/`userAgent` cho xem rõ.
// `before`/`after` là JSON tùy biến — dùng `z.unknown()` vì Prisma Json type có shape riêng (JSONType).
export type AuditLogDetail = AuditLogSummary & {
    actorIp: string | null
    userAgent: string | null
    before: unknown
    after: unknown
    errorMessage: string | null
}

export type AuditLogPagination = {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export type AuditLogListResult = {
    items: AuditLogSummary[]
    pagination: AuditLogPagination
}
