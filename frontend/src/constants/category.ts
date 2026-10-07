export const CATEGORY_TAB = {
    LIST: 'list',
    CREATE: 'create',
    DETAIL: 'detail',
} as const

export type CategoryTab = (typeof CATEGORY_TAB)[keyof typeof CATEGORY_TAB]

export const CATEGORY_QUERY_PARAM = {
    TABS: 'tab',
} as const

export const CATEGORY_TAB_ID_SEPARATOR = ':' as const
export const CATEGORY_TAB_ID_LABEL_LENGTH = 16 as const

export const CATEGORY_STATUS_FILTER_ALL = 'ALL' as const
export const CATEGORY_STATUS_FILTER_ACTIVE = 'ACTIVE' as const
export const CATEGORY_STATUS_FILTER_INACTIVE = 'INACTIVE' as const
