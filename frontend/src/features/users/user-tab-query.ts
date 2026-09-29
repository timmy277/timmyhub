import { USER_QUERY_PARAM, USER_TAB, USER_TAB_ID_SEPARATOR, USER_TAB_LIST_SEPARATOR } from '@/constants'

// `searchParams` của Server Component là object thường, còn `useSearchParams()` của client trả `ReadonlyURLSearchParams`
// — lớp này kế thừa `URLSearchParams` nên hai dạng đọc được bằng chung một hàm, gom về một kiểu cho gọn.
type SearchParams = Record<string, string | string[] | undefined>
export type UserTabSearchParams = SearchParams | URLSearchParams

// Một tab trên thanh tab, **trừ** tab danh sách — tab đó luôn có mặt nên không bao giờ nằm trong danh sách tab đang mở.
// `create` là form trắng nên không gắn bản ghi nào; `update`/`detail` bắt buộc có định danh, không thì không có gì để mở.
export type UserTabItem =
    | { tab: typeof USER_TAB.CREATE }
    | { tab: typeof USER_TAB.UPDATE; id: string }
    | { tab: typeof USER_TAB.DETAIL; id: string }

// Tab đang xem. Danh sách là **nền**: không có tham số `tabs` trên URL nghĩa là đang ở danh sách.
export type UserTabState = { tab: typeof USER_TAB.LIST } | UserTabItem

// Trạng thái thanh tab đọc từ URL: tab đang xem + danh sách tab đang mở.
export interface UserTabsState {
    active: UserTabState
    open: UserTabItem[]
}

// Thanh tab của màn quản lý người dùng nằm trong URL, chia làm hai tham số độc lập:
//
//   `tabs` — tab **đang xem**: vắng mặt = danh sách, `create` = form tạo, `update:<uuid>` / `detail:<uuid>` = bản ghi.
//   `open` — danh sách tab **đang mở**, ngăn bằng dấu phẩy: `update:<uuid>,create,detail:<uuid>`.
//
// Hai tham số tách rời nhau là điểm cốt lõi: mỗi lần mở Sửa hay Xem chỉ **thêm một** tab vào `open` rồi trỏ `tabs` vào
// nó, nên hai tab đó độc lập — mở Sửa không kéo theo Xem và ngược lại. Đồng thời `open` không bị xoá khi quay về danh
// sách, nên tab đã mở vẫn còn nguyên trên thanh tab dù đang đứng ở danh sách — cùng cách `openTabs` của TimmyHub gốc
// giữ lại tab (chỉ khác là ở đây trạng thái nằm trong URL nên tải lại trang hay chia sẻ link vẫn ra đúng màn hình).
//
// Tab nằm trong URL nên mỗi tab là một `<Link>` thật: prefetch, mở tab mới và nút Back đều chạy, còn panel tương ứng do
// Server Component chọn theo `tabs`.

// Dùng lại một object cho mọi lần rơi về danh sách để so sánh tham chiếu ở nơi gọi vẫn ổn định.
const LIST_STATE: UserTabState = { tab: USER_TAB.LIST }

// Khoá định danh một tab: `create`, `update:<uuid>`, `detail:<uuid>`. Dùng chung cho cả tham số `tabs` lẫn từng phần tử
// trong `open` — một định dạng, hai chỗ đọc, nên hai chỗ không thể lệch nhau.
export function userTabKey(item: UserTabItem): string {
    if (item.tab === USER_TAB.CREATE) return USER_TAB.CREATE
    return `${item.tab}${USER_TAB_ID_SEPARATOR}${item.id}`
}

// Khoá của tab đang xem, tính cả tab danh sách — dùng để đối chiếu với `value` của từng tab trên thanh tab.
export function activeUserTabKey(active: UserTabState): string {
    return active.tab === USER_TAB.LIST ? USER_TAB.LIST : userTabKey(active)
}

function readParam(params: UserTabSearchParams, key: string): string | undefined {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
}

// Một mục trong danh sách tab đang mở. Giá trị lạ, thiếu định danh, hay tên tab không biết đều trả `null` để nơi gọi bỏ
// qua — người dùng gõ tay trên URL cũng không làm trang vỡ.
function parseUserTabItem(raw: string): UserTabItem | null {
    const separatorAt = raw.indexOf(USER_TAB_ID_SEPARATOR)
    const name = separatorAt === -1 ? raw : raw.slice(0, separatorAt)
    const id = separatorAt === -1 ? '' : raw.slice(separatorAt + 1)

    if (name === USER_TAB.CREATE) return { tab: USER_TAB.CREATE }
    if (name === USER_TAB.UPDATE && id !== '') return { tab: USER_TAB.UPDATE, id }
    if (name === USER_TAB.DETAIL && id !== '') return { tab: USER_TAB.DETAIL, id }

    return null
}

function parseUserTab(params: UserTabSearchParams): UserTabState {
    const raw = readParam(params, USER_QUERY_PARAM.TABS)
    if (typeof raw !== 'string' || raw === '') return LIST_STATE
    return parseUserTabItem(raw) ?? LIST_STATE
}

