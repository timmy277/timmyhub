'use server'

import type {
    CreateReviewCommentInput,
    CreateReviewInput,
    PendingReviewItem,
    ProductRatingSummary,
    ReviewCommentItem,
    ReviewItem,
    ReviewListResult,
    ReviewQuery,
} from '@timmyhub/contracts'
import { API_ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message?: string }

function formatActionError(code: string, status: number, backendMsg?: string): string {
    if (backendMsg) return backendMsg
    if (code === 'UNAUTHORIZED' || status === 401) {
        return 'Vui lòng đăng nhập để thực hiện'
    }
    if (code === 'FORBIDDEN' || status === 403) {
        return 'Bạn không có quyền thực hiện thao tác này'
    }
    if (status === 400 || status === 422) {
        return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.'
    }
    if (status === 409) {
        return 'Bạn đã thực hiện đánh giá cho sản phẩm này rồi.'
    }
    if (status === 404) {
        return 'Không tìm thấy đánh giá hoặc sản phẩm'
    }
    if (code === 'BACKEND_UNAVAILABLE' || status === 0) {
        return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
    }
    return `Thao tác thất bại (${code})`
}

// 1. Lấy danh sách đánh giá của sản phẩm
export async function getProductReviewsAction(query: ReviewQuery): Promise<ActionResult<ReviewListResult>> {
    const actor = await getActor()

    const queryObj: Record<string, string | number | undefined> = {
        productId: query.productId,
        page: query.page,
        limit: query.limit,
        sort: query.sort,
    }
    if (query.rating) queryObj.rating = query.rating
    if (query.hasMedia !== undefined) queryObj.hasMedia = String(query.hasMedia)

    const result = await fetchBackend<ReviewListResult>(API_ROUTE.ENGAGEMENT.REVIEWS, {
        query: queryObj,
        token: actor?.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 2. Lấy thống kê số sao & điểm trung bình
export async function getProductRatingSummaryAction(productId: string): Promise<ActionResult<ProductRatingSummary>> {
    const result = await fetchBackend<ProductRatingSummary>(API_ROUTE.ENGAGEMENT.SUMMARY, {
        query: { productId },
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 3. Lấy danh sách sản phẩm chờ đánh giá của user
export async function getPendingReviewsAction(): Promise<ActionResult<PendingReviewItem[]>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' }

    const result = await fetchBackend<PendingReviewItem[]>(API_ROUTE.ENGAGEMENT.PENDING, {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 4. Tạo đánh giá mới (kèm ảnh/video)
export async function createReviewAction(input: CreateReviewInput): Promise<ActionResult<ReviewItem>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để đánh giá' }

    const result = await fetchBackend<ReviewItem>(API_ROUTE.ENGAGEMENT.REVIEWS, {
        method: 'POST',
        body: input,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 5. Phản hồi / bình luận đánh giá
export async function createCommentAction(
    reviewId: string,
    input: CreateReviewCommentInput,
): Promise<ActionResult<ReviewCommentItem>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để phản hồi' }

    const result = await fetchBackend<ReviewCommentItem>(API_ROUTE.ENGAGEMENT.COMMENTS(reviewId), {
        method: 'POST',
        body: input,
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}

// 6. Vote hữu ích
export async function toggleHelpfulAction(reviewId: string): Promise<ActionResult<{ voted: boolean; count: number }>> {
    const actor = await getActor()
    if (!actor) return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để bình chọn' }

    const result = await fetchBackend<{ voted: boolean; count: number }>(API_ROUTE.ENGAGEMENT.HELPFUL(reviewId), {
        method: 'POST',
        token: actor.accessToken,
    })

    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: formatActionError(result.code, result.status, result.message),
        }
    }
    return { ok: true, data: result.data }
}
