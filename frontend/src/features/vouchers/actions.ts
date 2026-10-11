'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CreateVoucherInput,
    UpdateVoucherInput,
    VoucherDetail,
    VoucherItem,
    VoucherListQuery,
} from '@timmyhub/contracts'
import { CreateVoucherInputSchema, UpdateVoucherInputSchema } from '@timmyhub/contracts'

import { ADMIN_PROMOTION_PERMISSION, API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type VoucherActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'

export type VoucherActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: VoucherActionFailureCode; message?: string }

function formatBackendErrorMessage(code: string, status: number): string {
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Bạn không có quyền quản lý voucher khuyến mãi (ADMIN).'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Máy chủ backend hiện không khả dụng. Vui lòng thử lại sau.'
    }
    return `Thao tác thất bại (${code}, status ${status})`
}

export async function listAdminVouchersAction(
    query?: VoucherListQuery,
): Promise<VoucherActionResult<{ items: VoucherItem[]; total: number; page: number; pageSize: number }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem danh sách voucher.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_LIST)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập quản lý voucher.' }
    }

    const result = await fetchBackend<{ items: VoucherItem[]; total: number; page: number; pageSize: number }>(
        API_ROUTE.PROMOTION.ADMIN_VOUCHERS,
        {
            token: actor.accessToken,
            query: {
                page: query?.page,
                pageSize: query?.pageSize,
                q: query?.q,
                type: query?.type,
                isActive: typeof query?.isActive === 'boolean' ? String(query.isActive) : undefined,
                scope: query?.scope,
                sellerId: query?.sellerId,
                campaignId: query?.campaignId,
            },
        },
    )

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    return { ok: true, data: result.data }
}

export async function getVoucherDetailAction(id: string): Promise<VoucherActionResult<VoucherDetail>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem chi tiết voucher.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_LIST)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập quản lý voucher.' }
    }

    const result = await fetchBackend<VoucherDetail>(API_ROUTE.PROMOTION.ADMIN_VOUCHER_DETAIL(id), {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    return { ok: true, data: result.data }
}

export async function createVoucherAction(input: CreateVoucherInput): Promise<VoucherActionResult<VoucherItem>> {
    try {
        const actor = await getActor()
        if (!actor) {
            return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để tạo voucher.' }
        }
        if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_CREATE)) {
            return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạo voucher.' }
        }

        const parsed = CreateVoucherInputSchema.safeParse(input)
        if (!parsed.success) {
            return {
                ok: false,
                code: 'VALIDATION_FAILED',
                message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
            }
        }

        const result = await fetchBackend<VoucherItem>(API_ROUTE.PROMOTION.ADMIN_VOUCHERS, {
            token: actor.accessToken,
            method: 'POST',
            body: parsed.data,
        })

        if (!result.ok) {
            return {
                ok: false,
                code: result.code,
                message: formatBackendErrorMessage(result.code, result.status),
            }
        }

        revalidatePath(ROUTE.ADMIN_VOUCHERS)
        return { ok: true, data: result.data }
    } catch (error) {
        console.error('createVoucherAction error:', error)
        return {
            ok: false,
            code: 'BACKEND_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo voucher.',
        }
    }
}

export async function updateVoucherAction(
    id: string,
    input: UpdateVoucherInput,
): Promise<VoucherActionResult<VoucherItem>> {
    try {
        const actor = await getActor()
        if (!actor) {
            return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để cập nhật voucher.' }
        }
        if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_UPDATE)) {
            return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền cập nhật voucher.' }
        }

        const parsed = UpdateVoucherInputSchema.safeParse(input)
        if (!parsed.success) {
            return {
                ok: false,
                code: 'VALIDATION_FAILED',
                message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
            }
        }

        const result = await fetchBackend<VoucherItem>(API_ROUTE.PROMOTION.ADMIN_VOUCHER_DETAIL(id), {
            token: actor.accessToken,
            method: 'PATCH',
            body: parsed.data,
        })

        if (!result.ok) {
            return {
                ok: false,
                code: result.code,
                message: formatBackendErrorMessage(result.code, result.status),
            }
        }

        revalidatePath(ROUTE.ADMIN_VOUCHERS)
        return { ok: true, data: result.data }
    } catch (error) {
        console.error('updateVoucherAction error:', error)
        return {
            ok: false,
            code: 'BACKEND_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật voucher.',
        }
    }
}

export async function toggleVoucherStatusAction(
    id: string,
    isActive: boolean,
): Promise<VoucherActionResult<VoucherItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để đổi trạng thái voucher.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_UPDATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền đổi trạng thái voucher.' }
    }

    const result = await fetchBackend<VoucherItem>(API_ROUTE.PROMOTION.ADMIN_VOUCHER_STATUS(id), {
        token: actor.accessToken,
        method: 'PATCH',
        body: { isActive },
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_VOUCHERS)
    return { ok: true, data: result.data }
}

export async function deleteVoucherAction(id: string): Promise<VoucherActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xóa voucher.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.VOUCHERS_DELETE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xóa voucher.' }
    }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.PROMOTION.ADMIN_VOUCHER_DETAIL(id), {
        token: actor.accessToken,
        method: 'DELETE',
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_VOUCHERS)
    return { ok: true, data: result.data }
}
