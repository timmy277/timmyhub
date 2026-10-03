import { ResourceStatus } from '@timmyhub/contracts'

import { StatusTone } from './status'

// Tham số URL của danh sách đơn đăng ký bán hàng
export const SELLER_APPLICATION_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    STATUS: 'status',
    Q: 'q',
    TABS: 'tabs',
} as const

// Tab của màn duyệt người bán
export const SELLER_APPLICATION_TAB = {
    LIST: 'list',
    DETAIL: 'detail',
} as const
export type SellerApplicationTab = (typeof SELLER_APPLICATION_TAB)[keyof typeof SELLER_APPLICATION_TAB]

export const SELLER_APPLICATION_TAB_ID_SEPARATOR = ':'
export const SELLER_APPLICATION_TAB_ID_LABEL_LENGTH = 8

// Bộ lọc trạng thái
export const SELLER_APPLICATION_STATUS_ALL = 'ALL'

export const SELLER_APPLICATION_STATUS_LABEL: Record<string, string> = {
    [ResourceStatus.PENDING]: 'Chờ duyệt',
    [ResourceStatus.APPROVED]: 'Đã duyệt',
    [ResourceStatus.REJECTED]: 'Đã từ chối',
}

export const SELLER_APPLICATION_STATUS_TONE: Record<string, StatusTone> = {
    [ResourceStatus.PENDING]: StatusTone.NEUTRAL,
    [ResourceStatus.APPROVED]: StatusTone.SUCCESS,
    [ResourceStatus.REJECTED]: StatusTone.DANGER,
}
