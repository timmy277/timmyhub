import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EyeIcon, LockIcon, LockOpenIcon, PencilIcon, type LucideIcon } from 'lucide-react'
import type { useTranslations } from 'next-intl'
import { parseISO } from 'date-fns'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    AG_GRID_NO_EXPORT,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    formatDisplayDate,
} from '@/components'
import { cn, getInitials } from '@/utils'

import type { DemoUser, UserRole } from '../mock-users'

type UserManagementTranslator = ReturnType<typeof useTranslations<'userManagement'>>

const ROLE_LABEL_KEY = {
    USER: 'roleUser',
    SELLER: 'roleSeller',
    SHIPPER: 'roleShipper',
    ADMIN: 'roleAdmin',
    SUPER_ADMIN: 'roleSuperAdmin',
} as const satisfies Record<UserRole, string>

const ROLE_BADGE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    SUPER_ADMIN: 'destructive',
    ADMIN: 'destructive',
    SELLER: 'default',
    SHIPPER: 'secondary',
    USER: 'outline',
}

// Tên hiển thị theo thứ tự tiếng Việt: họ trước tên. Chưa có profile thì trả `null` để cột tự hiện "Chưa cập nhật".
export function getUserDisplayName(user: DemoUser): string | null {
    if (!user.profile) return null
    return `${user.profile.lastName} ${user.profile.firstName}`.trim()
}

export interface UserColumnActions {
    onDetail: (user: DemoUser) => void
    onUpdate: (user: DemoUser) => void
    onToggleStatus: (user: DemoUser) => void
}

interface RowAction {
    key: string
    label: string
    Icon: LucideIcon
    onClick: () => void
    className?: string
    disabled?: boolean
}

// Cột bảng user theo `createUserColumns` + `createActionColumn` của TimmyHub gốc.
export function createUserColumns(t: UserManagementTranslator, actions: UserColumnActions): ColDef<DemoUser>[] {
    const roleLabel = (role: UserRole) => t(ROLE_LABEL_KEY[role])

    return [
        {
            headerName: t('columnAvatar'),
            colId: 'avatar',
            width: 100,
            flex: 0,
            sortable: false,
            filter: false,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<DemoUser>) => {
                const user = params.data
                if (!user) return null
                return (
                    <Avatar>
                        {user.profile?.avatarUrl && <AvatarImage src={user.profile.avatarUrl} alt="" />}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(getUserDisplayName(user) ?? user.email)}
                        </AvatarFallback>
                    </Avatar>
                )
            },
        },
        {
            headerName: t('columnName'),
            colId: 'name',
            minWidth: 170,
            valueGetter: (params) => (params.data ? (getUserDisplayName(params.data) ?? t('notUpdated')) : ''),
            cellClassRules: { 'text-muted-foreground italic': (params) => !params.data?.profile },
        },
        {
            headerName: t('columnEmail'),
            field: 'email',
            minWidth: 240,
        },
        {
            headerName: t('columnRoles'),
            field: 'roles',
            minWidth: 190,
            // Lọc, tìm nhanh và xuất CSV theo nhãn đã dịch thay vì mã enum.
            valueFormatter: (params) => (params.value as UserRole[] | undefined)?.map(roleLabel).join(', ') ?? '',
            filterValueGetter: (params) => params.data?.roles.map(roleLabel).join(', ') ?? '',
            getQuickFilterText: (params) => (params.value as UserRole[]).map(roleLabel).join(' '),
            cellRenderer: (params: ICellRendererParams<DemoUser, UserRole[]>) => (
                <div className="flex flex-wrap justify-center gap-1">
                    {params.value?.map((role) => (
                        <Badge key={role} variant={ROLE_BADGE_VARIANT[role]}>
                            {roleLabel(role)}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            headerName: t('columnStatus'),
            field: 'isActive',
            width: 150,
            flex: 0,
            valueFormatter: (params) => (params.value ? t('statusActive') : t('statusInactive')),
            filterValueGetter: (params) => (params.data?.isActive ? t('statusActive') : t('statusInactive')),
            getQuickFilterText: (params) => (params.value ? t('statusActive') : t('statusInactive')),
            cellRenderer: (params: ICellRendererParams<DemoUser, boolean>) => (
                <Badge variant="outline">
                    <span
                        aria-hidden
                        className={cn('size-1.5 rounded-full', params.value ? 'bg-primary' : 'bg-destructive')}
                    />
                    {params.value ? t('statusActive') : t('statusInactive')}
                </Badge>
            ),
        },
        {
            headerName: t('columnMemberSince'),
            field: 'createdAt',
            width: 160,
            flex: 0,
            filter: 'agDateColumnFilter',
            filterValueGetter: (params) => (params.data ? parseISO(params.data.createdAt) : null),
            valueFormatter: (params) => (params.value ? formatDisplayDate(parseISO(params.value as string)) : ''),
        },
        {
            headerName: t('columnActions'),
            colId: 'actions',
            pinned: 'right',
            width: 150,
            flex: 0,
            sortable: false,
            filter: false,
            resizable: false,
            suppressHeaderMenuButton: true,
            context: AG_GRID_NO_EXPORT,
            cellRenderer: (params: ICellRendererParams<DemoUser>) => {
                const user = params.data
                if (!user) return null
                // Theo spec user-profile: không ai khoá được tài khoản SUPER_ADMIN từ bảng này.
                const isProtected = user.roles.includes('SUPER_ADMIN')
                const rowActions: RowAction[] = [
                    { key: 'view', label: t('view'), Icon: EyeIcon, onClick: () => actions.onDetail(user) },
                    { key: 'edit', label: t('edit'), Icon: PencilIcon, onClick: () => actions.onUpdate(user) },
                    {
                        key: 'toggle',
                        label: isProtected ? t('superAdminProtected') : user.isActive ? t('lock') : t('unlock'),
                        Icon: user.isActive ? LockIcon : LockOpenIcon,
                        onClick: () => actions.onToggleStatus(user),
                        className: user.isActive ? 'text-destructive hover:text-destructive' : undefined,
                        disabled: isProtected,
                    },
                ]
                return (
                    <div className="flex items-center gap-1">
                        {rowActions.map(({ key, label, Icon, onClick, className, disabled }) => (
                            <Tooltip key={key}>
                                <TooltipTrigger asChild>
                                    {/* Bọc span để tooltip vẫn hiện khi nút bị vô hiệu hoá (nút disabled không nhận hover). */}
                                    <span tabIndex={disabled ? 0 : undefined}>
                                        <Button
                                            type="button"
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label={`${label} ${user.email}`}
                                            className={className}
                                            disabled={disabled}
                                            onClick={onClick}
                                        >
                                            <Icon />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>{label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )
            },
        },
    ]
}
