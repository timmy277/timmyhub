import { UserStatus } from '@timmyhub/contracts'

import { StatusTone } from './status'

// Nhãn trạng thái tài khoản trong namespace i18n `userManagement` — `satisfies Record<UserStatus, …>` bắt lỗi biên
// dịch khi contracts thêm trạng thái mới mà chưa có nhãn.
export const USER_STATUS_LABEL_KEY = {
    [UserStatus.ACTIVE]: 'statusActive',
    [UserStatus.LOCKED]: 'statusInactive',
} as const satisfies Record<UserStatus, string>

export const USER_STATUS_TONE = {
    [UserStatus.ACTIVE]: StatusTone.SUCCESS,
    [UserStatus.LOCKED]: StatusTone.DANGER,
} as const satisfies Record<UserStatus, StatusTone>

// Key i18n cho các tham số URL của danh sách — đặt tên một chỗ để Server Component đọc và component client ghi khớp nhau.
export const USER_QUERY_PARAM = {
    PAGE: 'page',
    PAGE_SIZE: 'pageSize',
    SEARCH: 'q',
    ROLE: 'role',
    STATUS: 'status',
    SORT: 'sort',
    // Bốn tham số của **bộ lọc theo cột** (menu lọc ở tiêu đề bảng). Tên phải trùng tên trường trong
    // `UserListQuerySchema` — cùng một chuỗi đi từ ô nhập ở tiêu đề, qua URL, tới `where` của Prisma.
    NAME: 'name',
    EMAIL: 'email',
    CREATED_FROM: 'createdFrom',
    CREATED_TO: 'createdTo',
    // Tab đang xem (`create` / `update:<uuid>` / `detail:<uuid>`, vắng mặt = danh sách) và danh sách tab đang mở
    // (`update:<uuid>,create`) của màn quản lý. Chỉ là mối quan tâm giao diện nên KHÔNG nằm trong
    // `UserListQuerySchema` — backend không bao giờ nhận hai tham số này.
    TABS: 'tabs',
    OPEN: 'open',
} as const

// Tab của màn quản lý người dùng. Danh sách là **nền**: không có tham số `tabs` trên URL nghĩa là đang ở danh sách.
// Tập giá trị hữu hạn nên dùng const object + type suy ra, không dùng `enum` TS (luật #17).
export const USER_TAB = {
    LIST: 'list',
    CREATE: 'create',
    UPDATE: 'update',
    DETAIL: 'detail',
} as const

export type UserTab = (typeof USER_TAB)[keyof typeof USER_TAB]

// Ngăn cách tên tab với định danh bản ghi trong cùng một giá trị: `detail:<uuid>`. Dùng chung cho cả lúc dựng URL và
// lúc đọc lại — hai nơi lệch nhau là URL hỏng.
export const USER_TAB_ID_SEPARATOR = ':'

// Ngăn cách các tab trong danh sách tab đang mở (tham số `open`): `detail:<uuid>,create`. Uuid không chứa dấu phẩy
// nên tách chuỗi là đủ, không cần mã hoá gì thêm.
export const USER_TAB_LIST_SEPARATOR = ','

// Nhãn tab chỉ hiện phần đầu của định danh: uuid đầy đủ (36 ký tự) làm tab dài quá khổ, mà tab chỉ cần đủ để người
// dùng đối chiếu với bản ghi đang mở. Định danh đầy đủ vẫn nằm trong `title` để rê chuột là thấy.
export const USER_TAB_ID_LABEL_LENGTH = 8

// Trạng thái người dùng dùng cho bộ lọc "tất cả" — giá trị rỗng nghĩa là không lọc.
export const USER_STATUS_FILTER_ALL = '' as const
export const USER_ROLE_FILTER_ALL = '' as const

// Đúng bốn tham số URL của bộ lọc theo cột, theo thứ tự khai trong `UserListQuerySchema`. Cần danh sách này để
// `useUserListQuery` biết phải xoá những khoá nào khi bộ lọc trên lưới rỗng — "xoá hết" mà chỉ ghi đè khoá đang có
// thì khoá cũ ở lại trên URL và server vẫn lọc.
export const USER_COLUMN_FILTER_PARAMS = [
    USER_QUERY_PARAM.NAME,
    USER_QUERY_PARAM.EMAIL,
    USER_QUERY_PARAM.CREATED_FROM,
    USER_QUERY_PARAM.CREATED_TO,
] as const
