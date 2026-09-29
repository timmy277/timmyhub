'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { RoleSummary } from '@timmyhub/contracts'

import { AgGridTable, ConfirmDialog } from '@/components'
import { createRoleColumns } from '@/config'
import type { RbacPermissionFlags } from '@/constants'
import { RBAC_TAB, TOAST_ID, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { useDeleteRole } from '@/hooks'

import { buildRbacTabsHref, type RbacTabState } from '../rbac-tab-query'

interface RoleTableProps {
    rows: RoleSummary[]
    permissions: RbacPermissionFlags
    // Có `error` thì lưới thay bằng khối báo lỗi kèm nút thử lại (trạng thái #4 của luật #9).
    error?: string
}

// Tab "Danh sách vai trò". Khác bảng người dùng: danh mục vai trò **nhỏ và tải trọn** (không phân trang phía server),
// nên để AG Grid tự tìm/sắp xếp/lọc tại chỗ trên toàn bộ dữ liệu — không truyền `onSearchChange`/`onSortChange`/
// `onFilterChange`, nhờ vậy `defaultColDef` giữ `sortable`/`filter` bật cho mọi cột (xem `ag-grid-table.tsx`).
//
// Thao tác trên hàng là **điều hướng** sang tab tương ứng (Xem/Sửa) chứ không mở hộp thoại — cùng khuôn với
// `UserTable`, để URL của bản ghi đang xem chia sẻ được và tải lại vẫn ra đúng chỗ.
export function RoleTable({ rows, permissions, error }: RoleTableProps) {
    // ===== State =====
    const [pendingDelete, setPendingDelete] = useState<RoleSummary | null>(null)

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const removeRole = useDeleteRole({ onSucceeded: () => setPendingDelete(null) })

    // ===== Derived =====
    const hrefFor = useCallback(
        (target: RbacTabState) => buildRbacTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const columns = useMemo(
        () =>
            createRoleColumns({
                t,
                permissions,
                actions: {
                    onView: (role) => router.push(hrefFor({ tab: RBAC_TAB.DETAIL, id: role.id })),
                    onEdit: (role) => router.push(hrefFor({ tab: RBAC_TAB.UPDATE, id: role.id })),
                    onDelete: setPendingDelete,
                },
            }),
        [t, permissions, router, hrefFor],
    )

    // ===== Handlers =====
    const handleRefresh = () => {
        toast.info(t('refreshing'), { id: TOAST_ID.RBAC_REFRESH })
        router.refresh()
    }

    const handleAdd = () => router.push(hrefFor({ tab: RBAC_TAB.CREATE }))

    return (
        <>
            <AgGridTable<RoleSummary>
                rowData={rows}
                columnDefs={columns}
                getRowId={(params) => params.data.id}
                loading={removeRole.isPending}
                error={error}
                onRefresh={handleRefresh}
                onAdd={permissions.ROLES_CREATE ? handleAdd : undefined}
                addLabel={t('addRole')}
                searchLabel={t('searchRoleLabel')}
                exportFileName={t('roleExportFileName')}
                gridProps={{ rowHeight: USER_TABLE_ROW_HEIGHT_PX }}
            />

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
                title={t('deleteRoleTitle')}
                description={pendingDelete && t('confirmDeleteRole', { name: pendingDelete.displayName })}
                confirmLabel={t('delete')}
                variant="destructive"
                onConfirm={async () => {
                    if (!pendingDelete) return
                    await removeRole.mutateAsync({ roleId: pendingDelete.id })
                }}
            />
        </>
    )
}
