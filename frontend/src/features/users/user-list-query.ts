import type { UserListQuery } from '@timmyhub/contracts'
import { UserListQuerySchema } from '@timmyhub/contracts'

import { USER_QUERY_PARAM } from '@/constants'

type SearchParams = Record<string, string | string[] | undefined>

// Đọc bộ lọc danh sách người dùng từ URL bằng CHÍNH schema của backend (`UserListQuerySchema`, luật #15): cùng biên
// `page ≥ 1`, `pageSize ≤ 100`, cùng danh sách `sort` hợp lệ. Tham số lạ hoặc không hợp lệ thì rơi về mặc định thay vì
// dựng ra một truy vấn sai — người dùng gõ tay trên URL cũng không làm trang vỡ.
export function parseUserListQuery(params: SearchParams): UserListQuery {
    const pick = (key: string): string | undefined => {
        const value = params[key]
        return typeof value === 'string' ? value : undefined
    }

    const parsed = UserListQuerySchema.safeParse({
        [USER_QUERY_PARAM.PAGE]: pick(USER_QUERY_PARAM.PAGE),
        [USER_QUERY_PARAM.PAGE_SIZE]: pick(USER_QUERY_PARAM.PAGE_SIZE),
        [USER_QUERY_PARAM.SEARCH]: pick(USER_QUERY_PARAM.SEARCH),
        [USER_QUERY_PARAM.ROLE]: pick(USER_QUERY_PARAM.ROLE),
        [USER_QUERY_PARAM.STATUS]: pick(USER_QUERY_PARAM.STATUS),
        [USER_QUERY_PARAM.NAME]: pick(USER_QUERY_PARAM.NAME),
        [USER_QUERY_PARAM.EMAIL]: pick(USER_QUERY_PARAM.EMAIL),
        [USER_QUERY_PARAM.CREATED_FROM]: pick(USER_QUERY_PARAM.CREATED_FROM),
        [USER_QUERY_PARAM.CREATED_TO]: pick(USER_QUERY_PARAM.CREATED_TO),
        [USER_QUERY_PARAM.SORT]: pick(USER_QUERY_PARAM.SORT),
    })

    return parsed.success ? parsed.data : UserListQuerySchema.parse({})
}

// Tập tham số gửi lên API cho đúng trạng thái danh sách đang xem — đặt **ngay cạnh** `parseUserListQuery` để hai chiều
// không thể lệch nhau: thêm một tham số vào URL mà quên đưa vào đây thì bộ lọc hiện đúng trên thanh địa chỉ, đúng trên
// lưới, nhưng server không bao giờ nhận được — lỗi câm, vì không có chỗ nào báo thiếu.
//
// Khoá lấy từ `USER_QUERY_PARAM` nên bắt buộc trùng tên trường của `UserListQuerySchema` (backend validate bằng chính
// schema đó). Không bao giờ gửi `tabs`/`open`: hai tham số đó chỉ là mối quan tâm giao diện.
export function userListRequestParams(query: UserListQuery): Record<string, string | number | undefined> {
    return {
        [USER_QUERY_PARAM.PAGE]: query.page,
        [USER_QUERY_PARAM.PAGE_SIZE]: query.pageSize,
        [USER_QUERY_PARAM.SEARCH]: query.q,
        [USER_QUERY_PARAM.ROLE]: query.role,
        [USER_QUERY_PARAM.STATUS]: query.status,
        [USER_QUERY_PARAM.SORT]: query.sort,
        [USER_QUERY_PARAM.NAME]: query.name,
        [USER_QUERY_PARAM.EMAIL]: query.email,
        [USER_QUERY_PARAM.CREATED_FROM]: query.createdFrom,
        [USER_QUERY_PARAM.CREATED_TO]: query.createdTo,
    }
}

// Bốn tham số bộ lọc theo cột đang có trên URL, dạng `Record` chỉ chứa khoá thật sự lọc. `AgGridTable` so trạng thái
// lưới với trạng thái URL bằng chính dạng này, nên "không có khoá" và "khoá rỗng" phải quy về một — để nguyên khoá
// rỗng thì mỗi lần đồng bộ lại thấy khác nhau và ghi URL thêm một lần vô ích.
//
// Nhận bốn giá trị rời chứ không nhận cả `UserListQuery`: trang cần một object ổn định tham chiếu để đẩy lên lưới,
// mà `query` là prop mới mỗi lần server render lại — bọc `useMemo` quanh `query` thì memo không bao giờ dùng lại.
export function userColumnFilterParams(filters: {
    name?: string | undefined
    email?: string | undefined
    createdFrom?: string | undefined
    createdTo?: string | undefined
}): Record<string, string> {
    const params: Record<string, string> = {}

    if (filters.name) params[USER_QUERY_PARAM.NAME] = filters.name
    if (filters.email) params[USER_QUERY_PARAM.EMAIL] = filters.email
    if (filters.createdFrom) params[USER_QUERY_PARAM.CREATED_FROM] = filters.createdFrom
    if (filters.createdTo) params[USER_QUERY_PARAM.CREATED_TO] = filters.createdTo

    return params
}
