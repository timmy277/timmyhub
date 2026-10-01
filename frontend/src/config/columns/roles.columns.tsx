import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EyeIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { RoleSummary } from '@timmyhub/contracts'

import { RowActions, type RowAction } from '@/components'
import { Badge } from '@/components/ui'
import type { RbacPermissionFlags } from '@/constants'
import { AG_GRID_NO_EXPORT } from '@/constants'
import { formatTimestamp, rowActionsColumnWidth } from '@/utils'

type RbacTranslator = ReturnType<typeof useTranslations<'rbac'>>

export type RoleColumnActions = {
    onView: (role: RoleSummary) => void
    onEdit: (role: RoleSummary) => void
    onDelete: (role: RoleSummary) => void
}

// Cột bảng danh sách vai trò. Hàm thuần (luật #22) — nhận `t`/quyền/handler chứ không đọc state, nên dựng được trong
// `useMemo` ở client và kiểm chứng được bằng harness. Danh sách vai trò nhỏ (không phân trang) nên để AG Grid tự sắp
// xếp/lọc tại chỗ trên toàn bộ dữ liệu đã tải (khác bảng user phải đi qua URL vì chỉ giữ một trang).
//
// Nút Sửa/Xoá bị vô hiệu hoá với vai trò hệ thống (`isSystem`): backend chặn sửa/xoá chúng (`ROLE_IS_SYSTEM`), giao
// diện chỉ nói trước điều đó.
export function createRoleColumns({
    t,
    permissions,
    actions,
}: {
    t: RbacTranslator
    permissions: RbacPermissionFlags
    actions: RoleColumnActions
}): ColDef<RoleSummary>[] {
    const actionCount = [permissions.ROLES_READ, permissions.ROLES_UPDATE, permissions.ROLES_DELETE].filter(
        Boolean,
    ).length

    const buildRowActions = (role: RoleSummary): RowAction[] => {
        const rowActions: RowAction[] = []

        if (permissions.ROLES_READ) {
            rowActions.push({
                key: 'view',
                label: t('view'),
                ariaLabel: t('viewRole', { name: role.displayName }),
                icon: EyeIcon,
                onClick: () => actions.onView(role),
            })
        }
        if (permissions.ROLES_UPDATE) {
            rowActions.push({
                key: 'edit',
                label: t('edit'),
                ariaLabel: t('editRole', { name: role.displayName }),
                icon: PencilIcon,
                onClick: () => actions.onEdit(role),
                disabled: role.isSystem,
            })
        }
        if (permissions.ROLES_DELETE) {
            rowActions.push({
                key: 'delete',
                label: t('delete'),
                ariaLabel: t('deleteRole', { name: role.displayName }),
                icon: Trash2Icon,
                onClick: () => actions.onDelete(role),
                destructive: true,
                disabled: role.isSystem,
            })
        }

        return rowActions
    }

    return [
        {
            headerName: t('columnRoleName'),
            field: 'displayName',
            minWidth: 180,
            flex: 1.3,
        },
        {
            headerName: t('columnRoleKey'),
            field: 'name',
            width: 200,
            flex: 0,
            cellClass: 'font-mono text-xs text-muted-foreground',
        },
        {
            headerName: t('columnRoleType'),
            field: 'isSystem',
            width: 130,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<RoleSummary>) =>
                params.data ? (
                    <Badge variant={params.data.isSystem ? 'secondary' : 'outline'}>
                        {t(params.data.isSystem ? 'system' : 'custom')}
                    </Badge>
                ) : null,
        },
        {
            headerName: t('columnCreatedAt'),
            field: 'createdAt',
            width: 195,
            flex: 0,
            valueFormatter: (params) => formatTimestamp(params.value as string),
        },
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
                      context: AG_GRID_NO_EXPORT,
                      cellRenderer: (params: ICellRendererParams<RoleSummary>) =>
                          params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
                  },
              ]
            : []),
    ]
}
