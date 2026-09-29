'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { UserListQuery, UserPagination, UserSummary } from '@timmyhub/contracts'
import { USER_LIST_SORT, USER_ROLES, UserStatus } from '@timmyhub/contracts'

import { AgGridTable, ConfirmDialog, FloatCombobox, ServerPagination } from '@/components'
import { createUserColumns } from '@/config'
import type { UserPermissionFlags } from '@/constants'
import {
    ROLE_LABEL_KEY,
    SEARCH_DEBOUNCE_MS,
    TOAST_ID,
    USER_ROLE_FILTER_ALL,
    USER_STATUS_FILTER_ALL,
    USER_STATUS_LABEL_KEY,
    USER_TABLE_ROW_HEIGHT_PX,
    USER_TAB,
} from '@/constants'
import { useDebouncedValue, useDeleteUser, useUserListQuery } from '@/hooks'

import { buildUserListHref } from '../user-list-href'
import { userColumnFilterParams } from '../user-list-query'
import { buildUserTabsHref, parseUserTabs, type UserTabState } from '../user-tab-query'
import { UserLockDialog } from './user-lock-dialog'

interface UserTableProps {
    rows: UserSummary[]
    pagination: UserPagination
    query: UserListQuery
    permissions: UserPermissionFlags
    // Có `error` thì lưới thay bằng khối báo lỗi kèm nút thử lại (trạng thái #4 của luật #9).
    error?: string
}

