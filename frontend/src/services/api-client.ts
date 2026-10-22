import axios, { type AxiosError } from 'axios'

import { API_BASE_URL, API_REQUEST_TIMEOUT_MS, API_ROUTE } from '@/constants'
import { withAuthRefreshLock } from '@/utils'

// ===== Instance =====

// Instance duy nhất cho mọi call API phía client — interceptor nằm ngay đây, nơi khác không tự gắn header
// hay tự refresh (config chung theo yêu cầu; CLAUDE.md luật #22).
//
// `timeout` phải khai ở đây: axios mặc định chờ vô hạn, nên một backend treo sẽ để react-query quay mãi mà không bao
// giờ chạm `onError`. Hết hạn thì axios ném `ECONNABORTED` và đi thẳng đường lỗi thông thường.
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: API_REQUEST_TIMEOUT_MS,
})

// ===== Interceptors =====

// Access token trong RAM — KHÔNG persist vào localStorage/cookie thường (REQ-IDN-022). Nguồn thật là
// cookie HttpOnly của NextAuth; token RAM chỉ để interceptor gắn Bearer ngay lập tức. SessionTokenWatcher
// (components/providers) nạp token vào đây sau mỗi lần phiên được làm mới.
let memoryAccessToken: string | null = null

export function setMemoryAccessToken(token: string | null): void {
    memoryAccessToken = token
}

// Nhiều request 401 đồng thời trong cùng tab chỉ cho một luồng refresh chạy — các request còn lại chờ chung
// promise. Khoá giữa các tab do `withAuthRefreshLock` lo (Web Locks).
let refreshInFlight: Promise<string | null> | null = null

// Bảo NextAuth tạo phiên mới từ cookie hiện tại: gọi POST /api/auth/session với { refresh: true },
// route handler kích hoạt jwt callback với trigger === 'update', gọi POST v1/auth/refresh tới backend
// và re-issue cookie mới vào trình duyệt. Trả về ACCESS TOKEN MỚI để retry dùng ngay.
async function refreshSession(): Promise<string | null> {
    try {
        // Khoá cross-tab: tab khác đang refresh thì đợi, sau đó tab thắng đã có cookie mới.
        const token = await withAuthRefreshLock(async () => {
            const res = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: true }),
            })
            if (!res.ok) return null
            const session = await res.json()
            return (session?.accessToken as string | undefined) ?? null
        })
        // Ghi vào RAM ngay: nguồn duy nhất cho interceptor request, kể cả trước khi hook watcher kịp chạy.
        if (token) setMemoryAccessToken(token)
        return token
    } catch {
        return null
    }
}

apiClient.interceptors.request.use((config) => {
    if (memoryAccessToken) {
        config.headers.Authorization = `Bearer ${memoryAccessToken}`
    }
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined

        // Chỉ retry một lần, và không retry chính request refresh (tránh vòng lặp).
        if (
            !original ||
            original._retried ||
            error.response?.status !== 401 ||
            original.url === API_ROUTE.AUTH.REFRESH
        ) {
            return Promise.reject(error)
        }
        original._retried = true

        try {
            const freshToken = await (refreshInFlight ?? (refreshInFlight = refreshSession()))
            // Không lấy được token (phiên đã hết hiệu lực / không gọi được server) — trả lỗi gốc cho caller.
            if (!freshToken) return Promise.reject(error)
            original.headers.Authorization = `Bearer ${freshToken}`
        } finally {
            refreshInFlight = null
        }

        return apiClient(original)
    },
)
