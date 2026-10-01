import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { parseISO } from 'date-fns'
import { EyeIcon, LockIcon, LockOpenIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { UserRole, UserSummary } from '@timmyhub/contracts'
import { isSuperAdmin, USER_LIST_SORT, UserStatus } from '@timmyhub/contracts'

import { RoleBadges, RowActions, StatusBadge, UserAvatar, type RowAction } from '@/components'
import type { UserPermissionFlags, UserPermissionKey } from '@/constants'
import {
    AG_GRID_FILTER_KEY,
    AG_GRID_NO_EXPORT,
    AG_GRID_SORT_KEY,
    AVATAR_COLUMN_WIDTH_PX,
    ROLE_LABEL_KEY,
    SEARCH_DEBOUNCE_MS,
    USER_COLUMN_WIDTH_PX,
    USER_QUERY_PARAM,
    USER_STATUS_LABEL_KEY,
    USER_STATUS_TONE,
} from '@/constants'
import { compareByLocalDay, formatTimestamp, getUserDisplayName, rowActionsColumnWidth } from '@/utils'

type UserManagementTranslator = ReturnType<typeof useTranslations<'userManagement'>>
type RoleTranslator = ReturnType<typeof useTranslations<'role'>>

// Cột nào sắp xếp được phía server, và bằng giá trị `sort` nào ở mỗi chiều. Khai ở đây thôi chưa đủ: cột còn phải
// `sortable: true` mới bấm được, vì ở chế độ sắp xếp phía server `sortable` là **opt-in** (mặc định tắt) — cột không
// khai `sortValues` thì không có cách nào sắp xếp cho đúng, nên thà không cho bấm còn hơn để lưới tự xáo 20 dòng của
// một trang. `roles` không có mặt vì mảng vai trò không `ORDER BY` được trên SQL.
//
// Cả hai chiều của mỗi cột đều phải có mặt: tiêu đề cột đảo chiều tại chỗ chứ không mở thêm lựa chọn, nên thiếu một
// chiều là bấm tới đó không biết ghi giá trị `sort` nào.
const SORT_VALUES = {
    name: { asc: USER_LIST_SORT.NAME_ASC, desc: USER_LIST_SORT.NAME_DESC },
    email: { asc: USER_LIST_SORT.EMAIL_ASC, desc: USER_LIST_SORT.EMAIL_DESC },
    status: { asc: USER_LIST_SORT.STATUS_ASC, desc: USER_LIST_SORT.STATUS_DESC },
    createdAt: { asc: USER_LIST_SORT.OLDEST, desc: USER_LIST_SORT.NEWEST },
    lastLoginAt: { asc: USER_LIST_SORT.LAST_LOGIN_ASC, desc: USER_LIST_SORT.LAST_LOGIN_DESC },
} as const satisfies Record<string, { asc: string; desc: string }>

// Bộ lọc ở tiêu đề cột có **hai** loại trong bảng này, và loại nào là quyết định có chủ ý của cột:
//  1. Chạy phía server — cột khai `context[AG_GRID_FILTER_KEY]`, giá trị người dùng chọn đi qua URL rồi vào `where`
//     của Prisma (xem `AgGridTable` và `ag-grid-filter.ts`). Đây là loại mặc định nên hướng tới.
//  2. Chạy tại chỗ trong lưới (AG Grid tự lo) — cột KHÔNG khai `AG_GRID_FILTER_KEY`. Timmy chốt 28/09 cho những cột
//     chưa có tham số URL nào nhận: thà có bộ lọc chỉ quét 20 dòng đang hiện còn hơn không có bộ lọc. Giới hạn đã
//     biết: thanh phân trang vẫn báo tổng số của server trong khi lưới đang giấu bớt dòng.
// Cột nào cố ý không có menu lọc thì khai `filter: false` — danh sách này được ghim trong `users-columns-check.cjs`.

// Chỉ mở đúng những toán tử mà backend diễn tả được. Đây là chỗ dễ nói dối nhất trong cả bảng: để người dùng chọn
// "bằng" rồi trả về kết quả của "chứa" thì họ không có cách nào biết mình vừa nhận kết quả sai.
//  - Chữ: backend chỉ có "khớp chứa", nên menu chỉ cho `contains` và chặn điều kiện thứ hai (`maxNumConditions: 1`).
//  - Ngày: backend có đúng hai đầu mút `createdFrom`/`createdTo`, khớp 1-1 với `inRange`. `blank`/`notBlank` không có
//    tham số tương ứng (`createdAt` không bao giờ NULL), `notEqual` cũng không.
const TEXT_FILTER_PARAMS = {
    filterOptions: ['contains'],
    maxNumConditions: 1,
    // Mỗi lần bộ lọc áp dụng là một lần điều hướng thật (server lọc lại cả bảng), nên gõ tới đâu lọc tới đó là không
    // được. Đặt cùng độ trễ với ô tìm kiếm chung để hai chỗ gõ ra cùng một nhịp; mặc định của AG Grid là 500ms.
    debounceMs: SEARCH_DEBOUNCE_MS,
}

// Dùng chung cho cả hai cột ngày (`createdAt` lọc phía server, `lastLoginAt` lọc tại chỗ): hai cột cùng hiển thị một
// mốc ngày mà cư xử khác nhau khi chọn "01/09 – 30/09" thì người dùng có quyền coi đó là lỗi.
const DATE_FILTER_PARAMS = {
    filterOptions: ['inRange'],
    defaultOption: 'inRange',
    maxNumConditions: 1,
    // Mặc định của AG Grid là khoảng MỞ (`from < giá trị < to`), tức bỏ luôn cả hai ngày ở hai đầu: chọn
    // "01/09 – 30/09" sẽ không thấy bản ghi nào của 01/09 và 30/09. Backend dùng `gte`/`lte` nên phải khớp lại.
    inRangeInclusive: true,
    // Ô lọc chỉ cho chọn ngày, nên cắt cả hai vế về ngày lịch địa phương — nhờ vậy phần lọc tại chỗ của lưới không
    // cắt oan bản ghi nào mà `createdFrom`/`createdTo` phía server đã cho qua (xem `compareByLocalDay`).
    comparator: compareByLocalDay,
}

// Quyền sinh ra nút trong cột thao tác, theo đúng thứ tự `buildRowActions` dựng nút.
const ROW_ACTION_PERMISSIONS = ['READ', 'UPDATE', 'LOCK', 'DELETE'] as const satisfies readonly UserPermissionKey[]

// So sánh hai chuỗi **có thể NULL** theo đúng quy tắc Postgres dùng khi `ORDER BY`: NULL đứng cuối khi ASC và lên
// đầu khi DESC. Mô phỏng bằng "NULL lớn hơn mọi chuỗi" — nhờ vậy lưới sắp 20 dòng đang có ra đúng thứ tự mà server
// vừa trả về, thay vì xáo lại theo quy tắc riêng của AG Grid.
//
// Dùng cho hai cột có khoá sắp xếp phía server là cột nullable:
//  - `name`: so theo ĐÚNG khoá mà backend dùng (`profile.displayName`), không theo chuỗi đã ghép ở `valueGetter` —
//    lệch khoá thì người dùng thấy dữ liệu "sắp xếp sai" ngay trên trang đầu.
//  - `lastLoginAt`: tài khoản chưa từng đăng nhập là NULL.
function compareNullableString(left: string | null | undefined, right: string | null | undefined): number {
    const a = left ?? null
    const b = right ?? null

    if (a === b) return 0
    if (a === null) return 1
    if (b === null) return -1

    return a < b ? -1 : 1
}

export interface UserColumnActions {
    onDetail: (user: UserSummary) => void
    onUpdate: (user: UserSummary) => void
    onToggleStatus: (user: UserSummary) => void
    onDelete: (user: UserSummary) => void
}

interface CreateUserColumnsOptions {
    t: UserManagementTranslator
    tRole: RoleTranslator
    // Quyền hiệu lực của người đang xem — cột thao tác chỉ dựng nút người đó thật sự bấm được.
    permissions: UserPermissionFlags
    actions: UserColumnActions
}

// Cột bảng người dùng theo `createUserColumns` của TimmyHub gốc, nhưng dữ liệu là `UserSummary` thật từ
// `/v1/identity/users`. Hàm thuần, không hook — trang gọi trong `useMemo` với translator đã có (luật #22).
export function createUserColumns({ t, tRole, permissions, actions }: CreateUserColumnsOptions): ColDef<UserSummary>[] {
    const roleLabel = (role: UserRole) => tRole(ROLE_LABEL_KEY[role])
    const statusLabel = (status: UserStatus) => t(USER_STATUS_LABEL_KEY[status])

    // Cột thao tác rộng theo **số nút thật sự render** cho người đang xem, không theo con số tối đa. Danh sách này
    // phải khớp từng nhánh `if` trong `buildRowActions` bên dưới — thêm nút mới thì thêm vào đây.
    const actionCount = ROW_ACTION_PERMISSIONS.filter((key) => permissions[key]).length

    const buildRowActions = (user: UserSummary): RowAction[] => {
        // Tài khoản SUPER_ADMIN vẫn hiện nút khoá/xoá nhưng ở trạng thái vô hiệu hoá kèm lý do — người quản trị thấy
        // được vì sao không bấm được, thay vì nút biến mất không giải thích (trạng thái #5 và #6 của luật #9).
        const isProtected = isSuperAdmin(user.roles)
        const isLocked = user.status === UserStatus.LOCKED
        const toggleLabel = isLocked ? t('unlock') : t('lock')
        const ariaLabel = (action: string) => t('rowActionAria', { action, target: user.email })

        const rowActions: RowAction[] = []

        if (permissions.READ) {
            rowActions.push({
                key: 'view',
                label: t('view'),
                ariaLabel: ariaLabel(t('view')),
                icon: EyeIcon,
                onClick: () => actions.onDetail(user),
            })
        }

        if (permissions.UPDATE) {
            rowActions.push({
                key: 'edit',
                label: t('edit'),
                ariaLabel: ariaLabel(t('edit')),
                icon: PencilIcon,
                onClick: () => actions.onUpdate(user),
            })
        }

        if (permissions.LOCK) {
            rowActions.push({
                key: 'toggle',
                label: isProtected ? t('superAdminProtected') : toggleLabel,
                ariaLabel: ariaLabel(toggleLabel),
                icon: isLocked ? LockOpenIcon : LockIcon,
                onClick: () => actions.onToggleStatus(user),
                destructive: !isLocked && !isProtected,
                disabled: isProtected,
            })
        }

        if (permissions.DELETE) {
            rowActions.push({
                key: 'delete',
                label: isProtected ? t('superAdminProtected') : t('delete'),
                ariaLabel: ariaLabel(t('delete')),
                icon: Trash2Icon,
                onClick: () => actions.onDelete(user),
                destructive: !isProtected,
                disabled: isProtected,
            })
        }

        return rowActions
    }

    return [
        {
            headerName: t('columnAvatar'),
            colId: 'avatar',
            width: AVATAR_COLUMN_WIDTH_PX,
            flex: 0,
            sortable: false,
            filter: false,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<UserSummary>) => {
                const user = params.data
                if (!user) return null
                return <UserAvatar name={getUserDisplayName(user) ?? user.email} imageUrl={user.profile?.avatar} />
            },
        },
        {
            headerName: t('columnName'),
            colId: 'name',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_NAME,
            valueGetter: (params) => (params.data ? (getUserDisplayName(params.data) ?? t('notUpdated')) : ''),
            cellClassRules: { 'text-muted-foreground italic': (params) => !params.data?.profile },
            comparator: (_a, _b, nodeA, nodeB) =>
                compareNullableString(nodeA.data?.profile?.displayName, nodeB.data?.profile?.displayName),
            sortable: true,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            // Bộ lọc dò ĐÚNG ba trường mà backend dò (`displayName`, `firstName`, `lastName`), không chỉ chuỗi đang
            // hiển thị. Server khớp cả ba, nên nếu lưới chỉ khớp chuỗi hiển thị thì nó cắt oan những dòng server đã
            // cho qua — lưới hiện ít dòng hơn con số mà thanh phân trang vẫn khai.
            filterValueGetter: (params) =>
                params.data
                    ? [params.data.profile?.displayName, params.data.profile?.firstName, params.data.profile?.lastName]
                          .filter(Boolean)
                          .join(' ')
                    : '',
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.name,
                [AG_GRID_FILTER_KEY]: { kind: 'text', param: USER_QUERY_PARAM.NAME },
            },
        },
        {
            headerName: t('columnEmail'),
            field: 'email',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_EMAIL,
            sortable: true,
            filter: 'agTextColumnFilter',
            filterParams: TEXT_FILTER_PARAMS,
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.email,
                [AG_GRID_FILTER_KEY]: { kind: 'text', param: USER_QUERY_PARAM.EMAIL },
            },
        },
        {
            headerName: t('columnRoles'),
            field: 'roles',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_ROLES,
            // Mảng vai trò không sắp xếp được trên SQL, nên cột này không có `sortValues` và cũng không cho bấm — để
            // bấm được thì lưới chỉ xáo 20 dòng của trang hiện tại. `sortable: false` là thừa so với mặc định của
            // chế độ sắp xếp phía server, nhưng khai ra để người đọc thấy đây là quyết định chứ không phải bỏ sót.
            sortable: false,
            // Menu lọc ở tiêu đề là bộ lọc **tại chỗ** của AG Grid, không đi qua URL — Timmy chốt 28/09. Lý do không
            // có đường phía server: nhãn vai trò đã dịch không có tham số URL nào nhận (bộ lọc theo vai trò phía
            // server là `?role=` với mã role, đã có ô chọn ở thanh công cụ), còn menu lọc ở tiêu đề chỉ dò được chuỗi
            // đang hiển thị. Đây là ngoại lệ có chủ ý của luật "menu lọc phải chạy phía server", nên cột này KHÔNG
            // khai `AG_GRID_FILTER_KEY` — `users-columns-check.cjs` ghim đúng danh sách ngoại lệ đó.
            //
            // Giới hạn đã biết và đã chấp nhận: bộ lọc này chỉ quét 20 dòng đang hiện trong khi thanh phân trang vẫn
            // báo tổng số của server. Thà có bộ lọc nói rõ phạm vi còn hơn không có bộ lọc nào.
            filter: 'agTextColumnFilter',
            // Lọc, tìm nhanh và xuất CSV theo nhãn đã dịch thay vì mã role — người dùng gõ đúng chữ họ nhìn thấy.
            valueFormatter: (params) => (params.value as UserRole[] | undefined)?.map(roleLabel).join(', ') ?? '',
            filterValueGetter: (params) => params.data?.roles.map(roleLabel).join(', ') ?? '',
            getQuickFilterText: (params) => (params.value as UserRole[]).map(roleLabel).join(' '),
            cellRenderer: (params: ICellRendererParams<UserSummary, UserRole[]>) => (
                <RoleBadges roles={params.value ?? []} />
            ),
        },
        {
            headerName: t('columnStatus'),
            field: 'status',
            width: USER_COLUMN_WIDTH_PX.STATUS,
            flex: 0,
            // Server xếp theo `isBanned` (ACTIVE = false < LOCKED = true) nên thứ tự chuỗi của `status` khớp đúng —
            // không cần `comparator` riêng.
            sortable: true,
            // Cùng quyết định với cột vai trò: menu lọc **tại chỗ** của AG Grid (Timmy chốt 28/09), không đi qua URL
            // vì ô chọn trạng thái ở thanh công cụ đã lo phần lọc phía server (`?status=`), còn menu ở tiêu đề chỉ dò
            // được nhãn đã dịch ("Hoạt động"/"Đã khoá"). Cột này cũng KHÔNG khai `AG_GRID_FILTER_KEY`.
            filter: 'agTextColumnFilter',
            context: { [AG_GRID_SORT_KEY]: SORT_VALUES.status },
            valueFormatter: (params) => (params.data ? statusLabel(params.data.status) : ''),
            filterValueGetter: (params) => (params.data ? statusLabel(params.data.status) : ''),
            getQuickFilterText: (params) => (params.data ? statusLabel(params.data.status) : ''),
            cellRenderer: (params: ICellRendererParams<UserSummary>) => {
                const user = params.data
                if (!user) return null
                // Khoá tạm do đăng nhập sai (REQ-IDN-029) không phải trạng thái quản trị — hiện riêng bên dưới badge.
                const lockedUntil = user.lockedUntil ? parseISO(user.lockedUntil) : null
                const temporarilyLocked = lockedUntil !== null && lockedUntil > new Date()
                return (
                    <div className="flex flex-col items-center gap-1">
                        <StatusBadge tone={USER_STATUS_TONE[user.status]} label={statusLabel(user.status)} />
                        {temporarilyLocked && lockedUntil && (
                            <span className="text-xs text-muted-foreground">
                                {t('statusTemporaryLock', { time: formatTimestamp(lockedUntil) })}
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            headerName: t('columnMemberSince'),
            field: 'createdAt',
            width: USER_COLUMN_WIDTH_PX.MEMBER_SINCE,
            flex: 0,
            // `createdAt` là chuỗi ISO cố định độ dài nên so sánh chuỗi trùng với so sánh thời gian — khớp `orderBy`
            // phía server, không cần `comparator`.
            //
            // Cột ngày tháng **có** sắp xếp, và chiều mặc định đọc theo đúng nghĩa của nó chứ không theo alphabet của
            // chuỗi: bấm lần đầu ra cũ nhất trước, lần hai ra mới nhất trước. Lưới vẫn sắp xếp 20 dòng đang có bằng
            // so sánh chuỗi ISO, mà thứ tự đó trùng với `ORDER BY "createdAt"` của Postgres.
            sortable: true,
            filter: 'agDateColumnFilter',
            filterParams: DATE_FILTER_PARAMS,
            context: {
                [AG_GRID_SORT_KEY]: SORT_VALUES.createdAt,
                [AG_GRID_FILTER_KEY]: {
                    kind: 'date',
                    fromParam: USER_QUERY_PARAM.CREATED_FROM,
                    toParam: USER_QUERY_PARAM.CREATED_TO,
                },
            },
            filterValueGetter: (params) => (params.data ? parseISO(params.data.createdAt) : null),
            valueFormatter: (params) => formatTimestamp(params.value as string),
        },
        {
            headerName: t('columnLastLogin'),
            field: 'lastLoginAt',
            width: USER_COLUMN_WIDTH_PX.LAST_LOGIN,
            flex: 0,
            // Chiều bấm đọc theo đúng nghĩa của cột: lần đầu ra nhóm **lâu rồi không vào** trước (cùng chiều ASC với
            // cột ngày tạo, cũng là chiều mặc định của AG Grid), lần hai ra vào gần đây nhất trước. Tài khoản chưa
            // từng đăng nhập nằm ở cuối khi ASC và lên đầu khi DESC — đúng quy tắc NULL của Postgres mà backend dùng.
            sortable: true,
            // `lastLoginAt` là chuỗi ISO nên thứ tự chuỗi trùng thứ tự thời gian, nhưng vẫn phải có `comparator` vì
            // cột **có thể NULL**: mặc định của AG Grid không đẩy NULL về cùng một phía với `ORDER BY` của server, mà
            // lệch thì lưới xáo 20 dòng đang hiện theo thứ tự khác thứ tự vừa nhận.
            comparator: (_a, _b, nodeA, nodeB) =>
                compareNullableString(nodeA.data?.lastLoginAt, nodeB.data?.lastLoginAt),
            // Menu lọc **tại chỗ** của AG Grid, cùng quyết định với hai cột vai trò/trạng thái: cột này chưa có tham
            // số URL nào nhận (bộ lọc phía server mới phủ tên, email và ngày tạo), nên nó cũng KHÔNG khai
            // `AG_GRID_FILTER_KEY`.
            filter: 'agDateColumnFilter',
            filterParams: DATE_FILTER_PARAMS,
            context: { [AG_GRID_SORT_KEY]: SORT_VALUES.lastLoginAt },
            // Cắt về ngày lịch địa phương như cột ngày tạo: bộ lọc chỉ cho chọn ngày nên bản ghi lúc 23:59 vẫn thuộc
            // ngày cuối của khoảng.
            filterValueGetter: (params) => (params.data?.lastLoginAt ? parseISO(params.data.lastLoginAt) : null),
            // Chưa từng đăng nhập không phải "ngày 01/01/1970" — hiện chữ mờ để không ai đọc nhầm thành một mốc thật.
            cellClassRules: { 'text-muted-foreground italic': (params) => !params.data?.lastLoginAt },
            valueFormatter: (params) => formatTimestamp(params.value as string) || t('never'),
        },
        // Không ai có nút nào để bấm thì không dựng cột — một cột "Thao tác" rỗng vừa chiếm chỗ vừa gợi ý rằng đáng
        // lẽ phải có gì đó ở đó.
        ...(actionCount > 0
            ? [
                  {
                      headerName: t('columnActions'),
                      colId: 'actions',
                      pinned: 'right' as const,
                      width: rowActionsColumnWidth(actionCount),
                      flex: 0,
                      sortable: false,
                      filter: false,
                      resizable: false,
                      suppressHeaderMenuButton: true,
                      context: AG_GRID_NO_EXPORT,
                      cellRenderer: (params: ICellRendererParams<UserSummary>) =>
                          params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
                  } satisfies ColDef<UserSummary>,
              ]
            : []),
    ]
}
