export const ENGAGEMENT_ROUTE = {
    ROOT: 'v1/engagement/reviews',
} as const

export const ENGAGEMENT_EVENT = {
    REVIEW_CREATED: 'review.created',
    REVIEW_REPLIED: 'review.replied',
    RATING_UPDATED: 'rating.updated',
} as const
