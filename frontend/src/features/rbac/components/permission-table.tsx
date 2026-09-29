'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { PermissionSummary } from '@timmyhub/contracts'

import { AgGridTable, ConfirmDialog } from '@/components'
import { createPermissionColumns } from '@/config'
import type { RbacPermissionFlags } from '@/constants'
import { RBAC_TAB, TOAST_ID, USER_TABLE_ROW_HEIGHT_PX } from '@/constants'
import { useDeletePermission } from '@/hooks'

import { buildRbacTabsHref, type RbacTabState } from '../rbac-tab-query'

interface PermissionTableProps {
    rows: PermissionSummary[]
    permissions: RbacPermissionFlags
    error?: string
}

// Tab "Danh sách quyền". Cùng khuôn với `RoleTable`: danh mục nhỏ và tải trọn nên AG Grid tự tìm/sắp xếp/lọc tại chỗ.
// Không có nút Sửa — backend chưa có endpoint sửa permission (`rbac:permissions:update` có trong danh mục nhưng chưa
// endpoint nào dùng), nên hàng chỉ có Xem và Xoá.
export function PermissionTable({ rows, permissions, error }: PermissionTableProps) {
    // ===== State =====
    const [pendingDelete, setPendingDelete] = useState<PermissionSummary | null>(null)

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const removePermission = useDeletePermission({ onSucceeded: () => setPendingDelete(null) })

    // ===== Derived =====
    const hrefFor = useCallback(
        (target: RbacTabState) => buildRbacTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const columns = useMemo(
        () =>
            createPermissionColumns({
                t,
                permissions,
                actions: {
                    onView: (permission) => router.push(hrefFor({ tab: RBAC_TAB.DETAIL, id: permission.id })),
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
            <AgGridTable<PermissionSummary>
                rowData={rows}
                columnDefs={columns}
                getRowId={(params) => params.data.id}
                loading={removePermission.isPending}
                error={error}
                onRefresh={handleRefresh}
                onAdd={permissions.PERMISSIONS_CREATE ? handleAdd : undefined}
                addLabel={t('addPermission')}
                searchLabel={t('searchPermissionLabel')}
                exportFileName={t('permissionExportFileName')}
                gridProps={{ rowHeight: USER_TABLE_ROW_HEIGHT_PX }}
            />

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
                title={t('deletePermissionTitle')}
                description={pendingDelete && t('confirmDeletePermission', { name: pendingDelete.name })}
                confirmLabel={t('delete')}
                variant="destructive"
                onConfirm={async () => {
                    if (!pendingDelete) return
                    await removePermission.mutateAsync({ permissionId: pendingDelete.id })
                }}
            />
        </>
    )
}
