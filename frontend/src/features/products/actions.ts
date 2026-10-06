'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CategorySummary,
    CreateProductInput,
    ProductDetail,
    ProductListResult,
    ProductQueryInput,
    ReviewProductInput,
    SuspendProductInput,
    UpdateProductInput,
} from '@timmyhub/contracts'
import {
    CreateProductInputSchema,
    ReviewProductSchema,
    SuspendProductSchema,
    UpdateProductInputSchema,
} from '@timmyhub/contracts'

import { ADMIN_PRODUCT_PERMISSION, API_ROUTE, ROUTE, SELLER_PRODUCT_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type ProductActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'
export type ProductActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: ProductActionFailureCode; message?: string }

function formatBackendErrorMessage(code: string, status: number): string {
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng xuất và đăng nhập lại.'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Tài khoản chưa được cấp quyền Quản lý sản phẩm (SELLER/ADMIN). Vui lòng đăng nhập tài khoản Người bán hoặc đăng ký mở gian hàng.'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Máy chủ backend hiện không khả dụng. Vui lòng kiểm tra lại dịch vụ.'
    }
    return `Không thể tải danh sách sản phẩm (${code}, status ${status})`
}

// ===== Public Actions =====

export async function listCategoriesAction(): Promise<ProductActionResult<CategorySummary[]>> {
    const result = await fetchBackend<CategorySummary[]>(API_ROUTE.CATALOG.CATEGORIES)
    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

export async function listPublicProductsAction(
    query?: ProductQueryInput,
): Promise<ProductActionResult<ProductListResult>> {
    const searchParams = new URLSearchParams()
    if (query?.page) searchParams.set('page', String(query.page))
    if (query?.pageSize) searchParams.set('pageSize', String(query.pageSize))
    if (query?.q) searchParams.set('q', query.q)
    if (query?.categoryId) searchParams.set('categoryId', query.categoryId)
    if (query?.shopId) searchParams.set('shopId', query.shopId)

    const path = `${API_ROUTE.CATALOG.PUBLIC_PRODUCTS}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const result = await fetchBackend<ProductListResult>(path)
    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

export async function getPublicProductDetailAction(idOrSlug: string): Promise<ProductActionResult<ProductDetail>> {
    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.PUBLIC_PRODUCT_DETAIL(idOrSlug))
    if (!result.ok) return { ok: false, code: result.code }
    return { ok: true, data: result.data }
}

export async function getProductDetailAction(id: string): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (actor) {
        if (actor.permissions.has(ADMIN_PRODUCT_PERMISSION.READ)) {
            const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_DETAIL(id), {
                token: actor.accessToken,
            })
            if (result.ok) return { ok: true, data: result.data }
        }
        if (await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.READ)) {
            const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.SELLER_PRODUCT_DETAIL(id), {
                token: actor.accessToken,
            })
            if (result.ok) return { ok: true, data: result.data }
        }
    }
    return getPublicProductDetailAction(id)
}

// ===== Seller Actions =====

async function checkSellerPermission(
    actor: NonNullable<Awaited<ReturnType<typeof getActor>>>,
    permission: string,
): Promise<boolean> {
    if (actor.permissions.has(permission)) return true
    const shopRes = await getMyShopAction()
    return Boolean(shopRes.ok && shopRes.data)
}

export async function createProductAction(input: CreateProductInput): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.CREATE))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạo sản phẩm.' }
    }

    const parsed = CreateProductInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.SELLER_PRODUCTS, {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function getMyProductsAction(query?: ProductQueryInput): Promise<ProductActionResult<ProductListResult>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.LIST))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xem danh sách sản phẩm.' }
    }

    const searchParams = new URLSearchParams()
    if (query?.page) searchParams.set('page', String(query.page))
    if (query?.pageSize) searchParams.set('pageSize', String(query.pageSize))
    if (query?.status) searchParams.set('status', query.status)
    if (query?.isSuspended !== undefined) searchParams.set('isSuspended', String(query.isSuspended))
    if (query?.q) searchParams.set('q', query.q)
    if (query?.categoryId) searchParams.set('categoryId', query.categoryId)

    const path = `${API_ROUTE.CATALOG.SELLER_PRODUCTS}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const result = await fetchBackend<ProductListResult>(path, {
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

export async function sellerUpdateProductAction(
    productId: string,
    input: UpdateProductInput,
): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.UPDATE))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền sửa sản phẩm.' }
    }

    const parsed = UpdateProductInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.SELLER_PRODUCT_DETAIL(productId), {
        token: actor.accessToken,
        method: 'PATCH',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function sellerDeleteProductAction(productId: string): Promise<ProductActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.DELETE))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xoá sản phẩm.' }
    }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.CATALOG.SELLER_PRODUCT_DETAIL(productId), {
        token: actor.accessToken,
        method: 'DELETE',
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function sellerSuspendProductAction(
    productId: string,
    input: SuspendProductInput,
): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.SUSPEND))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạm ngưng sản phẩm.' }
    }

    const parsed = SuspendProductSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.SELLER_PRODUCT_SUSPEND(productId), {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function sellerRestoreProductAction(productId: string): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!(await checkSellerPermission(actor, SELLER_PRODUCT_PERMISSION.RESTORE))) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền khôi phục sản phẩm.' }
    }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.SELLER_PRODUCT_RESTORE(productId), {
        token: actor.accessToken,
        method: 'POST',
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.SELLER_PORTAL)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