// Tab "Danh sách": dữ liệu là **một trang** do Server Component tải về; tìm kiếm, lọc và phân trang đều ghi vào URL
// để server đọc lại (api-conventions §6) — lưới không tự lọc nhanh vì nó chỉ có dữ liệu của trang hiện tại.
//
// Thanh công cụ của lưới (tìm kiếm, làm mới, đặt lại, quản lý cột, xuất CSV, thêm mới) do `AgGridTable` tự render,
// nên ở đây **không** dựng lại ô tìm kiếm hay nút làm mới — trước đây hai bộ cùng trỏ vào một state nên màn hình có
// tận hai ô tìm kiếm và hai nút làm mới. Hai bộ lọc vai trò/trạng thái lọc ở phía server nên không phải bộ lọc cột,
// nhưng vẫn là ô điều khiển của thanh công cụ: truyền qua `toolbarFilters` để chúng đứng cùng hàng với ô tìm kiếm và
// các nút, thay vì chiếm một hàng riêng phía trên lưới.
export function UserTable({ rows, pagination, query, permissions, error }: UserTableProps) {
    // ===== State =====
    const [searchInput, setSearchInput] = useState(query.q ?? '')
    const [pendingLock, setPendingLock] = useState<UserSummary | null>(null)
    const [pendingDelete, setPendingDelete] = useState<UserSummary | null>(null)

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tRole = useTranslations('role')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isPending, setPageSize, setSearch, setRole, setStatus, setSort, setFilters, resetList } = useUserListQuery()
    const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)

    const removeUser = useDeleteUser({ onSucceeded: () => setPendingDelete(null) })

    // ===== Derived =====
    const isLoading = isPending || removeUser.isPending

    // Thao tác trên hàng là **điều hướng** sang tab tương ứng chứ không mở hộp thoại — nhờ vậy URL của bản ghi đang
    // xem chia sẻ được, và tải lại trang vẫn ra đúng chỗ. Tab đang mở nằm trong URL nên đọc lại ngay tại đây để mở
    // thêm bản ghi mà không làm rơi mất những tab đã mở trước đó.
    const hrefFor = useCallback(
        (target: UserTabState) => {
            const { open } = parseUserTabs(searchParams)
            return buildUserTabsHref(pathname, searchParams, target, open)
        },
        [pathname, searchParams],
    )

    // Ô số trang là `<Link>` thật nên cần href dựng sẵn; `buildUserListHref` giữ nguyên từ khoá và bộ lọc đang có.
    const pageHref = useCallback(
        (patch: { page?: number; pageSize?: number }) => buildUserListHref(pathname, searchParams, patch),
        [pathname, searchParams],
    )

    const columns = useMemo(
        () =>
            createUserColumns({
                t,
                tRole,
                permissions,
                actions: {
                    onDetail: (user) => router.push(hrefFor({ tab: USER_TAB.DETAIL, id: user.id })),
                    onUpdate: (user) => router.push(hrefFor({ tab: USER_TAB.UPDATE, id: user.id })),
                    onToggleStatus: setPendingLock,
                    onDelete: setPendingDelete,
                },
            }),
        [t, tRole, permissions, router, hrefFor],
    )

    const roleOptions = useMemo(
        () => [
            { value: USER_ROLE_FILTER_ALL, label: t('filterAllRoles') },
            ...USER_ROLES.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) })),
        ],
        [t, tRole],
    )

    const statusOptions = useMemo(
        () => [
            { value: USER_STATUS_FILTER_ALL, label: t('filterAllStatuses') },
            ...Object.values(UserStatus).map((status) => ({
                value: status,
                label: t(USER_STATUS_LABEL_KEY[status]),
            })),
        ],
        [t],
    )

    // Bộ lọc theo cột đang áp, đọc từ URL. Phải ổn định tham chiếu: `AgGridTable` phụ thuộc vào chính object này để
    // đẩy mô hình lọc lên lưới, nên object mới mỗi lần render sẽ ghi lại mô hình ở mọi lần render. `query` là prop
    // mới mỗi lần server render lại nên tách bốn trường ra trước, không bọc `useMemo` quanh cả `query`.
    const { name: nameFilter, email: emailFilter, createdFrom: createdFromFilter, createdTo: createdToFilter } = query

    const columnFilters = useMemo(
        () =>
            userColumnFilterParams({
                name: nameFilter,
                email: emailFilter,
                createdFrom: createdFromFilter,
                createdTo: createdToFilter,
            }),
        [nameFilter, emailFilter, createdFromFilter, createdToFilter],
    )

    // ===== Effects =====
    // Ô tìm kiếm và URL soi chiếu nhau, mỗi chiều một việc:
    //  - gõ → đứng yên một nhịp → ghi URL (server tìm);
    //  - URL đổi từ nơi khác ("Đặt lại", nút Back, dán link) → kéo ô nhập theo.
    //
    // `lastSyncedSearch` là từ khoá mà **chính mình** đã ghi lên URL, và là thứ phân biệt hai chiều đó. So trực tiếp
    // ô nhập với `query.q` như trước đây thì "Đặt lại" bị hỏng: vừa xoá `q` trên URL, `debouncedSearch` vẫn giữ từ
    // khoá cũ trong 300ms và ghi ngược nó lên URL — người dùng thấy từ khoá hiện lại rồi mới biến mất, tốn thêm hai
    // lần điều hướng. Bấm Back cũng bị chống lại y như vậy.
    const lastSyncedSearch = useRef(query.q ?? '')

    useEffect(() => {
        const fromUrl = query.q ?? ''
        if (fromUrl === lastSyncedSearch.current) return
        // Đổi từ bên ngoài: đã đồng bộ, nên chỉ việc kéo ô nhập theo — để nguyên thì ô nói một đàng URL nói một nẻo.
        lastSyncedSearch.current = fromUrl
        setSearchInput(fromUrl)
    }, [query.q])

    useEffect(() => {
        if (debouncedSearch === lastSyncedSearch.current) return
        lastSyncedSearch.current = debouncedSearch
        // Ghi `replace` nên không nhét mỗi ký tự vào lịch sử trình duyệt.
        setSearch(debouncedSearch)
    }, [debouncedSearch, setSearch])

    // ===== Handlers =====
    const handleRefresh = () => {
        toast.info(t('refreshing'), { id: TOAST_ID.USERS_REFRESH })
        router.refresh()
    }

    const handleAdd = () => router.push(hrefFor({ tab: USER_TAB.CREATE }))

    // "Đặt lại" của lưới phải trả từ khoá, sắp xếp và bộ lọc cột về mặc định trong MỘT lần điều hướng — việc đó cần
    // biết URL nên nằm ở đây, và `resetList` cho biết nó có thật sự điều hướng hay không (xem `useUserListQuery`).
    const handleReset = () => {
        setSearchInput('')
        return resetList()
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <AgGridTable<UserSummary>
                    rowData={rows}
                    columnDefs={columns}
                    getRowId={(params) => params.data.id}
                    loading={isLoading}
                    error={error}
                    onRefresh={handleRefresh}
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    // Sắp xếp cũng đi qua URL như tìm kiếm và bộ lọc: lưới chỉ giữ **một trang** dữ liệu, nên để nó
                    // tự sắp xếp thì chỉ xáo 20 dòng đang hiện chứ không sắp xếp cả bảng. `defaultSortValue` để nút
                    // "Đặt lại" biết đường quay về.
                    sortValue={query.sort}
                    onSortChange={setSort}
                    defaultSortValue={USER_LIST_SORT.NEWEST}
                    // Bộ lọc theo cột cũng đi qua URL như sắp xếp và tìm kiếm: menu lọc ở tiêu đề mặc định lọc TẠI
                    // CHỖ, mà lưới chỉ giữ một trang nên nó chỉ lọc 20 dòng đang hiện. Đẩy giá trị lên URL thì server
                    // lọc cả bảng, rồi trả về trang đầu của kết quả mới.
                    filterParams={columnFilters}
                    onFilterChange={setFilters}
                    onReset={handleReset}
                    onAdd={permissions.CREATE ? handleAdd : undefined}
                    addLabel={t('addUser')}
                    searchLabel={t('searchLabel')}
                    exportFileName={t('exportFileName')}
                    // Cỡ `sm` cho bằng ô tìm kiếm bên cạnh — ba ô cùng một hàng thì phải cùng chiều cao.
                    toolbarFilters={
                        <>
                            <FloatCombobox
                                label={t('filterRole')}
                                options={roleOptions}
                                value={query.role ?? USER_ROLE_FILTER_ALL}
                                onValueChange={(value) => setRole(value ?? USER_ROLE_FILTER_ALL)}
                                size="sm"
                                className="w-full sm:w-40"
                            />
                            <FloatCombobox
                                label={t('filterStatus')}
                                options={statusOptions}
                                value={query.status ?? USER_STATUS_FILTER_ALL}
                                onValueChange={(value) => setStatus(value ?? USER_STATUS_FILTER_ALL)}
                                size="sm"
                                className="w-full sm:w-36"
                            />
                        </>
                    }
                    // Phân trang do URL quyết định (server trả từng trang), không dùng phân trang trong lưới.
                    pagination={false}
                    gridProps={{ rowHeight: USER_TABLE_ROW_HEIGHT_PX }}
                />

                <ServerPagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    totalItems={pagination.totalItems}
                    totalPages={pagination.totalPages}
                    hasPrev={pagination.hasPrev}
                    hasNext={pagination.hasNext}
                    buildHref={pageHref}
                    onPageSizeChange={setPageSize}
                    disabled={isLoading}
                />
            </div>

            {pendingLock && (
                <UserLockDialog user={pendingLock} onOpenChange={(open) => (open ? undefined : setPendingLock(null))} />
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
                title={t('deleteAccount')}
                description={pendingDelete && t('confirmDelete', { email: pendingDelete.email })}
                confirmLabel={t('deleteAccount')}
                variant="destructive"
                onConfirm={async () => {
                    if (!pendingDelete) return
                    await removeUser.mutateAsync({ userId: pendingDelete.id })
                }}
            />
        </>
    )
}
