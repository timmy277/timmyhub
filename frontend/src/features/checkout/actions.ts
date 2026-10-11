'use server'

import type {
    AddressDetail,
    CheckoutInput,
    CheckoutResult,
    CreateAddressInput,
    OrderDetail,
    UpdateAddressInput,
    ValidateVoucherInput,
    ValidateVoucherResult,
    VoucherItem,
} from '@timmyhub/contracts'
import { CheckoutInputSchema, CreateAddressInputSchema, UpdateAddressInputSchema } from '@timmyhub/contracts'
import { API_ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type CheckoutActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message?: string }

function formatCheckoutError(code: string, status: number, backendMsg?: string): string {
    if (backendMsg) return backendMsg
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Vui lòng đăng nhập để thực hiện thanh toán'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Bạn không có quyền thực hiện thao tác này'
    }
    if (status === 400 || status === 422) {
        return 'Thông tin thanh toán hoặc giỏ hàng không hợp lệ. Vui lòng kiểm tra lại.'
    }
    if (status === 404) {
        return 'Không tìm thấy địa chỉ hoặc sản phẩm cần thanh toán'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    }
    return `Thao tác thất bại (${code})`
}

// 1. Lấy danh sách địa chỉ nhận hàng
export async function getAddressesAction(): Promise<CheckoutActionResult<AddressDetail[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để xem địa chỉ' }

    const result = await fetchBackend<AddressDetail[]>(API_ROUTE.ADDRESS.ROOT, {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCheckoutError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// 2. Thêm địa chỉ mới
export async function createAddressAction(input: CreateAddressInput): Promise<CheckoutActionResult<AddressDetail>> {
    const parsed = CreateAddressInputSchema.safeParse(input)
    if (!parsed.success) {
        return { ok: false, code: 'VALIDATION_FAILED', message: 'Dữ liệu địa chỉ không hợp lệ' }
    }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<AddressDetail>(API_ROUTE.ADDRESS.ROOT, {
        method: 'POST',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCheckoutError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// 3. Cập nhật địa chỉ
export async function updateAddressAction(
    id: string,
    input: UpdateAddressInput,
): Promise<CheckoutActionResult<AddressDetail>> {
    const parsed = UpdateAddressInputSchema.safeParse(input)
    if (!parsed.success) {
        return { ok: false, code: 'VALIDATION_FAILED', message: 'Dữ liệu địa chỉ không hợp lệ' }
    }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<AddressDetail>(API_ROUTE.ADDRESS.DETAIL(id), {
        method: 'PATCH',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCheckoutError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// 4. Xóa địa chỉ
export async function deleteAddressAction(id: string): Promise<CheckoutActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.ADDRESS.DETAIL(id), {
        method: 'DELETE',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCheckoutError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// 5. Đặt làm địa chỉ mặc định
export async function setDefaultAddressAction(id: string): Promise<CheckoutActionResult<AddressDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<AddressDetail>(API_ROUTE.ADDRESS.DEFAULT(id), {
        method: 'PATCH',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: formatCheckoutError(result.code, result.status) }
    }
    return { ok: true, data: result.data }
}

// 6. Đặt hàng / Checkout
export async function checkoutAction(input: CheckoutInput): Promise<CheckoutActionResult<CheckoutResult>> {
    const parsed = CheckoutInputSchema.safeParse(input)
    if (!parsed.success) {
        return { ok: false, code: 'VALIDATION_FAILED', message: 'Dữ liệu thanh toán không hợp lệ' }
    }

    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thanh toán' }

    const result = await fetchBackend<CheckoutResult>(API_ROUTE.ORDER.CHECKOUT, {
        method: 'POST',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 7. Lấy chi tiết đơn hàng
export async function getOrderByIdAction(orderId: string): Promise<CheckoutActionResult<OrderDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<OrderDetail>(API_ROUTE.ORDER.DETAIL(orderId), {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 8. Lấy danh sách đơn hàng của tôi
export async function getMyOrdersAction(status?: string): Promise<CheckoutActionResult<OrderDetail[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<OrderDetail[]>(API_ROUTE.ORDER.ROOT, {
        query: status ? { status } : undefined,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 9. Huỷ đơn hàng
export async function cancelOrderAction(orderId: string, reason?: string): Promise<CheckoutActionResult<OrderDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<OrderDetail>(API_ROUTE.ORDER.CANCEL(orderId), {
        method: 'PATCH',
        body: { reason },
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 10. Xác thực & tính toán voucher cho checkout
export async function validateVoucherAction(
    input: ValidateVoucherInput,
): Promise<CheckoutActionResult<ValidateVoucherResult>> {
    const actor = await getActor()
    const result = await fetchBackend<ValidateVoucherResult>(API_ROUTE.PROMOTION.VALIDATE_VOUCHER, {
        method: 'POST',
        body: input,
        token: actor?.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 11. Lấy danh sách voucher khả dụng
export async function getAvailableVouchersAction(subtotal?: number): Promise<CheckoutActionResult<VoucherItem[]>> {
    const actor = await getActor()
    const result = await fetchBackend<VoucherItem[]>(API_ROUTE.PROMOTION.AVAILABLE_VOUCHERS, {
        query: subtotal !== undefined ? { subtotal } : undefined,
        token: actor?.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatCheckoutError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}
