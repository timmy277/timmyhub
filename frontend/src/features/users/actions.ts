'use server'

import { revalidatePath } from 'next/cache'

import type { ApiErrorCode, CreateUserInput, UpdateUserInput, UserDetail } from '@timmyhub/contracts'
import { CreateUserSchema, LockUserSchema, UpdateUserSchema } from '@timmyhub/contracts'

import { API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import type { BackendResult } from '@/lib/api-server'
import { fetchBackend } from '@/lib/api-server'

import { unstable_update } from '@/lib/auth'

// Thao tác ghi đi qua Server Action: client không bao giờ cầm access token (REQ-IDN-022), và backend vẫn là nơi quyết
// định cuối cùng (mỗi endpoint kiểm `identity:users:*` bằng permission hiệu lực).
//
// Kết quả KHÔNG ném exception qua ranh giới server/client: Next bọc lỗi ném ra thành lỗi chung và mã lỗi sẽ mất, nên
// trả union `{ ok, code }` để form dịch đúng câu qua catalog `api`.
export type UserActionFailureCode = ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'VALIDATION_FAILED'
export type UserActionResult = { ok: true } | { ok: false; code: UserActionFailureCode }

export async function createUserAction(input: CreateUserInput): Promise<UserActionResult> {
    const parsed = CreateUserSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    return run((token) => fetchBackend<UserDetail>(API_ROUTE.USERS.LIST, { token, method: 'POST', body: parsed.data }))
}

export async function updateUserAction(userId: string, input: UpdateUserInput): Promise<UserActionResult> {
    const parsed = UpdateUserSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<UserDetail>(API_ROUTE.USERS.DETAIL(userId), {
        token: actor.accessToken,
        method: 'PATCH',
        body: parsed.data,
    })
    if (!result.ok) return { ok: false, code: result.code }

    if (actor.userId === userId) {
        try {
            await unstable_update({
                user: {
                    name: result.data.profile?.displayName ?? undefined,
                    image: result.data.profile?.avatar ?? undefined,
                },
            })
        } catch {
            // NextAuth unstable_update fallback
        }
    }

    revalidatePath(ROUTE.USERS)
    return { ok: true }
}

// Lấy thông tin hiển thị của tài khoản đang đăng nhập từ backend (cho Navbar)
export async function getCurrentUserProfileAction(): Promise<{
    displayName: string | null
    avatar: string | null
} | null> {
    const actor = await getActor()
    if (!actor) return null

    const result = await fetchBackend<UserDetail>(API_ROUTE.USERS.DETAIL(actor.userId), { token: actor.accessToken })
    if (!result.ok) return null

    return {
        displayName: result.data.profile?.displayName ?? null,
        avatar: result.data.profile?.avatar ?? null,
    }
}

// Lấy toàn bộ thông tin chi tiết của tài khoản đang đăng nhập (cho trang Account Settings)
export async function getCurrentUserDetailAction(): Promise<UserDetail | null> {
    const actor = await getActor()
    if (!actor) return null

    const result = await fetchBackend<UserDetail>(API_ROUTE.USERS.DETAIL(actor.userId), { token: actor.accessToken })
    if (!result.ok) return null

    return result.data
}

// Khoá bắt buộc kèm lý do (REQ-USR-012) — validate lại ở server trước khi gửi, cùng schema với form.
export async function setUserLockAction(userId: string, locked: boolean, reason?: string): Promise<UserActionResult> {
    const path = locked ? API_ROUTE.USERS.LOCK(userId) : API_ROUTE.USERS.UNLOCK(userId)
    const body = locked ? LockUserSchema.safeParse({ reason }) : null
    if (body && !body.success) return { ok: false, code: 'VALIDATION_FAILED' }

    return run((token) =>
        fetchBackend<UserDetail>(path, {
            token,
            method: 'POST',
            ...(body?.success ? { body: body.data } : {}),
        }),
    )
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
    return run((token) => fetchBackend<undefined>(API_ROUTE.USERS.DETAIL(userId), { token, method: 'DELETE' }))
}

// Gán/gỡ vai trò dùng endpoint của module rbac (đã có một chỗ lo chống leo thang đặc quyền + vô hiệu cache permission)
// thay vì dựng lại nghiệp vụ đó ở đây.
export async function assignUserRoleAction(userId: string, roleName: string): Promise<UserActionResult> {
    return run((token) =>
        fetchBackend<undefined>(API_ROUTE.RBAC.USER_ROLES(userId), { token, method: 'POST', body: { roleName } }),
    )
}

export async function revokeUserRoleAction(userId: string, roleName: string): Promise<UserActionResult> {
    return run((token) =>
        fetchBackend<undefined>(API_ROUTE.RBAC.USER_ROLE(userId, roleName), { token, method: 'DELETE' }),
    )
}

// ===== Private helpers =====

// Lấy token từ phiên rồi chạy một lời gọi backend; thành công thì dựng lại dữ liệu của trang.
async function run(call: (accessToken: string) => Promise<BackendResult<unknown>>): Promise<UserActionResult> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await call(actor.accessToken)
    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.USERS)
    return { ok: true }
}
