import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'

import {
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_VIDEO_MIME_TYPES,
    ALLOWED_ALL_MIME_TYPES,
    CreatePresignedUrlDto,
    ConfirmMediaUploadDto,
    MAX_IMAGE_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
    MEDIA_OWNER_TYPE,
    MEDIA_STATUS,
    MEDIA_TYPE,
    MediaAsset,
    MediaFilterDto,
    MediaListResponse,
    type MediaOwnerType,
    PresignedUrlResponse,
} from '@timmyhub/contracts'

import { MEDIA_EVENT } from './media.constants'
import { MediaRepository, UpdateMediaAssetInput } from './media.repository'
import { StorageService } from './storage.service'

export interface UploadFileInput {
    buffer: Buffer
    originalname: string
    mimetype: string
    size: number
}

@Injectable()
export class MediaService {
    // ===== Dependencies =====
    constructor(
        private readonly mediaRepository: MediaRepository,
        private readonly storageService: StorageService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ===== Commands =====
    async uploadFiles(
        files: UploadFileInput[],
        actorId: string,
        ownerType: MediaOwnerType = MEDIA_OWNER_TYPE.GENERAL,
        ownerId?: string,
    ): Promise<MediaAsset[]> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided for upload')
        }

        const results: MediaAsset[] = []

        for (const file of files) {
            this.validateFile(file.mimetype, file.size)

            const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype)
            const mediaType = isVideo ? MEDIA_TYPE.VIDEO : MEDIA_TYPE.IMAGE
            const ext = path.extname(file.originalname).toLowerCase() || (isVideo ? '.mp4' : '.jpg')
            const uniqueKey = `${mediaType.toLowerCase()}s/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${randomUUID()}${ext}`

            const publicUrl = await this.storageService.uploadFile({
                key: uniqueKey,
                buffer: file.buffer,
                mimeType: file.mimetype,
            })

            const asset = await this.mediaRepository.createAsset({
                ownerId: ownerId || actorId,
                ownerType,
                type: mediaType,
                status: MEDIA_STATUS.READY,
                originalUrl: publicUrl,
                // Ảnh dùng originalUrl làm thumbnail tạm, video cần transcode mới có thumbnail riêng
                thumbnailUrl: isVideo ? null : publicUrl,
                sizeBytes: file.size,
            })

