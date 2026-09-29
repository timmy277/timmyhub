// Hằng số của màn quản trị vai trò/quyền (module rbac). Cùng khuôn với `constants/user.ts`: tab state nằm trong URL,
// tập giá trị hữu hạn nên dùng const object + type suy ra (luật #17), không dùng `enum` TS.

// Loại màn — hai màn dùng chung một bộ component, phân biệt bằng giá trị này.
export const RBAC_KIND = {
    ROLES: 'roles',
    PERMISSIONS: 'permissions',
} as const
export type RbacKind = (typeof RBAC_KIND)[keyof typeof RBAC_KIND]

// Tham số URL giữ tab đang xem. Chỉ là mối quan tâm giao diện nên không nằm trong bất kỳ schema backend nào.
export const RBAC_QUERY_PARAM = {
    TABS: 'tabs',
} as const

// Tab của màn quản trị. Danh sách là **nền**: không có tham số `tabs` nghĩa là đang ở danh sách.
export const RBAC_TAB = {
    LIST: 'list',
    CREATE: 'create',
    UPDATE: 'update',
    DETAIL: 'detail',
} as const
export type RbacTab = (typeof RBAC_TAB)[keyof typeof RBAC_TAB]

// Ngăn cách tên tab với định danh bản ghi: `detail:<id>`. Dùng chung cho cả lúc dựng URL và lúc đọc lại.
export const RBAC_TAB_ID_SEPARATOR = ':'

// Nhãn tab chỉ hiện phần đầu định danh (cuid dài làm tab quá khổ); định danh đầy đủ nằm trong `title`.
export const RBAC_TAB_ID_LABEL_LENGTH = 8

// Tab bản ghi nào hợp lệ cho từng màn. Role có tab Sửa; permission thì **không** — backend không có endpoint sửa
// permission (`rbac:permissions:update` có trong danh mục nhưng chưa endpoint nào dùng), nên URL `tabs=update:<id>`
// trên màn permission bị coi là rác và rơi về danh sách.
export const RBAC_TAB_ITEM_VALUES = {
    [RBAC_KIND.ROLES]: [RBAC_TAB.CREATE, RBAC_TAB.UPDATE, RBAC_TAB.DETAIL],
    [RBAC_KIND.PERMISSIONS]: [RBAC_TAB.CREATE, RBAC_TAB.DETAIL],
} as const satisfies Record<RbacKind, readonly RbacTab[]>
