'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CampaignProductItem,
    CreatePromotionCampaignInput,
    PromotionCampaignDetail,
    PromotionCampaignItem,
    PromotionCampaignListQuery,
    UpdatePromotionCampaignInput,
} from '@timmyhub/contracts'
import { CreatePromotionCampaignInputSchema, UpdatePromotionCampaignInputSchema } from '@timmyhub/contracts'

import { ADMIN_PROMOTION_PERMISSION, API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type CampaignActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'

export type CampaignActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: CampaignActionFailureCode; message?: string }

function formatBackendErrorMessage(code: string, status: number): string {
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Bạn không có quyền quản lý chiến dịch khuyến mãi (ADMIN).'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Máy chủ backend hiện không khả dụng. Vui lòng thử lại sau.'
    }
    return `Thao tác thất bại (${code}, status ${status})`
}

export async function listAdminCampaignsAction(
    query?: PromotionCampaignListQuery,
): Promise<CampaignActionResult<{ items: PromotionCampaignItem[]; total: number; page: number; pageSize: number }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem danh sách chiến dịch.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_LIST)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập quản lý chiến dịch.' }
    }

    const result = await fetchBackend<{
        items: PromotionCampaignItem[]
        total: number
        page: number
        pageSize: number
    }>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGNS, {
        token: actor.accessToken,
        query: {
            page: query?.page,
            pageSize: query?.pageSize,
            q: query?.q,
            type: query?.type,
            isActive: typeof query?.isActive === 'boolean' ? String(query.isActive) : undefined,
            ownerType: query?.ownerType,
        },
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

export async function getCampaignDetailAction(id: string): Promise<CampaignActionResult<PromotionCampaignDetail>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem chi tiết chiến dịch.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_LIST)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập quản lý chiến dịch.' }
    }

    const result = await fetchBackend<PromotionCampaignDetail>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGN_DETAIL(id), {
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

export async function createCampaignAction(
    input: CreatePromotionCampaignInput,
): Promise<CampaignActionResult<PromotionCampaignItem>> {
    try {
        const actor = await getActor()
        if (!actor) {
            return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để tạo chiến dịch.' }
        }
        if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_CREATE)) {
            return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạo chiến dịch.' }
        }

        const parsed = CreatePromotionCampaignInputSchema.safeParse(input)
        if (!parsed.success) {
            return {
                ok: false,
                code: 'VALIDATION_FAILED',
                message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
            }
        }

        const result = await fetchBackend<PromotionCampaignItem>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGNS, {
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

        revalidatePath(ROUTE.ADMIN_CAMPAIGNS)
        return { ok: true, data: result.data }
    } catch (error) {
        console.error('createCampaignAction error:', error)
        return {
            ok: false,
            code: 'BACKEND_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo chiến dịch.',
        }
    }
}

export async function updateCampaignAction(
    id: string,
    input: UpdatePromotionCampaignInput,
): Promise<CampaignActionResult<PromotionCampaignItem>> {
    try {
        const actor = await getActor()
        if (!actor) {
            return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để cập nhật chiến dịch.' }
        }
        if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_UPDATE)) {
            return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền cập nhật chiến dịch.' }
        }

        const parsed = UpdatePromotionCampaignInputSchema.safeParse(input)
        if (!parsed.success) {
            return {
                ok: false,
                code: 'VALIDATION_FAILED',
                message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ',
            }
        }

        const result = await fetchBackend<PromotionCampaignItem>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGN_DETAIL(id), {
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

        revalidatePath(ROUTE.ADMIN_CAMPAIGNS)
        return { ok: true, data: result.data }
    } catch (error) {
        console.error('updateCampaignAction error:', error)
        return {
            ok: false,
            code: 'BACKEND_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật chiến dịch.',
        }
    }
}

export async function toggleCampaignStatusAction(
    id: string,
    isActive: boolean,
): Promise<CampaignActionResult<PromotionCampaignItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để đổi trạng thái chiến dịch.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_UPDATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền đổi trạng thái chiến dịch.' }
    }

    const result = await fetchBackend<PromotionCampaignItem>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGN_STATUS(id), {
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

    revalidatePath(ROUTE.ADMIN_CAMPAIGNS)
    return { ok: true, data: result.data }
}

export async function deleteCampaignAction(id: string): Promise<CampaignActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xóa chiến dịch.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_DELETE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xóa chiến dịch.' }
    }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.PROMOTION.ADMIN_CAMPAIGN_DETAIL(id), {
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

    revalidatePath(ROUTE.ADMIN_CAMPAIGNS)
    return { ok: true, data: result.data }
}

export async function reviewCampaignProductAction(
    campaignId: string,
    productId: string,
    status: 'APPROVED' | 'REJECTED',
): Promise<CampaignActionResult<CampaignProductItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để duyệt sản phẩm.' }
    }
    if (!actor.permissions.has(ADMIN_PROMOTION_PERMISSION.CAMPAIGNS_APPROVE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền duyệt sản phẩm chiến dịch.' }
    }

    const result = await fetchBackend<CampaignProductItem>(
        API_ROUTE.PROMOTION.ADMIN_CAMPAIGN_PRODUCT_REVIEW(campaignId, productId),
        {
            token: actor.accessToken,
            method: 'PATCH',
            body: { status },
        },
    )

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_CAMPAIGNS)
    return { ok: true, data: result.data }
}