function parseUserOpenTabs(params: UserTabSearchParams): UserTabItem[] {
    const raw = readParam(params, USER_QUERY_PARAM.OPEN)
    if (typeof raw !== 'string' || raw === '') return []

    const seen = new Set<string>()
    const items: UserTabItem[] = []

    for (const chunk of raw.split(USER_TAB_LIST_SEPARATOR)) {
        const item = parseUserTabItem(chunk)
        if (!item) continue

        // `open` gõ tay có thể lặp cùng một tab; trên thanh tab thì mỗi tab chỉ được có một ô.
        const key = userTabKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
    }

    return items
}

// Thêm một tab vào danh sách đang mở, giữ nguyên thứ tự mở (tab mới nối vào cuối — cùng cách `addTab` của gốc làm).
function withUserTab(open: readonly UserTabItem[], item: UserTabItem): UserTabItem[] {
    const key = userTabKey(item)
    if (open.some((existing) => userTabKey(existing) === key)) return [...open]
    return [...open, item]
}

function withoutUserTab(open: readonly UserTabItem[], item: UserTabItem): UserTabItem[] {
    const key = userTabKey(item)
    return open.filter((existing) => userTabKey(existing) !== key)
}

// Đọc cả hai tham số trong một lượt và bảo đảm bất biến: tab đang xem luôn có mặt trên thanh tab. URL gõ tay có thể
// thiếu, mà "đang ở một tab không thấy trên thanh tab" thì người dùng không còn cách nào quay lại nó.
export function parseUserTabs(params: UserTabSearchParams): UserTabsState {
    const active = parseUserTab(params)
    const open = parseUserOpenTabs(params)

    if (active.tab === USER_TAB.LIST) return { active, open }
    return { active, open: withUserTab(open, active) }
}

// Dựng href cho một lần chuyển tab. Ghi **cả hai** tham số trong một lượt vì chúng luôn đi cùng nhau: `tabs` là tab
// đang xem, `open` là danh sách tab đang mở. Các tham số khác của danh sách (`page`, `q`, `role`, `status`) giữ nguyên
// — sang tab chi tiết rồi quay về vẫn còn đúng bộ lọc và đúng trang.
//
// Tab đang xem tự động được thêm vào `open` nếu chưa có: mở tab nào thì tab đó phải hiện trên thanh tab. Gộp ở đây
// thay vì bắt nơi gọi tự nhớ, vì đây là chỗ duy nhất ghi URL.
export function buildUserTabsHref(
    pathname: string,
    searchParams: URLSearchParams,
    active: UserTabState,
    open: readonly UserTabItem[],
): string {
    const params = new URLSearchParams(searchParams.toString())
    const openItems = active.tab === USER_TAB.LIST ? [...open] : withUserTab(open, active)

    // Danh sách là mặc định của màn hình nên không ghi vào URL — link gọn hơn, và trùng với URL người dùng tự gõ.
    if (active.tab === USER_TAB.LIST) params.delete(USER_QUERY_PARAM.TABS)
    else params.set(USER_QUERY_PARAM.TABS, userTabKey(active))

    if (openItems.length === 0) params.delete(USER_QUERY_PARAM.OPEN)
    else params.set(USER_QUERY_PARAM.OPEN, openItems.map(userTabKey).join(USER_TAB_LIST_SEPARATOR))

    const queryString = params.toString()
    return queryString === '' ? pathname : `${pathname}?${queryString}`
}

// Đóng một tab: bỏ nó khỏi danh sách đang mở. Đóng tab **đang xem** thì không thể đứng ở một tab vừa biến mất, nên phải
// nhường chỗ cho tab liền trước — tab danh sách luôn đứng đầu nên luôn có chỗ lùi. Đúng cách `closeTab` của gốc làm
// (`newTabs[currentIdx - 1] || newTabs[0]`), và cũng là lý do bấm × trên tab Sửa vừa mở từ tab Xem thì quay về tab Xem
// chứ không nhảy về danh sách. Đóng một tab khác thì đứng nguyên chỗ cũ.
//
// Dùng chung cho nút × trên thanh tab và cho lúc lưu/huỷ form (tab vừa xong việc thì tự đóng).
export function buildUserTabCloseHref(pathname: string, searchParams: URLSearchParams, item: UserTabItem): string {
    const { active, open } = parseUserTabs(searchParams)
    const isActive = active.tab !== USER_TAB.LIST && userTabKey(active) === userTabKey(item)

    // `open` không chứa tab danh sách, nên mục đầu tiên của `open` lùi về đúng tab danh sách.
    const closedAt = open.findIndex((existing) => userTabKey(existing) === userTabKey(item))
    const previous = closedAt >= 1 ? open[closedAt - 1] : LIST_STATE

    return buildUserTabsHref(pathname, searchParams, isActive ? previous : active, withoutUserTab(open, item))
}
