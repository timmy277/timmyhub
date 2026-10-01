import type { AuditLogListQuery } from '@timmyhub/contracts'
import { AuditLogListQuerySchema } from '@timmyhub/contracts'

import { AUDIT_QUERY_PARAM } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>

// Đọc bộ lọc danh sách audit log từ URL bằng CHÍNH schema của backend (`AuditLogListQuerySchema`, luật #15): cùng biên
// `page ≥ 1`, `pageSize ≤ 100`, cùng danh sách `sort` hợp lệ. Tham số lạ hoặc không hợp lệ thì rơi về mặc định thay vì
// dựng ra một truy vấn sai — người dùng gõ tay trên URL cũng không làm trang vỡ.
export function parseAuditListQuery(params: SearchParams): AuditLogListQuery {
    const pick = (key: string): string | undefined => {
        const value = params[key]
        return typeof value === 'string' ? value : undefined
    }

    const parsed = AuditLogListQuerySchema.safeParse({
        [AUDIT_QUERY_PARAM.PAGE]: pick(AUDIT_QUERY_PARAM.PAGE),
        [AUDIT_QUERY_PARAM.PAGE_SIZE]: pick(AUDIT_QUERY_PARAM.PAGE_SIZE),
        [AUDIT_QUERY_PARAM.ACTOR_ID]: pick(AUDIT_QUERY_PARAM.ACTOR_ID),
        [AUDIT_QUERY_PARAM.ACTION]: pick(AUDIT_QUERY_PARAM.ACTION),
        [AUDIT_QUERY_PARAM.ENTITY_TYPE]: pick(AUDIT_QUERY_PARAM.ENTITY_TYPE),
        [AUDIT_QUERY_PARAM.ENTITY_ID]: pick(AUDIT_QUERY_PARAM.ENTITY_ID),
        [AUDIT_QUERY_PARAM.SERVICE]: pick(AUDIT_QUERY_PARAM.SERVICE),
        [AUDIT_QUERY_PARAM.OCCURRED_FROM]: pick(AUDIT_QUERY_PARAM.OCCURRED_FROM),
        [AUDIT_QUERY_PARAM.OCCURRED_TO]: pick(AUDIT_QUERY_PARAM.OCCURRED_TO),
        [AUDIT_QUERY_PARAM.SORT]: pick(AUDIT_QUERY_PARAM.SORT),
    })

    return parsed.success ? parsed.data : AuditLogListQuerySchema.parse({})
}

// Tập tham số gửi lên API cho đúng trạng thái danh sách đang xem — đặt **ngay cạnh** `parseAuditListQuery` để hai chiều
// không thể lệch nhau: thêm một tham số vào URL mà quên đưa vào đây thì bộ lọc hiện đúng trên thanh địa chỉ, đúng trên
// lưới, nhưng server không bao giờ nhận được.
//
// Khoá lấy từ `AUDIT_QUERY_PARAM` nên bắt buộc trùng tên trường của `AuditLogListQuerySchema` (backend validate bằng
// chính schema đó). Không bao giờ gửi `tabs`: tham số đó chỉ là mối quan tâm giao diện.
export function auditListRequestParams(query: AuditLogListQuery): Record<string, string | number | undefined> {
    return {
        [AUDIT_QUERY_PARAM.PAGE]: query.page,
        [AUDIT_QUERY_PARAM.PAGE_SIZE]: query.pageSize,
        [AUDIT_QUERY_PARAM.SORT]: query.sort,
        [AUDIT_QUERY_PARAM.ACTOR_ID]: query.actorId,
        [AUDIT_QUERY_PARAM.ACTION]: query.action,
        [AUDIT_QUERY_PARAM.ENTITY_TYPE]: query.entityType,
        [AUDIT_QUERY_PARAM.ENTITY_ID]: query.entityId,
        [AUDIT_QUERY_PARAM.SERVICE]: query.service,
        [AUDIT_QUERY_PARAM.OCCURRED_FROM]: query.occurredFrom,
        [AUDIT_QUERY_PARAM.OCCURRED_TO]: query.occurredTo,
    }
}

// Bộ lọc theo cột đang có trên URL, dạng `Record` chỉ chứa khoá thật sự lọc. `AgGridTable` so trạng thái lưới với trạng
// thái URL bằng chính dạng này, nên "không có khoá" và "khoá rỗng" phải quy về một.
//
// Nhận giá trị rời chứ không nhận cả `AuditLogListQuery`: trang cần một object ổn định tham chiếu để đẩy lên lưới, mà
// `query` là prop mới mỗi lần server render lại — bọc `useMemo` quanh `query` thì memo không bao giờ dùng lại.
export function auditColumnFilterParams(filters: {
    action?: string | undefined
    entityType?: string | undefined
    entityId?: string | undefined
    service?: string | undefined
    actorId?: string | undefined
    occurredFrom?: string | undefined
    occurredTo?: string | undefined
}): Record<string, string> {
    const params: Record<string, string> = {}

    if (filters.action) params[AUDIT_QUERY_PARAM.ACTION] = filters.action
    if (filters.entityType) params[AUDIT_QUERY_PARAM.ENTITY_TYPE] = filters.entityType
    if (filters.entityId) params[AUDIT_QUERY_PARAM.ENTITY_ID] = filters.entityId
    if (filters.service) params[AUDIT_QUERY_PARAM.SERVICE] = filters.service
    if (filters.actorId) params[AUDIT_QUERY_PARAM.ACTOR_ID] = filters.actorId
    if (filters.occurredFrom) params[AUDIT_QUERY_PARAM.OCCURRED_FROM] = filters.occurredFrom
    if (filters.occurredTo) params[AUDIT_QUERY_PARAM.OCCURRED_TO] = filters.occurredTo

    return params
}
