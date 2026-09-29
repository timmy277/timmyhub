import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EyeIcon, Trash2Icon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import type { PermissionSummary } from '@timmyhub/contracts'

import { RowActions, type RowAction } from '@/components'
import { Badge } from '@/components/ui'
import type { RbacPermissionFlags } from '@/constants'
import { AG_GRID_NO_EXPORT } from '@/constants'
import { rowActionsColumnWidth } from '@/utils'

type RbacTranslator = ReturnType<typeof useTranslations<'rbac'>>

export type PermissionColumnActions = {
    onView: (permission: PermissionSummary) => void
    onDelete: (permission: PermissionSummary) => void
}

// Cột bảng danh sách quyền. Cùng khuôn với `roles.columns.tsx`: hàm thuần, danh sách nhỏ nên AG Grid tự sắp xếp/lọc
// tại chỗ trên toàn bộ dữ liệu đã tải.
export function createPermissionColumns({
    t,
    permissions,
    actions,
}: {
    t: RbacTranslator
    permissions: RbacPermissionFlags
    actions: PermissionColumnActions
}): ColDef<PermissionSummary>[] {
    const actionCount = [permissions.PERMISSIONS_READ, permissions.PERMISSIONS_DELETE].filter(Boolean).length

    const buildRowActions = (permission: PermissionSummary): RowAction[] => {
        const rowActions: RowAction[] = []

        if (permissions.PERMISSIONS_READ) {
            rowActions.push({
                key: 'view',
                label: t('view'),
                ariaLabel: t('viewPermission', { name: permission.name }),
                icon: EyeIcon,
                onClick: () => actions.onView(permission),
            })
        }
        if (permissions.PERMISSIONS_DELETE) {
            rowActions.push({
                key: 'delete',
                label: t('delete'),
                ariaLabel: t('deletePermission', { name: permission.name }),
                icon: Trash2Icon,
                onClick: () => actions.onDelete(permission),
                destructive: true,
            })
        }

        return rowActions
    }

    return [
        {
            headerName: t('columnPermission'),
            field: 'name',
            minWidth: 240,
            flex: 1.4,
            cellClass: 'font-mono text-xs',
        },
        {
            headerName: t('columnModule'),
            field: 'module',
            width: 150,
            flex: 0,
            cellRenderer: (params: ICellRendererParams<PermissionSummary>) =>
                params.data ? <Badge variant="secondary">{params.data.module}</Badge> : null,
        },
        {
            headerName: t('columnResource'),
            field: 'resource',
            width: 160,
            flex: 0,
        },
        {
            headerName: t('columnAction'),
            field: 'action',
            width: 150,
            flex: 0,
            cellClass: 'font-mono text-xs',
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
                      cellRenderer: (params: ICellRendererParams<PermissionSummary>) =>
                          params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
                  },
              ]
            : []),
    ]
}
