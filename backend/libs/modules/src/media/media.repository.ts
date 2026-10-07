import { Injectable } from '@nestjs/common'

import {
    MEDIA_STATUS,
    type MediaAsset,
    type MediaFilterDto,
    type MediaOwnerType,
    type MediaStatus as MediaStatusType,
    type MediaType,
} from '@timmyhub/contracts'
import { Prisma, PrismaService } from '@timmyhub/prisma'

export interface CreateMediaAssetInput {
    id?: string
    ownerId: string
    ownerType: MediaOwnerType
    type: MediaType
    status?: MediaStatusType
    originalUrl?: string | null
    thumbnailUrl?: string | null
    sizeBytes?: number | null
    width?: number | null
    height?: number | null
    durationMs?: number | null
}

export interface UpdateMediaAssetInput {
    status?: MediaStatusType
    originalUrl?: string | null
    thumbnailUrl?: string | null
    hlsMasterUrl?: string | null
    sizeBytes?: number | null
    width?: number | null
    height?: number | null
    durationMs?: number | null
    failReason?: string | null
}

// Helper: map Prisma MediaAsset (có Date fields) sang MediaAsset contract (có ISO string fields)
// Prisma schema dùng String cho ownerType/type/status; contracts dùng union type — cast an toàn vì
// dữ liệu luôn đi qua Zod validation khi tạo.
function toMediaAsset(asset: Prisma.MediaAssetGetPayload<{ include: { variants: true } }>): MediaAsset {
    return {
        id: asset.id,
        ownerId: asset.ownerId,
        ownerType: asset.ownerType as MediaOwnerType,
        type: asset.type,
        status: asset.status,
        originalUrl: asset.originalUrl,
        hlsMasterUrl: asset.hlsMasterUrl ?? null,
        thumbnailUrl: asset.thumbnailUrl ?? null,
        durationMs: asset.durationMs ?? null,
        sizeBytes: asset.sizeBytes ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        failReason: asset.failReason ?? null,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
        variants: asset.variants,
    }
}

@Injectable()
export class MediaRepository {
    // ===== Dependencies =====
    constructor(private readonly prisma: PrismaService) {}

    // ===== Queries =====

    async findAssetById(id: string): Promise<MediaAsset | null> {
        const asset = await this.prisma.mediaAsset.findUnique({
            where: { id },
            include: { variants: true },
        })
        return asset ? toMediaAsset(asset) : null
    }

    async listAssets(filters: MediaFilterDto): Promise<{ items: MediaAsset[]; total: number }> {
        const { page = 1, limit = 20, type, status, ownerType, ownerId, search } = filters
        const skip = (page - 1) * limit

        // Luật #14: dùng Prisma.MediaAssetWhereInput thay Record<string, unknown>
        const where: Prisma.MediaAssetWhereInput = {}
        if (type) where.type = type
        // Mặc định chỉ hiển thị các asset đã sẵn sàng (READY) — không trả về asset đang tải (UPLOADING) hoặc hỏng
        where.status = status || MEDIA_STATUS.READY
        if (ownerType) where.ownerType = ownerType
        if (ownerId) where.ownerId = ownerId
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { originalUrl: { contains: search, mode: 'insensitive' } },
            ]
        }

        const [items, total] = await Promise.all([
            this.prisma.mediaAsset.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { variants: true },
            }),
            this.prisma.mediaAsset.count({ where }),
        ])

        return { items: items.map(toMediaAsset), total }
    }

    // ===== Commands =====

    async createAsset(data: CreateMediaAssetInput): Promise<MediaAsset> {
        // Luật #14: dùng Prisma.MediaAssetCreateInput thay Record<string, unknown> + as never
        const createData: Prisma.MediaAssetCreateInput = {
            ownerId: data.ownerId,
            ownerType: data.ownerType,
            type: data.type,
            status: data.status ?? MEDIA_STATUS.READY,
            originalUrl: data.originalUrl ?? null,
            thumbnailUrl: data.thumbnailUrl ?? null,
            sizeBytes: data.sizeBytes ?? null,
            width: data.width ?? null,
            height: data.height ?? null,
            durationMs: data.durationMs ?? null,
        }
        // id tuỳ chọn — thường để Prisma tự sinh UUID, chỉ truyền khi cần idempotency
        if (data.id) {
            createData.id = data.id
        }

        const created = await this.prisma.mediaAsset.create({
            data: createData,
            include: { variants: true },
        })

        return toMediaAsset(created)
    }

    async updateAsset(id: string, data: UpdateMediaAssetInput): Promise<MediaAsset> {
        const updated = await this.prisma.mediaAsset.update({
            where: { id },
            data,
            include: { variants: true },
        })

        return toMediaAsset(updated)
    }

    async deleteAsset(id: string): Promise<MediaAsset> {
        const deleted = await this.prisma.mediaAsset.delete({
            where: { id },
            include: { variants: true },
        })

        return toMediaAsset(deleted)
    }
}
