import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

import { ZodValidationPipe } from '@timmyhub/common'
import { ApiError, apiMessageKey, MEDIA_OWNER_TYPE, type MediaOwnerType } from '@timmyhub/contracts'
import type {
    ConfirmMediaUploadDto,
    CreatePresignedUrlDto,
    MediaAsset,
    MediaFilterDto,
    MediaListResponse,
    PresignedUrlResponse,
} from '@timmyhub/contracts'
import { ConfirmMediaUploadSchema, CreatePresignedUrlSchema, MediaFilterSchema } from '@timmyhub/contracts'
import { CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { MEDIA_ROUTE } from './media.constants'
import { MediaService } from './media.service'
import type { UploadFileInput } from './media.service'

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
    // ===== Dependencies =====
    constructor(private readonly mediaService: MediaService) {}

    // ===== Commands =====

    @ApiOperation({ summary: 'Direct multipart upload for one or multiple media files' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                ownerType: { type: 'string' },
                ownerId: { type: 'string' },
            },
        },
    })
    @Permissions('media:files:upload')
    @Post(MEDIA_ROUTE.UPLOAD)
    @UseInterceptors(FilesInterceptor('files', 10))
    async uploadFiles(
        @UploadedFiles() rawFiles: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>,
        @Body('ownerType') ownerType?: string,
        @Body('ownerId') ownerId?: string,
        @CurrentUser() user?: AuthUser,
    ): Promise<MediaAsset[]> {
        // Luật bảo mật: không cho anonymous fallback — phải có user xác thực
        if (!user) {
            throw new ApiError('UNAUTHORIZED', { messageKey: apiMessageKey('auth.missingAccessToken') })
        }
        const files: UploadFileInput[] = (rawFiles || []).map((f) => ({
            buffer: f.buffer,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
        }))

        return this.mediaService.uploadFiles(
            files,
            user.id,
            (ownerType as MediaOwnerType) ?? MEDIA_OWNER_TYPE.GENERAL,
            ownerId,
        )
    }

    @ApiOperation({ summary: 'Generate S3/Supabase presigned upload URL for direct upload' })
    @Permissions('media:files:upload')
    @Post(MEDIA_ROUTE.PRESIGNED_URL)
    @HttpCode(HttpStatus.OK)
    async createPresignedUrl(
        @Body(new ZodValidationPipe(CreatePresignedUrlSchema)) dto: CreatePresignedUrlDto,
        @CurrentUser() user?: AuthUser,
    ): Promise<PresignedUrlResponse> {
        if (!user) {
            throw new ApiError('UNAUTHORIZED', { messageKey: apiMessageKey('auth.missingAccessToken') })
        }
        return this.mediaService.createPresignedUrl(dto, user.id)
    }

    @ApiOperation({ summary: 'Confirm direct upload and activate media asset' })
    @Permissions('media:files:confirm')
    @Post(MEDIA_ROUTE.CONFIRM)
    @HttpCode(HttpStatus.OK)
    async confirmUpload(
        @Body(new ZodValidationPipe(ConfirmMediaUploadSchema)) dto: ConfirmMediaUploadDto,
    ): Promise<MediaAsset> {
        return this.mediaService.confirmUpload(dto)
    }

    // ===== Queries =====

    @ApiOperation({ summary: 'List media assets with filtering and pagination' })
    @Permissions('media:files:list')
    @Get()
    async listAssets(
        @Query(new ZodValidationPipe(MediaFilterSchema)) filters: MediaFilterDto,
    ): Promise<MediaListResponse> {
        return this.mediaService.listAssets(filters)
    }

    @ApiOperation({ summary: 'Get single media asset by ID' })
    @Permissions('media:files:read')
    @Get(MEDIA_ROUTE.BY_ID)
    async getAssetById(@Param('id') id: string): Promise<MediaAsset> {
        return this.mediaService.getAssetById(id)
    }

    @ApiOperation({ summary: 'Delete media asset' })
    @Permissions('media:files:delete:any')
    @Delete(MEDIA_ROUTE.BY_ID)
    async deleteAsset(@Param('id') id: string): Promise<MediaAsset> {
        return this.mediaService.deleteAsset(id)
    }
}
