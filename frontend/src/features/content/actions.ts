'use server'

import type {
    ApiErrorCode,
    CreateVideoPostInput,
    PostCommentDto,
    UpdateVideoPostInput,
    VideoFeedResponseDto,
    VideoPostDto,
} from '@timmyhub/contracts'

export interface SellerVideosResponse {
    items: VideoPostDto[]
    total: number
    page: number
    limit: number
    totalPages: number
}

import { API_ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type ContentActionFailureCode =
    ApiErrorCode | 'BACKEND_UNAVAILABLE' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_FAILED'

export type ContentActionResult<T = undefined> =
    { ok: true; data: T } | { ok: false; code: ContentActionFailureCode; message?: string }

// ===== Public Feed Actions =====

/**
 * Lấy danh sách video cộng đồng cho trang chủ hoặc màn hình feeds (hỗ trợ random)
 */
export async function getVideoFeedAction(params?: {
    limit?: number
    excludeId?: string
    random?: boolean
}): Promise<ContentActionResult<VideoFeedResponseDto>> {
    const actor = await getActor()
    const result = await fetchBackend<VideoFeedResponseDto>(API_ROUTE.CONTENT.FEED, {
        token: actor?.accessToken,
        query: {
            limit: params?.limit,
            excludeId: params?.excludeId,
            random: params?.random ? 'true' : undefined,
        },
    })
    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: 'Không thể tải danh sách video',
        }
    }
    return { ok: true, data: result.data }
}

/**
 * Lấy thông tin chi tiết một video bài đăng
 */
export async function getVideoDetailAction(id: string): Promise<ContentActionResult<VideoPostDto>> {
    const actor = await getActor()
    const result = await fetchBackend<VideoPostDto>(API_ROUTE.CONTENT.VIDEO_DETAIL(id), {
        token: actor?.accessToken,
    })
    if (!result.ok) {
        return {
            ok: false,
            code: result.code,
            message: 'Không thể tải chi tiết video',
        }
    }
    return { ok: true, data: result.data }
}

/**
 * Ghi nhận lượt xem video
 */
export async function recordVideoViewAction(
    id: string,
): Promise<ContentActionResult<{ id: string; viewCount: number }>> {
    const result = await fetchBackend<{ id: string; viewCount: number }>(API_ROUTE.CONTENT.VIEW(id), {
        method: 'POST',
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể ghi nhận lượt xem' }
    }
    return { ok: true, data: result.data }
}

/**
 * Thích hoặc bỏ thích video (yêu cầu đăng nhập)
 */
export async function toggleVideoLikeAction(
    id: string,
): Promise<ContentActionResult<{ liked: boolean; likeCount: number }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để thích video' }
    }
    const result = await fetchBackend<{ liked: boolean; likeCount: number }>(API_ROUTE.CONTENT.LIKE(id), {
        token: actor.accessToken,
        method: 'POST',
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể thực hiện thao tác thích' }
    }
    return { ok: true, data: result.data }
}

/**
 * Lấy danh sách bình luận của video
 */
export async function getVideoCommentsAction(postId: string): Promise<ContentActionResult<PostCommentDto[]>> {
    const result = await fetchBackend<PostCommentDto[]>(API_ROUTE.CONTENT.COMMENTS(postId))
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể tải bình luận' }
    }
    return { ok: true, data: result.data }
}

/**
 * Gửi bình luận mới vào video (yêu cầu đăng nhập)
 */
export async function createVideoCommentAction(
    postId: string,
    content: string,
): Promise<ContentActionResult<PostCommentDto>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để bình luận' }
    }
    const result = await fetchBackend<PostCommentDto>(API_ROUTE.CONTENT.COMMENTS(postId), {
        token: actor.accessToken,
        method: 'POST',
        body: { content },
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể gửi bình luận' }
    }
    return { ok: true, data: result.data }
}

// ===== Seller Video Management Actions =====

/**
 * Lấy danh sách video của người bán hiện tại
 */
export async function getSellerVideosAction(params?: {
    page?: number
    limit?: number
    status?: string
}): Promise<ContentActionResult<SellerVideosResponse>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản người bán' }
    }
    const result = await fetchBackend<SellerVideosResponse>(API_ROUTE.CONTENT.SELLER_VIDEOS, {
        token: actor.accessToken,
        query: {
            page: params?.page,
            limit: params?.limit,
            status: params?.status,
        },
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể tải danh sách video của gian hàng' }
    }
    return { ok: true, data: result.data }
}

/**
 * Đăng tải video bài viết mới cho gian hàng
 */
export async function createSellerVideoAction(data: CreateVideoPostInput): Promise<ContentActionResult<VideoPostDto>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản người bán' }
    }
    const result = await fetchBackend<VideoPostDto>(API_ROUTE.CONTENT.SELLER_VIDEOS, {
        token: actor.accessToken,
        method: 'POST',
        body: data,
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể tạo bài đăng video' }
    }
    return { ok: true, data: result.data }
}

/**
 * Cập nhật thông tin video của gian hàng
 */
export async function updateSellerVideoAction(
    id: string,
    data: UpdateVideoPostInput,
): Promise<ContentActionResult<VideoPostDto>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản người bán' }
    }
    const result = await fetchBackend<VideoPostDto>(API_ROUTE.CONTENT.SELLER_VIDEO_DETAIL(id), {
        token: actor.accessToken,
        method: 'PATCH',
        body: data,
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể cập nhật bài đăng video' }
    }
    return { ok: true, data: result.data }
}

/**
 * Xóa video của gian hàng
 */
export async function deleteSellerVideoAction(id: string): Promise<ContentActionResult<{ success: boolean }>> {
    const actor = await getActor()
    if (!actor) {
        return { ok: false, code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản người bán' }
    }
    const result = await fetchBackend<{ success: boolean }>(API_ROUTE.CONTENT.SELLER_VIDEO_DETAIL(id), {
        token: actor.accessToken,
        method: 'DELETE',
    })
    if (!result.ok) {
        return { ok: false, code: result.code, message: 'Không thể xóa bài đăng video' }
    }
    return { ok: true, data: result.data }
}
