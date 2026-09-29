'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CreatePermissionInput,
    CreateRoleInput,
    PermissionSummary,
    RoleSummary,
    UpdateRoleInput,
} from '@timmyhub/contracts'
import {
    AssignRolePermissionsSchema,
    CreatePermissionSchema,
    CreateRoleSchema,
    UpdateRoleSchema,
} from '@timmyhub/contracts'

import { API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import type { BackendResult } from '@/lib/api-server'
import { fetchBackend } from '@/lib/api-server'

// Thao tác ghi của module rbac đi qua Server Action: client không cầm access token, backend vẫn là nơi quyết định cuối
// (mỗi endpoint kiểm `rbac:*` bằng permission hiệu lực). Kết quả KHÔNG ném exception qua ranh giới server/client —
// trả union `{ ok, data }` để form dịch đúng câu qua catalog `api`. Cùng khuôn với `features/users/actions.ts`.
export type RbacActionFailureCode = ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'VALIDATION_FAILED'
export type RbacActionFailure = { ok: false; code: RbacActionFailureCode }
// `data` là bản ghi backend trả về (role vừa tạo, permission vừa tạo…); thao tác không trả gì thì `undefined`.
export type RbacActionResult<T = undefined> = { ok: true; data: T } | RbacActionFailure

// Tạo role = HAI lời gọi backend (`POST /roles` chỉ nhận metadata, `PUT /roles/:id/permissions` mới nhận quyền), nên
// kết quả phải nói rõ bước thứ hai có chạy được không: role đã tạo mà gán quyền hỏng là trạng thái có thật, và im lặng
// báo thành công thì người dùng tưởng vai trò mới đã đủ quyền. `permissionsAssigned = false` ⇒ hiện cảnh báo, role
// vẫn nằm trong danh sách để vào tab Sửa gán lại.
export type CreateRoleResult = { ok: true; data: RoleSummary; permissionsAssigned: boolean } | RbacActionFailure

export async function createRoleAction(
    input: CreateRoleInput,
    permissionNames: string[] = [],
): Promise<CreateRoleResult> {
    const parsedRole = CreateRoleSchema.safeParse(input)
    if (!parsedRole.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const parsedPermissions = AssignRolePermissionsSchema.safeParse({ permissionNames })
    if (!parsedPermissions.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const created = await fetchBackend<RoleSummary>(API_ROUTE.RBAC.ROLES, {
        token: actor.accessToken,
        method: 'POST',
        body: parsedRole.data,
    })
    if (!created.ok) return { ok: false, code: created.code }

    let permissionsAssigned = permissionNames.length === 0
    if (!permissionsAssigned) {
        const assigned = await fetchBackend<RoleSummary>(API_ROUTE.RBAC.ROLE_PERMISSIONS(created.data.id), {
            token: actor.accessToken,
            method: 'PUT',
            body: parsedPermissions.data,
        })
        permissionsAssigned = assigned.ok
    }

    revalidatePath(ROUTE.ROLES)
    return { ok: true, data: created.data, permissionsAssigned }
}

// Sửa role cũng là hai lời gọi khi tập quyền có thay đổi. `permissionNames` **không truyền** = không đụng tới quyền
// (người chỉ có `rbac:roles:update` vẫn sửa được metadata); truyền mảng rỗng = xoá hết quyền. Cùng lý do với
// `CreateRoleResult`, `permissionsAssigned = false` là trạng thái có thật và phải được nói ra.
export type UpdateRoleResult = { ok: true; data: RoleSummary; permissionsAssigned: boolean } | RbacActionFailure

export async function updateRoleAction(
    roleId: string,
    input: UpdateRoleInput,
    permissionNames?: string[],
): Promise<UpdateRoleResult> {
    const parsedRole = UpdateRoleSchema.safeParse(input)
    if (!parsedRole.success) return { ok: false, code: 'VALIDATION_FAILED' }

    if (permissionNames !== undefined && !AssignRolePermissionsSchema.safeParse({ permissionNames }).success) {
        return { ok: false, code: 'VALIDATION_FAILED' }
    }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const updated = await fetchBackend<RoleSummary>(API_ROUTE.RBAC.ROLE(roleId), {
        token: actor.accessToken,
        method: 'PUT',
        body: parsedRole.data,
    })
    if (!updated.ok) return { ok: false, code: updated.code }

    let permissionsAssigned = true
    if (permissionNames !== undefined) {
        const assigned = await fetchBackend<RoleSummary>(API_ROUTE.RBAC.ROLE_PERMISSIONS(roleId), {
            token: actor.accessToken,
            method: 'PUT',
            body: { permissionNames },
        })
        permissionsAssigned = assigned.ok
    }

    revalidatePath(ROUTE.ROLES)
    return { ok: true, data: updated.data, permissionsAssigned }
}

export async function deleteRoleAction(roleId: string): Promise<RbacActionResult> {
    return run(ROUTE.ROLES, (token) => fetchBackend(API_ROUTE.RBAC.ROLE(roleId), { token, method: 'DELETE' }))
}

export async function createPermissionAction(
    input: CreatePermissionInput,
): Promise<RbacActionResult<PermissionSummary>> {
    const parsed = CreatePermissionSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    return run(ROUTE.PERMISSIONS, (token) =>
        fetchBackend<PermissionSummary>(API_ROUTE.RBAC.PERMISSIONS, { token, method: 'POST', body: parsed.data }),
    )
}

export async function deletePermissionAction(permissionId: string): Promise<RbacActionResult> {
    return run(ROUTE.PERMISSIONS, (token) =>
        fetchBackend(API_ROUTE.RBAC.PERMISSION(permissionId), { token, method: 'DELETE' }),
    )
}

// ===== Private helpers =====

// Lấy token từ phiên rồi chạy một lời gọi backend; thành công thì dựng lại dữ liệu của đúng route liên quan.
async function run<T>(
    path: string,
    call: (accessToken: string) => Promise<BackendResult<T>>,
): Promise<RbacActionResult<T>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await call(actor.accessToken)
    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(path)
    return { ok: true, data: result.data }
}
