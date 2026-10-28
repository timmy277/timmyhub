import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'

import { ZodValidationPipe } from '@timmyhub/common'
import type {
    CreateVideoPostInput,
    UpdateVideoPostInput,
    VideoFeedResponseDto,
    VideoPostDto,
} from '@timmyhub/contracts'
import { CreateVideoPostSchema, UpdateVideoPostSchema } from '@timmyhub/contracts'
import { AuthenticatedOnly, CurrentUser, Public } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { CONTENT_PAGINATION } from './content.constants'
import { ContentService } from './content.service'

/**
 * Controller xử lý video feeds công khai và tương tác người dùng
 * FEAT-PST-001, FEAT-PST-002
 */
@Controller('v1/feed')
export class ContentFeedController {
    constructor(private readonly contentService: ContentService) {}

    /**
     * Lấy danh sách video feeds công khai (hỗ trợ random cho trang chủ)
     */
    @Public()
    @Get('videos')
    getVideoFeed(
        @Query('limit') limit?: string,
        @Query('excludeId') excludeId?: string,
        @Query('random') random?: string,
        @CurrentUser() user?: AuthUser,
    ): Promise<VideoFeedResponseDto> {
        const parsedLimit = limit ? Number.parseInt(limit, 10) : CONTENT_PAGINATION.DEFAULT_LIMIT
        const isRandom = random === 'true' || random === '1'
        return this.contentService.getVideoFeed(parsedLimit, excludeId, user?.id, isRandom)
    }

    /**
     * Ghi nhận lượt xem video
     */
    @Public()
    @Post('videos/:id/view')
    recordView(@Param('id') id: string): Promise<{ id: string; viewCount: number }> {
        return this.contentService.recordView(id)
    }

    /**
     * Thích hoặc bỏ thích video (yêu cầu đăng nhập)
     */
    @AuthenticatedOnly()
    @Post('videos/:id/like')
    toggleLike(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<{ liked: boolean; likeCount: number }> {
        return this.contentService.toggleLike(id, user.id)
    }

    /**
     * Lấy chi tiết một video bài đăng
     */
    @Public()
    @Get('videos/:id')
    getVideoById(@Param('id') id: string, @CurrentUser() user?: AuthUser): Promise<VideoPostDto> {
        return this.contentService.getVideoById(id, user?.id)
    }

    /**
     * Lấy danh sách bình luận của video
     */
    @Public()
    @Get('videos/:id/comments')
    getComments(@Param('id') id: string) {
        return this.contentService.getComments(id)
    }

    /**
     * Thêm bình luận vào video (yêu cầu đăng nhập)
     */
    @AuthenticatedOnly()
    @Post('videos/:id/comments')
    addComment(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() body: { content: string; parentId?: string },
    ) {
        return this.contentService.addComment(id, user.id, body.content, body.parentId)
    }
}

/**
 * Controller dành cho người bán quản lý video bán hàng
 * FEAT-PST-003, FEAT-PST-004
 */
@Controller('v1/seller/posts')
export class ContentSellerController {
    constructor(private readonly contentService: ContentService) {}

    /**
     * Lấy danh sách video đã đăng của shop mình
     */
    @AuthenticatedOnly()
    @Get('videos')
    getMyVideos(
        @CurrentUser() user: AuthUser,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = page ? Number.parseInt(page, 10) : CONTENT_PAGINATION.DEFAULT_PAGE
        const l = limit ? Number.parseInt(limit, 10) : CONTENT_PAGINATION.DEFAULT_LIMIT
        return this.contentService.getSellerVideos(user.id, status, p, l)
    }

    /**
     * Đăng video bán hàng mới
     */
    @AuthenticatedOnly()
    @Post('videos')
    createVideo(
        @CurrentUser() user: AuthUser,
        @Body(new ZodValidationPipe(CreateVideoPostSchema)) body: CreateVideoPostInput,
    ): Promise<VideoPostDto> {
        return this.contentService.createSellerVideo(user.id, body)
    }

    /**
     * Cập nhật video bán hàng
     */
    @AuthenticatedOnly()
    @Patch('videos/:id')
    updateVideo(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateVideoPostSchema)) body: UpdateVideoPostInput,
    ): Promise<VideoPostDto> {
        return this.contentService.updateSellerVideo(user.id, id, body)
    }

    /**
     * Xóa video bán hàng
     */
    @AuthenticatedOnly()
    @Delete('videos/:id')
    deleteVideo(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ success: boolean }> {
        return this.contentService.deleteSellerVideo(user.id, id)
    }
}
