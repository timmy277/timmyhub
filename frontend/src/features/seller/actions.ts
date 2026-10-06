'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CreateSellerApplicationInput,
    ReviewSellerApplicationInput,
    SellerApplicationDetail,
    SellerApplicationListResult,
    SellerApplicationQuery,
    SellerProfileDetail,
    UpdateSellerProfileInput,
} from '@timmyhub/contracts'
import {
    CreateSellerApplicationSchema,
    ReviewSellerApplicationSchema,
    SellerApplicationQuerySchema,
    UpdateSellerProfileSchema,
} from '@timmyhub/contracts'

import { API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type SellerActionFailureCode = ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'VALIDATION_FAILED'
export type SellerActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: SellerActionFailureCode; message?: string }

// Nộp đơn đăng ký bán hàng (FEAT-SEL-001)
export async function submitSellerApplicationAction(
    input: CreateSellerApplicationInput,
): Promise<SellerActionResult<SellerApplicationDetail>> {
    const parsed = CreateSellerApplicationSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerApplicationDetail>(API_ROUTE.SELLER.APPLICATIONS, {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_REGISTER)
    return { ok: true, data: result.data }
}

// Lấy lịch sử đơn đăng ký của user hiện tại (REQ-SEL-004)
export async function getMyApplicationsAction(): Promise<SellerActionResult<SellerApplicationDetail[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerApplicationDetail[]>(API_ROUTE.SELLER.APPLICATIONS_ME, {
        token: actor.accessToken,
    })

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Lấy thông tin shop của seller đang đăng nhập (REQ-SEL-020)
export async function getMyShopAction(): Promise<SellerActionResult<SellerProfileDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerProfileDetail>(API_ROUTE.SELLER.SHOP_ME, {
        token: actor.accessToken,
    })

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Cập nhật hồ sơ shop của seller (REQ-SEL-009)
export async function updateMyShopAction(
    input: UpdateSellerProfileInput,
): Promise<SellerActionResult<SellerProfileDetail>> {
    const parsed = UpdateSellerProfileSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerProfileDetail>(API_ROUTE.SELLER.SHOP_ME, {
        token: actor.accessToken,
        method: 'PATCH',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.SELLER_SETTINGS)
    return { ok: true, data: result.data }
}

// ===== Admin Actions =====

// Admin tra cứu danh sách đơn đăng ký
export async function listSellerApplicationsAdminAction(
    query: SellerApplicationQuery,
): Promise<SellerActionResult<SellerApplicationListResult>> {
    const parsed = SellerApplicationQuerySchema.safeParse(query)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const searchParams = new URLSearchParams()
    if (parsed.data.page) searchParams.set('page', String(parsed.data.page))
    if (parsed.data.pageSize) searchParams.set('pageSize', String(parsed.data.pageSize))
    if (parsed.data.status) searchParams.set('status', parsed.data.status)
    if (parsed.data.q) searchParams.set('q', parsed.data.q)

    const url = `${API_ROUTE.SELLER.ADMIN_APPLICATIONS}?${searchParams.toString()}`

    const result = await fetchBackend<SellerApplicationListResult>(url, {
        token: actor.accessToken,
    })

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Admin lấy chi tiết đơn đăng ký theo ID
export async function getSellerApplicationDetailAdminAction(
    applicationId: string,
): Promise<SellerActionResult<SellerApplicationDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerApplicationDetail>(
        API_ROUTE.SELLER.ADMIN_APPLICATION_DETAIL(applicationId),
        {
            token: actor.accessToken,
        },
    )

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Admin duyệt đơn đăng ký bán hàng (REQ-SEL-006)
export async function approveSellerApplicationAction(
    applicationId: string,
): Promise<SellerActionResult<SellerApplicationDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerApplicationDetail>(
        API_ROUTE.SELLER.ADMIN_APPLICATION_APPROVE(applicationId),
        {
            token: actor.accessToken,
            method: 'POST',
        },
    )

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_SELLER_APPLICATIONS)
    return { ok: true, data: result.data }
}

// Admin từ chối đơn đăng ký bán hàng kèm lý do (REQ-SEL-007)
export async function rejectSellerApplicationAction(
    applicationId: string,
    input: ReviewSellerApplicationInput,
): Promise<SellerActionResult<SellerApplicationDetail>> {
    const parsed = ReviewSellerApplicationSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerApplicationDetail>(
        API_ROUTE.SELLER.ADMIN_APPLICATION_REJECT(applicationId),
        {
            token: actor.accessToken,
            method: 'POST',
            body: parsed.data,
        },
    )

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_SELLER_APPLICATIONS)
    return { ok: true, data: result.data }
}
