export const CONTENT_ROUTES = {
    FEED: 'v1/feed',
    SELLER_POSTS: 'v1/seller/posts',
} as const

export const CONTENT_PAGINATION = {
    DEFAULT_PAGE: 1 as number,
    DEFAULT_LIMIT: 10 as number,
    MAX_LIMIT: 50 as number,
} as const

export const VIDEO_TRANSCODE_DEFAULTS = {
    DEFAULT_THUMBNAIL_OFFSET_SECONDS: 0.0001,
    HLS_SEGMENT_DURATION_SECONDS: 6,
    CRF: 23,
    PRESET: 'medium',
    AUDIO_BITRATE: '128k',
} as const
