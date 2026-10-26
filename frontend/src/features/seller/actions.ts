'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CreateSellerApplicationInput,
    CreateWithdrawalInput,
    DashboardRange,
    OrderDetail,
    PublicShopDetail,
    ReviewSellerApplicationInput,
    SellerApplicationDetail,
    SellerApplicationListResult,
    SellerApplicationQuery,
    SellerDashboardOverviewResponse,
    SellerProfileDetail,
    UpdateOrderStatusInput,
    UpdateSellerProfileInput,
    WalletDetail,
    WithdrawalDetail,
} from '@timmyhub/contracts'
import {
    CreateSellerApplicationSchema,
    CreateWithdrawalInputSchema,
    ReviewSellerApplicationSchema,
    SellerApplicationQuerySchema,
    UpdateOrderStatusInputSchema,
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

// Lấy thông tin shop công khai theo slug hoặc ID (REQ-SEL-011)
export async function getPublicShopAction(slugOrId: string): Promise<SellerActionResult<PublicShopDetail>> {
    const result = await fetchBackend<PublicShopDetail>(API_ROUTE.SELLER.PUBLIC_SHOP(slugOrId))
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

// Lấy danh sách đơn hàng của Shop người bán
export async function getSellerOrdersAction(status?: string): Promise<SellerActionResult<OrderDetail[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<OrderDetail[]>(API_ROUTE.ORDER.SELLER_ORDERS, {
        query: status && status !== 'ALL' ? { status } : undefined,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.status === 403 ? 'FORBIDDEN' : result.status === 401 ? 'UNAUTHORIZED' : result.code,
        }
    }
    return { ok: true, data: result.data }
}

// Người bán cập nhật trạng thái đơn hàng
export async function updateSellerOrderStatusAction(
    orderId: string,
    input: UpdateOrderStatusInput,
): Promise<SellerActionResult<OrderDetail>> {
    const parsed = UpdateOrderStatusInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<OrderDetail>(API_ROUTE.ORDER.SELLER_UPDATE_STATUS(orderId), {
        token: actor.accessToken,
        method: 'PATCH',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_ORDERS)
    return { ok: true, data: result.data }
}

// Lấy thông tin ví và lịch sử giao dịch của Shop (FEAT-WAL-001)
export async function getSellerWalletAction(): Promise<SellerActionResult<WalletDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<WalletDetail>(API_ROUTE.SELLER.WALLET, {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.status === 403 ? 'FORBIDDEN' : result.status === 401 ? 'UNAUTHORIZED' : result.code,
        }
    }
    return { ok: true, data: result.data }
}

// Gửi yêu cầu rút tiền về tài khoản ngân hàng (FEAT-WAL-005)
export async function requestWithdrawalAction(
    input: CreateWithdrawalInput,
): Promise<SellerActionResult<WithdrawalDetail>> {
    const parsed = CreateWithdrawalInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<WithdrawalDetail>(API_ROUTE.SELLER.WALLET_WITHDRAW, {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    return { ok: true, data: result.data }
}

// Lấy danh sách yêu cầu rút tiền của shop
export async function getSellerWithdrawalsAction(): Promise<SellerActionResult<WithdrawalDetail[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<WithdrawalDetail[]>(API_ROUTE.SELLER.WALLET_WITHDRAWALS, {
        token: actor.accessToken,
    })

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Admin: Xem danh sách yêu cầu rút tiền
export async function listAdminWithdrawalsAction(
    status?: string,
    page = 1,
    limit = 20,
): Promise<SellerActionResult<{ items: (WithdrawalDetail & { shopName?: string })[]; total: number }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    params.set('page', String(page))
    params.set('limit', String(limit))

    const endpoint = `${API_ROUTE.SELLER.ADMIN_WITHDRAWALS}?${params.toString()}`
    const result = await fetchBackend<{ items: (WithdrawalDetail & { shopName?: string })[]; total: number }>(
        endpoint,
        {
            token: actor.accessToken,
        },
    )

    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

// Admin: Duyệt chi yêu cầu rút tiền
export async function approveWithdrawalAction(withdrawalId: string): Promise<SellerActionResult<WithdrawalDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<WithdrawalDetail>(API_ROUTE.SELLER.ADMIN_WITHDRAWAL_APPROVE(withdrawalId), {
        token: actor.accessToken,
        method: 'POST',
    })

    if (!result.ok) return { ok: false, code: result.code }
    revalidatePath('/withdrawals')
    return { ok: true, data: result.data }
}

// Admin: Từ chối yêu cầu rút tiền kèm lý do
export async function rejectWithdrawalAction(
    withdrawalId: string,
    reason: string,
): Promise<SellerActionResult<WithdrawalDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<WithdrawalDetail>(API_ROUTE.SELLER.ADMIN_WITHDRAWAL_REJECT(withdrawalId), {
        token: actor.accessToken,
        method: 'POST',
        body: { reason },
    })

    if (!result.ok) return { ok: false, code: result.code }
    revalidatePath('/withdrawals')
    return { ok: true, data: result.data }
}

// Lấy số liệu phân tích tổng quan cho kênh người bán
export async function getSellerDashboardOverviewAction(
    range: DashboardRange = '30d',
): Promise<SellerActionResult<SellerDashboardOverviewResponse>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }

    const result = await fetchBackend<SellerDashboardOverviewResponse>(
        API_ROUTE.ANALYTICS.SELLER_DASHBOARD_OVERVIEW(range),
        {
            token: actor.accessToken,
            method: 'GET',
        },
    )

    if (!result.ok) {
        return { ok: false, code: result.code, message: result.message }
    }

    return { ok: true, data: result.data }
}
