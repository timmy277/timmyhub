import { Injectable } from '@nestjs/common'
import { PrismaService } from '@timmyhub/prisma'
import { MediaAsset, MediaFilterDto, MEDIA_STATUS } from '@timmyhub/contracts'

export interface CreateMediaAssetInput {
    id?: string
    ownerId: string
    ownerType: string
    type: 'IMAGE' | 'VIDEO'
    status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
    originalUrl?: string | null
    thumbnailUrl?: string | null
    sizeBytes?: number | null
    width?: number | null
    height?: number | null
    durationMs?: number | null
}

export interface UpdateMediaAssetInput {
    status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'
    originalUrl?: string | null
    thumbnailUrl?: string | null
    hlsMasterUrl?: string | null
    sizeBytes?: number | null
    width?: number | null
    height?: number | null
    durationMs?: number | null
    failReason?: string | null
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
        // Prisma bao gồm `variants` dạng mảng quan hệ; MediaAsset trong contracts
        // khai báo kiểu tổng quát hơn — cast an toàn vì include đúng với shape.
        return (asset as unknown as MediaAsset) ?? null
    }

    async listAssets(filters: MediaFilterDto): Promise<{ items: MediaAsset[]; total: number }> {
        const { page = 1, limit = 20, type, status, ownerType, ownerId, search } = filters
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {}
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

        return { items: items as unknown as MediaAsset[], total }
    }

    // ===== Commands =====

    async createAsset(data: CreateMediaAssetInput): Promise<MediaAsset> {
        const createData: Record<string, unknown> = {
            ownerId: data.ownerId,
            ownerType: data.ownerType,
            type: data.type,
            status: data.status ?? 'READY',
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
            data: createData as never,
            include: { variants: true },
        })

        return created as unknown as MediaAsset
    }

    async updateAsset(id: string, data: UpdateMediaAssetInput): Promise<MediaAsset> {
        const updated = await this.prisma.mediaAsset.update({
            where: { id },
            data,
            include: { variants: true },
        })

        return updated as unknown as MediaAsset
    }

    async deleteAsset(id: string): Promise<MediaAsset> {
        const deleted = await this.prisma.mediaAsset.delete({
            where: { id },
            include: { variants: true },
        })

        return deleted as unknown as MediaAsset
    }
}