// ===== Admin Actions =====

export async function listAdminProductsAction(
    query?: ProductQueryInput,
): Promise<ProductActionResult<ProductListResult>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.LIST)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xem danh sách sản phẩm quản trị.' }
    }

    const searchParams = new URLSearchParams()
    if (query?.page) searchParams.set('page', String(query.page))
    if (query?.pageSize) searchParams.set('pageSize', String(query.pageSize))
    if (query?.status) searchParams.set('status', query.status)
    if (query?.isSuspended !== undefined) searchParams.set('isSuspended', String(query.isSuspended))
    if (query?.q) searchParams.set('q', query.q)
    if (query?.shopId) searchParams.set('shopId', query.shopId)
    if (query?.categoryId) searchParams.set('categoryId', query.categoryId)

    const path = `${API_ROUTE.CATALOG.ADMIN_PRODUCTS}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const result = await fetchBackend<ProductListResult>(path, {
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

export async function adminApproveProductAction(productId: string): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.APPROVE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền phê duyệt sản phẩm.' }
    }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_APPROVE(productId), {
        token: actor.accessToken,
        method: 'POST',
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}

export async function adminRejectProductAction(
    productId: string,
    input: ReviewProductInput,
): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.REJECT)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền từ chối sản phẩm.' }
    }

    const parsed = ReviewProductSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_REJECT(productId), {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}

export async function adminUpdateProductAction(
    productId: string,
    input: UpdateProductInput,
): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.UPDATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền sửa sản phẩm.' }
    }

    const parsed = UpdateProductInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_DETAIL(productId), {
        token: actor.accessToken,
        method: 'PATCH',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}

export async function adminDeleteProductAction(productId: string): Promise<ProductActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.DELETE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xoá sản phẩm.' }
    }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.CATALOG.ADMIN_PRODUCT_DETAIL(productId), {
        token: actor.accessToken,
        method: 'DELETE',
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}

export async function adminSuspendProductAction(
    productId: string,
    input: SuspendProductInput,
): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.SUSPEND)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạm ngưng sản phẩm.' }
    }

    const parsed = SuspendProductSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_SUSPEND(productId), {
        token: actor.accessToken,
        method: 'POST',
        body: parsed.data,
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}

export async function adminRestoreProductAction(productId: string): Promise<ProductActionResult<ProductDetail>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED' }
    if (!actor.permissions.has(ADMIN_PRODUCT_PERMISSION.RESTORE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền khôi phục sản phẩm.' }
    }

    const result = await fetchBackend<ProductDetail>(API_ROUTE.CATALOG.ADMIN_PRODUCT_RESTORE(productId), {
        token: actor.accessToken,
        method: 'POST',
    })

    if (!result.ok) return { ok: false, code: result.code }

    revalidatePath(ROUTE.ADMIN_PRODUCTS)
    return { ok: true, data: result.data }
}
