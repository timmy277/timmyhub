'use server'

import type { AddToCartInput, CartDetail, UpdateCartItemInput } from '@timmyhub/contracts'
import { AddToCartInputSchema, UpdateCartItemInputSchema } from '@timmyhub/contracts'
import { API_ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type CartActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message?: string }

function formatCartError(code: string, status: number): string {
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Vui lòng đăng nhập để thực hiện thao tác này'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Người bán không thể tự mua hoặc thêm sản phẩm của chính gian hàng mình'
    }
    if (code === 'CART_ITEM_INSUFFICIENT_STOCK' || status === 422) {
        return 'Số lượng yêu cầu vượt quá tồn kho khả dụng'
    }
    if (code === 'CART_ITEM_NOT_FOUND' || status === 404) {
        return 'Sản phẩm hoặc mặt hàng trong giỏ không tồn tại'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    }
    return `Thao tác giỏ hàng thất bại (${code})`
}

// REQ-CRT-001: Lấy giỏ hàng của user đang đăng nhập
export async function getCartAction(): Promise<CartActionResult<CartDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để xem giỏ hàng' }

    const result = await fetchBackend<CartDetail>(API_ROUTE.CART.ROOT, {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCartError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// REQ-CRT-002: Thêm sản phẩm vào giỏ hàng
export async function addToCartAction(input: AddToCartInput): Promise<CartActionResult<CartDetail>> {
    const parsed = AddToCartInputSchema.safeParse(input)
    if (!parsed.success) {
        return { ok: false, code: 'VALIDATION_FAILED', message: 'Dữ liệu thêm vào giỏ không hợp lệ' }
    }

    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng' }
    }

    const result = await fetchBackend<CartDetail>(API_ROUTE.CART.ITEMS, {
        method: 'POST',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCartError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// REQ-CRT-004: Sửa số lượng item trong giỏ
export async function updateCartItemAction(
    itemId: string,
    input: UpdateCartItemInput,
): Promise<CartActionResult<CartDetail>> {
    const parsed = UpdateCartItemInputSchema.safeParse(input)
    if (!parsed.success) {
        return { ok: false, code: 'VALIDATION_FAILED', message: 'Số lượng không hợp lệ' }
    }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<CartDetail>(API_ROUTE.CART.ITEM(itemId), {
        method: 'PATCH',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCartError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// REQ-CRT-005: Xoá item khỏi giỏ
export async function removeCartItemAction(itemId: string): Promise<CartActionResult<CartDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<CartDetail>(API_ROUTE.CART.ITEM(itemId), {
        method: 'DELETE',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCartError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// Làm trống giỏ hàng
export async function clearCartAction(): Promise<CartActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.CART.ROOT, {
        method: 'DELETE',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCartError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}