            this.eventEmitter.emit(MEDIA_EVENT.ASSET_CREATED, asset)
            results.push(asset)
        }

        return results
    }

    /**
     * Tạo presigned URL cho client upload thẳng lên S3/Supabase (bỏ qua server).
     * Asset được tạo ngay với status UPLOADING, sau khi client PUT xong sẽ gọi confirmUpload.
     */
    async createPresignedUrl(dto: CreatePresignedUrlDto, actorId: string): Promise<PresignedUrlResponse> {
        this.validateFile(dto.mimeType, dto.sizeBytes)

        const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(dto.mimeType)
        const mediaType = isVideo ? MEDIA_TYPE.VIDEO : MEDIA_TYPE.IMAGE
        const ext = path.extname(dto.filename).toLowerCase() || (isVideo ? '.mp4' : '.jpg')
        const uniqueKey = `${mediaType.toLowerCase()}s/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${randomUUID()}${ext}`

        // Khi không có S3 (local dev fallback), không tạo asset record trong DB ở bước này
        // để tránh sinh orphan record (endpoint /media/upload sẽ tạo record READY thực tế).
        if (!this.storageService.isConfigured) {
            const presignedResult = await this.storageService.getPresignedUploadUrl(uniqueKey, dto.mimeType)
            return {
                assetId: 'local-fallback',
                uploadUrl: presignedResult.uploadUrl,
                publicUrl: presignedResult.publicUrl,
                key: uniqueKey,
                headers: presignedResult.headers,
                expiresInSeconds: presignedResult.expiresInSeconds,
            }
        }

        // Create asset record in UPLOADING status for S3 direct upload
        const asset = await this.mediaRepository.createAsset({
            ownerId: dto.ownerId || actorId,
            ownerType: dto.ownerType || MEDIA_OWNER_TYPE.GENERAL,
            type: mediaType,
            status: MEDIA_STATUS.UPLOADING,
            sizeBytes: dto.sizeBytes,
        })

        const presignedResult = await this.storageService.getPresignedUploadUrl(uniqueKey, dto.mimeType)

        return {
            assetId: asset.id,
            uploadUrl: presignedResult.uploadUrl,
            publicUrl: presignedResult.publicUrl,
            key: uniqueKey,
            headers: presignedResult.headers,
            expiresInSeconds: presignedResult.expiresInSeconds,
        }
    }

    /**
     * Đánh dấu asset là READY sau khi client PUT thành công — nguồn sự thật URL cuối cùng
     * lấy từ client vì server không biết URL thực tế của S3/Supabase presigned.
     */
    async confirmUpload(dto: ConfirmMediaUploadDto): Promise<MediaAsset> {
        const asset = await this.mediaRepository.findAssetById(dto.assetId)
        if (!asset) {
            throw new NotFoundException(`Media asset with ID "${dto.assetId}" not found`)
        }

        const updatePayload: UpdateMediaAssetInput = {
            status: MEDIA_STATUS.READY,
            originalUrl: dto.publicUrl,
        }
        if (asset.type === MEDIA_TYPE.IMAGE) {
            updatePayload.thumbnailUrl = dto.publicUrl
        } else if (asset.thumbnailUrl) {
            updatePayload.thumbnailUrl = asset.thumbnailUrl
        }
        if (dto.sizeBytes !== undefined) updatePayload.sizeBytes = dto.sizeBytes
        if (dto.width !== undefined) updatePayload.width = dto.width
        if (dto.height !== undefined) updatePayload.height = dto.height
        if (dto.durationMs !== undefined) updatePayload.durationMs = dto.durationMs

        const updated = await this.mediaRepository.updateAsset(dto.assetId, updatePayload)

        this.eventEmitter.emit(MEDIA_EVENT.ASSET_CREATED, updated)
        return updated
    }

    // ===== Queries =====

    /**
     * Lấy một asset theo ID, ném 404 nếu không tồn tại.
     */
    async getAssetById(id: string): Promise<MediaAsset> {
        const asset = await this.mediaRepository.findAssetById(id)
        if (!asset) {
            throw new NotFoundException(`Media asset with ID "${id}" not found`)
        }
        return asset
    }

    /**
     * Truy vấn danh sách asset có phân trang và bộ lọc.
     */
    async listAssets(filters: MediaFilterDto): Promise<MediaListResponse> {
        const { items, total } = await this.mediaRepository.listAssets(filters)
        const limit = filters.limit || 20
        const page = filters.page || 1
        const totalPages = Math.ceil(total / limit) || 1

        return {
            data: items,
            total,
            page,
            limit,
            totalPages,
        }
    }

    /**
     * Deletes media asset from storage and DB.
     */
    async deleteAsset(id: string): Promise<MediaAsset> {
        const asset = await this.mediaRepository.findAssetById(id)
        if (!asset) {
            throw new NotFoundException(`Media asset with ID "${id}" not found`)
        }

        if (asset.originalUrl) {
            // Extract key from URL or path
            const parts = asset.originalUrl.split('/')
            const key = parts.slice(parts.indexOf('uploads') + 1).join('/')
            if (key) {
                await this.storageService.deleteFile(key)
            }
        }

        const deleted = await this.mediaRepository.deleteAsset(id)
        this.eventEmitter.emit(MEDIA_EVENT.ASSET_DELETED, deleted)
        return deleted
    }

    // ===== Private helpers =====

    /**
     * Kiểm tra MIME type và dung lượng — tập trung validation để tránh lặp lại
     * ở cả uploadFiles lẫn createPresignedUrl.
     */
    private validateFile(mimeType: string, sizeBytes: number): void {
        if (!(ALLOWED_ALL_MIME_TYPES as readonly string[]).includes(mimeType)) {
            throw new BadRequestException(
                `Unsupported MIME type "${mimeType}". Allowed: ${ALLOWED_ALL_MIME_TYPES.join(', ')}`,
            )
        }

        const isImage = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
        const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)

        if (isImage && sizeBytes > MAX_IMAGE_SIZE_BYTES) {
            throw new BadRequestException(
                `Image size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds maximum allowed size of ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
            )
        }

        if (isVideo && sizeBytes > MAX_VIDEO_SIZE_BYTES) {
            throw new BadRequestException(
                `Video size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds maximum allowed size of ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB`,
            )
        }
    }
}
