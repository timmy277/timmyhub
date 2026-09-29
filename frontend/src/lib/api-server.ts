import type { ApiErrorCode } from '@timmyhub/contracts'

import { API_BASE_URL } from '@/constants'

// Gọi backend từ **phía server** (Server Component, Server Action): access token lấy từ phiên NextAuth nằm trong cookie
// HttpOnly nên không bao giờ đi qua JavaScript của trình duyệt. Vì chạy trên server, request này cũng không dính CORS.
//
// Không throw: trả về union để nơi gọi phân biệt được "backend từ chối" (status + mã lỗi) với "không gọi được backend"
// (status 0, mã `BACKEND_UNAVAILABLE`) — giống cách `lib/auth.ts` xử lý. Nuốt lỗi thành `null` sẽ khiến giao diện
// không phân biệt nổi "không có quyền" với "máy chủ chết".
export type BackendFailure = {
    ok: false
    // 0 = không kết nối được; còn lại là mã HTTP backend trả.
    status: number
    code: ApiErrorCode | 'BACKEND_UNAVAILABLE'
}

export type BackendResult<T> = { ok: true; data: T } | BackendFailure

type FetchBackendOptions = {
    token: string
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    // Tham số truy vấn; giá trị `undefined` bị bỏ qua thay vì gửi chuỗi rỗng.
    query?: Record<string, string | number | undefined>
}

const BACKEND_UNAVAILABLE_CODE = 'BACKEND_UNAVAILABLE' as const

export async function fetchBackend<T>(path: string, options: FetchBackendOptions): Promise<BackendResult<T>> {
    const url = new URL(`${API_BASE_URL}/${path}`)
    for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined) url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
        response = await fetch(url, {
            method: options.method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options.token}`,
            },
            // Không cache: dữ liệu quản trị phải phản ánh ngay thay đổi vừa ghi, và `revalidatePath` sau mỗi thao tác
            // ghi mới là thứ quyết định khi nào bảng được dựng lại.
            cache: 'no-store',
            ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        })
    } catch {
        return { ok: false, status: 0, code: BACKEND_UNAVAILABLE_CODE }
    }

    if (!response.ok) {
        const code = await readErrorCode(response)
        return { ok: false, status: response.status, code: code ?? BACKEND_UNAVAILABLE_CODE }
    }

    // 204 (xoá thành công) không có body.
    if (response.status === 204) return { ok: true, data: undefined as T }

    try {
        return { ok: true, data: (await response.json()) as T }
    } catch {
        return { ok: false, status: response.status, code: BACKEND_UNAVAILABLE_CODE }
    }
}

// Khung lỗi của `ApiExceptionFilter`: `{ success: false, error: { code, message, … } }`.
async function readErrorCode(response: Response): Promise<ApiErrorCode | null> {
    try {
        const body: unknown = await response.json()
        if (typeof body === 'object' && body !== null && 'error' in body) {
            const error: unknown = Reflect.get(body, 'error')
            if (typeof error === 'object' && error !== null && 'code' in error) {
                const code: unknown = Reflect.get(error, 'code')
                if (typeof code === 'string') return code as ApiErrorCode
            }
        }
    } catch {
        // Body không phải JSON — rơi về mã mặc định ở nơi gọi.
    }
    return null
}
