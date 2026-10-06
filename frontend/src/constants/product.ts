import { ProductStatus } from '@timmyhub/contracts'

import { StatusTone } from './status'

// Tham số URL của màn quản lý sản phẩm
export const PRODUCT_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    STATUS: 'status',
    Q: 'q',
    TABS: 'tabs',
} as const

// Tab của màn quản lý sản phẩm (danh sách, tạo mới, xem chi tiết)
export const PRODUCT_TAB = {
    LIST: 'list',
    CREATE: 'create',
    DETAIL: 'detail',
} as const

export type ProductTab = (typeof PRODUCT_TAB)[keyof typeof PRODUCT_TAB]

export const PRODUCT_TAB_ID_SEPARATOR = ':'
export const PRODUCT_TAB_ID_LABEL_LENGTH = 16

// Bộ lọc trạng thái
export const PRODUCT_STATUS_FILTER_ALL = 'ALL'

export const PRODUCT_STATUS_LABEL: Record<string, string> = {
    [ProductStatus.PENDING]: 'Chờ duyệt',
    [ProductStatus.APPROVED]: 'Đang bán',
    [ProductStatus.REJECTED]: 'Bị từ chối',
    SUSPENDED: 'Tạm ngưng',
    [ProductStatus.DRAFT]: 'Bản nháp',
}

export const PRODUCT_STATUS_TONE: Record<string, StatusTone> = {
    [ProductStatus.PENDING]: StatusTone.NEUTRAL,
    [ProductStatus.APPROVED]: StatusTone.SUCCESS,
    [ProductStatus.REJECTED]: StatusTone.DANGER,
    SUSPENDED: StatusTone.NEUTRAL,
    [ProductStatus.DRAFT]: StatusTone.NEUTRAL,
}
