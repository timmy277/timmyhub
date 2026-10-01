import type { ReadonlyURLSearchParams } from 'next/navigation'

import { AUDIT_QUERY_PARAM } from '@/constants'

export interface AuditListHrefPatch {
    page?: number
    pageSize?: number
}

// Dựng href cho một trạng thái phân trang khác của danh sách audit log, **giữ nguyên** bộ lọc đang có — nhờ vậy bấm
// sang trang 3 rồi bấm Back vẫn về đúng trang 2 với nguyên bộ lọc, và link dán cho đồng nghiệp mở ra đúng màn hình
// đang xem.
//
// Đổi cỡ trang thì bỏ luôn số trang: đang ở trang 5 với 100 dòng/trang mà quay về 20 dòng/trang thì trang 5 có thể
// không còn tồn tại, người dùng sẽ rơi vào một trang trống.
export function buildAuditListHref(
    pathname: string,
    searchParams: URLSearchParams | ReadonlyURLSearchParams,
    patch: AuditListHrefPatch,
): string {
    const params = new URLSearchParams(searchParams.toString())

    if (patch.pageSize !== undefined) {
        params.set(AUDIT_QUERY_PARAM.PAGE_SIZE, String(patch.pageSize))
        params.delete(AUDIT_QUERY_PARAM.PAGE)
    }

    if (patch.page !== undefined) {
        // Trang 1 là mặc định của API nên không ghi vào URL — link gọn hơn và trùng với URL người dùng tự gõ.
        if (patch.page <= 1) params.delete(AUDIT_QUERY_PARAM.PAGE)
        else params.set(AUDIT_QUERY_PARAM.PAGE, String(patch.page))
    }

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}
