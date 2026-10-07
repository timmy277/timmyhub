'use server'

import { revalidatePath } from 'next/cache'

import type {
    ApiErrorCode,
    CategoryItem,
    CategoryListResult,
    CategoryQueryInput,
    CategorySummary,
    CreateCategoryInput,
    UpdateCategoryInput,
} from '@timmyhub/contracts'
import { CreateCategoryInputSchema, UpdateCategoryInputSchema } from '@timmyhub/contracts'

import { ADMIN_CATEGORY_PERMISSION, API_ROUTE, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type CategoryActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'

export type CategoryActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: CategoryActionFailureCode; message?: string }

function formatBackendErrorMessage(code: string, status: number): string {
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Bạn không có quyền quản lý danh mục sản phẩm (ADMIN).'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Máy chủ backend hiện không khả dụng. Vui lòng thử lại sau.'
    }
    return `Thao tác thất bại (${code}, status ${status})`
}

export async function listPublicCategoriesAction(): Promise<CategoryActionResult<CategorySummary[]>> {
    const result = await fetchBackend<CategorySummary[]>(API_ROUTE.CATALOG.CATEGORIES)
    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }
    return { ok: true, data: result.data }
}

export async function listAdminCategoriesAction(
    query?: CategoryQueryInput,
): Promise<CategoryActionResult<CategoryListResult>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem danh mục.' }
    }
    if (!actor.permissions.has(ADMIN_CATEGORY_PERMISSION.CREATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập danh mục sản phẩm.' }
    }

    const searchParams = new URLSearchParams()
    if (query?.page) searchParams.set('page', String(query.page))
    if (query?.pageSize) searchParams.set('pageSize', String(query.pageSize))
    if (query?.q) searchParams.set('q', query.q)
    if (query?.parentId) searchParams.set('parentId', query.parentId)
    if (query?.isActive !== undefined) searchParams.set('isActive', String(query.isActive))

    const queryString = searchParams.toString()
    const path = queryString
        ? `${API_ROUTE.CATALOG.ADMIN_CATEGORIES}?${queryString}`
        : API_ROUTE.CATALOG.ADMIN_CATEGORIES

    const result = await fetchBackend<CategoryListResult>(path, {
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

export async function getAdminCategoryDetailAction(id: string): Promise<CategoryActionResult<CategoryItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem chi tiết danh mục.' }
    }

    const result = await fetchBackend<CategoryItem>(API_ROUTE.CATALOG.ADMIN_CATEGORY_DETAIL(id), {
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

export async function createCategoryAction(input: CreateCategoryInput): Promise<CategoryActionResult<CategoryItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để tạo danh mục.' }
    }
    if (!actor.permissions.has(ADMIN_CATEGORY_PERMISSION.CREATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền tạo danh mục sản phẩm.' }
    }

    const parsed = CreateCategoryInputSchema.safeParse(input)
    if (!parsed.success) {
        return {
            ok: false,
            code: 'VALIDATION_FAILED',
            message: parsed.error.issues[0]?.message || 'Dữ liệu danh mục không hợp lệ.',
        }
    }

    const result = await fetchBackend<CategoryItem>(API_ROUTE.CATALOG.ADMIN_CATEGORIES, {
        method: 'POST',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_CATEGORIES)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function updateCategoryAction(
    id: string,
    input: UpdateCategoryInput,
): Promise<CategoryActionResult<CategoryItem>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để chỉnh sửa danh mục.' }
    }
    if (!actor.permissions.has(ADMIN_CATEGORY_PERMISSION.UPDATE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền chỉnh sửa danh mục.' }
    }

    const parsed = UpdateCategoryInputSchema.safeParse(input)
    if (!parsed.success) {
        return {
            ok: false,
            code: 'VALIDATION_FAILED',
            message: parsed.error.issues[0]?.message || 'Dữ liệu chỉnh sửa không hợp lệ.',
        }
    }

    const result = await fetchBackend<CategoryItem>(API_ROUTE.CATALOG.ADMIN_CATEGORY_DETAIL(id), {
        method: 'PATCH',
        body: parsed.data,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_CATEGORIES)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xoá danh mục.' }
    }
    if (!actor.permissions.has(ADMIN_CATEGORY_PERMISSION.DELETE)) {
        return { ok: false, code: 'FORBIDDEN', message: 'Bạn không có quyền xoá danh mục.' }
    }

    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.CATALOG.ADMIN_CATEGORY_DETAIL(id), {
        method: 'DELETE',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatBackendErrorMessage(result.code, result.status),
        }
    }

    revalidatePath(ROUTE.ADMIN_CATEGORIES)
    revalidatePath(ROUTE.PRODUCTS)
    return { ok: true, data: result.data }
}
