// ===== Media Routes =====
// Luật #23: tập giá trị hữu hạn dùng const object + type suy ra, không chuỗi trần
export const MEDIA_ROUTE = {
    UPLOAD: 'upload',
    PRESIGNED_URL: 'presigned-url',
    CONFIRM: 'confirm',
    BY_ID: ':id',
} as const

export type MediaRoute = (typeof MEDIA_ROUTE)[keyof typeof MEDIA_ROUTE]

// ===== Media Events =====
// Sự kiện nội bộ media — phát qua EventEmitter2 (không phải nghiệp vụ outbox)
export const MEDIA_EVENT = {
    ASSET_CREATED: 'media.asset.created',
    ASSET_DELETED: 'media.asset.deleted',
} as const

export type MediaEvent = (typeof MEDIA_EVENT)[keyof typeof MEDIA_EVENT]
