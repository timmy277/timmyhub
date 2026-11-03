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

// Tham số URL của danh sách đơn hàng người bán
export const SELLER_ORDER_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    STATUS: 'status',
    Q: 'q',
    TABS: 'tabs',
} as const

// Tab của màn quản lý đơn hàng người bán
export const SELLER_ORDER_TAB = {
    LIST: 'list',
    DETAIL: 'detail',
} as const
export type SellerOrderTab = (typeof SELLER_ORDER_TAB)[keyof typeof SELLER_ORDER_TAB]

export const SELLER_ORDER_TAB_ID_SEPARATOR = ':'
export const SELLER_ORDER_TAB_ID_LABEL_LENGTH = 8
export const SELLER_ORDER_STATUS_ALL = 'ALL'

// Tham số URL của danh sách yêu cầu rút tiền (Admin)
export const WITHDRAWAL_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    STATUS: 'status',
    Q: 'q',
    TABS: 'tabs',
} as const

// Tab của màn quản lý rút tiền (Admin)
export const WITHDRAWAL_TAB = {
    LIST: 'list',
    DETAIL: 'detail',
} as const
export type WithdrawalTab = (typeof WITHDRAWAL_TAB)[keyof typeof WITHDRAWAL_TAB]

export const WITHDRAWAL_TAB_ID_SEPARATOR = ':'
export const WITHDRAWAL_TAB_ID_LABEL_LENGTH = 8

export const WITHDRAWAL_STATUS_ALL = 'ALL'

export const WITHDRAWAL_STATUS = {
    REQUESTED: 'REQUESTED',
    APPROVED: 'APPROVED',
    PAID: 'PAID',
    REJECTED: 'REJECTED',
} as const

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS]

export const WITHDRAWAL_STATUS_TONE: Record<string, StatusTone> = {
    [WITHDRAWAL_STATUS.REQUESTED]: StatusTone.NEUTRAL,
    [WITHDRAWAL_STATUS.APPROVED]: StatusTone.NEUTRAL,
    [WITHDRAWAL_STATUS.PAID]: StatusTone.SUCCESS,
    [WITHDRAWAL_STATUS.REJECTED]: StatusTone.DANGER,
}
