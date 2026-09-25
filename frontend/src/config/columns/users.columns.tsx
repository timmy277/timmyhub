import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { parseISO } from 'date-fns'
import { EyeIcon, LockIcon, LockOpenIcon, PencilIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'

import { isSuperAdmin, type UserRole } from '@timmyhub/contracts'

import { RoleBadges, RowActions, StatusBadge, UserAvatar, type RowAction } from '@/components'
import {
    AG_GRID_NO_EXPORT,
    AVATAR_COLUMN_WIDTH_PX,
    ROLE_LABEL_KEY,
    ROW_ACTIONS_COLUMN_WIDTH_PX,
    StatusTone,
    USER_COLUMN_WIDTH_PX,
} from '@/constants'
import type { DemoUser } from '@/types'
import { formatDisplayDate, getUserDisplayName } from '@/utils'

type UserManagementTranslator = ReturnType<typeof useTranslations<'userManagement'>>
type RoleTranslator = ReturnType<typeof useTranslations<'role'>>

export interface UserColumnActions {
    onDetail: (user: DemoUser) => void
    onUpdate: (user: DemoUser) => void
    onToggleStatus: (user: DemoUser) => void
}

interface CreateUserColumnsOptions {
    t: UserManagementTranslator
    tRole: RoleTranslator
    actions: UserColumnActions
}

// Cột bảng user theo `createUserColumns` + `createActionColumn` của TimmyHub gốc. Hàm thuần, không hook — trang gọi
// trong `useMemo` với translator đã có.
export function createUserColumns({ t, tRole, actions }: CreateUserColumnsOptions): ColDef<DemoUser>[] {
    const roleLabel = (role: UserRole) => tRole(ROLE_LABEL_KEY[role])
    const statusLabel = (isActive: boolean | null | undefined) => (isActive ? t('statusActive') : t('statusInactive'))

    const buildRowActions = (user: DemoUser): RowAction[] => {
        // Theo spec user-profile: không ai khoá được tài khoản SUPER_ADMIN từ bảng này.
        const isProtected = isSuperAdmin(user.roles)
        const toggleLabel = isProtected ? t('superAdminProtected') : user.isActive ? t('lock') : t('unlock')
        const ariaLabel = (action: string) => t('rowActionAria', { action, target: user.email })

        return [
            {
                key: 'view',
                label: t('view'),
                ariaLabel: ariaLabel(t('view')),
                icon: EyeIcon,
                onClick: () => actions.onDetail(user),
            },
            {
                key: 'edit',
                label: t('edit'),
                ariaLabel: ariaLabel(t('edit')),
                icon: PencilIcon,
                onClick: () => actions.onUpdate(user),
            },
            {
                key: 'toggle',
                label: toggleLabel,
                ariaLabel: ariaLabel(toggleLabel),
                icon: user.isActive ? LockIcon : LockOpenIcon,
                onClick: () => actions.onToggleStatus(user),
                destructive: user.isActive && !isProtected,
                disabled: isProtected,
            },
        ]
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
            cellRenderer: (params: ICellRendererParams<DemoUser>) => {
                const user = params.data
                if (!user) return null
                return <UserAvatar name={getUserDisplayName(user) ?? user.email} imageUrl={user.profile?.avatarUrl} />
            },
        },
        {
            headerName: t('columnName'),
            colId: 'name',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_NAME,
            valueGetter: (params) => (params.data ? (getUserDisplayName(params.data) ?? t('notUpdated')) : ''),
            cellClassRules: { 'text-muted-foreground italic': (params) => !params.data?.profile },
        },
        {
            headerName: t('columnEmail'),
            field: 'email',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_EMAIL,
        },
        {
            headerName: t('columnRoles'),
            field: 'roles',
            minWidth: USER_COLUMN_WIDTH_PX.MIN_ROLES,
            // Lọc, tìm nhanh và xuất CSV theo nhãn đã dịch thay vì mã role.
            valueFormatter: (params) => (params.value as UserRole[] | undefined)?.map(roleLabel).join(', ') ?? '',
            filterValueGetter: (params) => params.data?.roles.map(roleLabel).join(', ') ?? '',
            getQuickFilterText: (params) => (params.value as UserRole[]).map(roleLabel).join(' '),
            cellRenderer: (params: ICellRendererParams<DemoUser, UserRole[]>) => (
                <RoleBadges roles={params.value ?? []} />
            ),
        },
        {
            headerName: t('columnStatus'),
            field: 'isActive',
            width: USER_COLUMN_WIDTH_PX.STATUS,
            flex: 0,
            valueFormatter: (params) => statusLabel(params.data?.isActive),
            filterValueGetter: (params) => statusLabel(params.data?.isActive),
            getQuickFilterText: (params) => statusLabel(params.data?.isActive),
            cellRenderer: (params: ICellRendererParams<DemoUser, boolean>) => (
                <StatusBadge
                    tone={params.value ? StatusTone.SUCCESS : StatusTone.DANGER}
                    label={statusLabel(params.value)}
                />
            ),
        },
        {
            headerName: t('columnMemberSince'),
            field: 'createdAt',
            width: USER_COLUMN_WIDTH_PX.MEMBER_SINCE,
            flex: 0,
            filter: 'agDateColumnFilter',
            filterValueGetter: (params) => (params.data ? parseISO(params.data.createdAt) : null),
            valueFormatter: (params) => (params.value ? formatDisplayDate(parseISO(params.value as string)) : ''),
        },
        {
            headerName: t('columnActions'),
            colId: 'actions',
            pinned: 'right',
            width: ROW_ACTIONS_COLUMN_WIDTH_PX,
            flex: 0,
            sortable: false,
            filter: false,
            resizable: false,
            suppressHeaderMenuButton: true,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<DemoUser>) =>
                params.data ? <RowActions actions={buildRowActions(params.data)} /> : null,
        },
    ]
}
