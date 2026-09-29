'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseISO } from 'date-fns'
import { CalendarDaysIcon, FingerprintIcon, KeyRoundIcon, PencilIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { RoleDetail } from '@timmyhub/contracts'

import { Button, ConfirmDialog } from '@/components'
import { Badge } from '@/components/ui'
import { RBAC_KIND, RBAC_TAB } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { useDeleteRole } from '@/hooks'
import { formatDisplayDate } from '@/utils'

import { buildRbacTabsHref, parseRbacTabKeys, withoutRbacTab, type RbacTabItem } from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface RoleDetailViewProps {
    role: RoleDetail
    permissions: RbacPermissionFlags
    // Khoá localStorage của danh sách tab mở là (loại màn, **tài khoản**), không phải id bản ghi — xem
    // `rbac-tabs-storage.rbacTabsStorageKey`.
    actorId: string
}

// Nội dung tab "Chi tiết" vai trò. Là client component vì phần thao tác cần state (hộp xác nhận xoá); còn dữ liệu thì
// Server Component đã tải sẵn và truyền xuống — client không tự gọi backend.
//
// Tập quyền chỉ có **tên** (`identity:users:list`) chứ không kèm mô tả/module, nên nhóm theo tiền tố `module:` ngay
// trên tên — đủ để màn hình đọc được theo cụm mà không phải gọi thêm endpoint danh mục quyền.
// 7 trạng thái: mặc định · đang tải (dữ liệu đã sẵn, nút đang gửi mới quay) · rỗng (chưa gán quyền nào) · lỗi (panel
// cha lo) · không có quyền (nút thao tác ẩn theo `permissions`) · vô hiệu hoá (vai trò hệ thống) · thành công (toast +
// quay về danh sách).
export function RoleDetailView({ role, permissions, actorId }: RoleDetailViewProps) {
    // ===== State =====
    const [pendingDelete, setPendingDelete] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const detailTab: RbacTabItem = { tab: RBAC_TAB.DETAIL, id: role.id }

    // Xoá xong thì tab Chi tiết trỏ vào bản ghi không còn tồn tại, nên phải gỡ nó khỏi localStorage rồi quay về danh
    // sách — để nguyên thì lần sau mở lại là một tab chết.
    const removeRole = useDeleteRole({
        onSucceeded: () => {
            const stored = parseRbacTabKeys(
                RBAC_KIND.ROLES,
                JSON.parse(getOpenRbacTabsSnapshot(RBAC_KIND.ROLES, actorId)),
            )
            writeOpenRbacTabs(RBAC_KIND.ROLES, actorId, withoutRbacTab(stored, detailTab))
            router.push(buildRbacTabsHref(pathname, searchParams, { tab: RBAC_TAB.LIST }))
        },
    })

    // ===== Derived =====
    const permissionGroups = useMemo(() => {
        const groups = new Map<string, string[]>()
        for (const name of role.permissionNames) {
            const moduleName = name.split(':')[0] ?? name
            const bucket = groups.get(moduleName)
            if (bucket) bucket.push(name)
            else groups.set(moduleName, [name])
        }
        return [...groups.entries()]
    }, [role.permissionNames])

    // Mở tab Sửa **thêm một tab** bên cạnh tab Chi tiết đang xem, không thay thế nó: tab Chi tiết vẫn nằm trên thanh
    // tab để quay lại. RbacTabs sẽ ghi tab mới vào localStorage khi URL active đổi.
    const editHref = buildRbacTabsHref(pathname, searchParams, { tab: RBAC_TAB.UPDATE, id: role.id })

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                        aria-hidden="true"
                    >
                        <ShieldCheckIcon className="size-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h1 className="truncate text-xl font-semibold tracking-tight">{role.displayName}</h1>
                            <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                                {t(role.isSystem ? 'system' : 'custom')}
                            </Badge>
                        </div>
                        <p className="mt-1 truncate font-mono text-sm text-muted-foreground">{role.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <KeyRoundIcon className="size-3.5" />
                                {t('detailPermissionCount', { count: role.permissionNames.length })}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <FingerprintIcon className="size-3.5" />
                                {t('detailRoleId', { id: role.id })}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {permissions.ROLES_UPDATE && permissions.ROLES_READ && (
                        <Button type="button" variant="outline" asChild>
                            <Link href={editHref}>
                                <PencilIcon data-icon="inline-start" />
                                {t('edit')}
                            </Link>
                        </Button>
                    )}
                    {permissions.ROLES_DELETE && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setPendingDelete(true)}
                            // Vai trò hệ thống không xoá được (backend trả `ROLE_IS_SYSTEM`); nói trước thay vì để
                            // người dùng bấm rồi nhận lỗi.
                            disabled={removeRole.isPending || role.isSystem}
                        >
                            <Trash2Icon data-icon="inline-start" />
                            {t('delete')}
                        </Button>
                    )}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <DetailSection icon={<ShieldCheckIcon />} title={t('detailSectionInfo')}>
                    <dl className="grid gap-x-6 gap-y-5">
                        <DetailItem label={t('fieldRoleName')}>
                            <span className="font-mono">{role.name}</span>
                        </DetailItem>
                        <DetailItem label={t('fieldRoleDisplayName')}>{role.displayName}</DetailItem>
                        <DetailItem label={t('fieldRoleDescription')}>{role.description ?? t('notUpdated')}</DetailItem>
                    </dl>
                </DetailSection>

                <DetailSection icon={<CalendarDaysIcon />} title={t('detailSectionTimestamps')}>
                    <dl className="grid gap-x-6 gap-y-5">
                        <DetailItem label={t('columnCreatedAt')}>
                            {formatDisplayDate(parseISO(role.createdAt))}
                        </DetailItem>
                        <DetailItem label={t('columnRoleType')}>
                            <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                                {t(role.isSystem ? 'system' : 'custom')}
                            </Badge>
                        </DetailItem>
                    </dl>
                </DetailSection>

                <DetailSection icon={<KeyRoundIcon />} title={t('detailSectionPermissions')} className="lg:col-span-2">
                    {permissionGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('noPermissionsAssigned')}</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {permissionGroups.map(([moduleName, names]) => (
                                <div key={moduleName} className="rounded-lg border">
                                    <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
                                        <Badge variant="secondary">{moduleName}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {t('permissionCount', { count: names.length })}
                                        </span>
                                    </div>
                                    <ul className="grid gap-1 p-2 sm:grid-cols-2">
                                        {names.map((name) => (
                                            <li key={name} className="truncate px-2 py-1.5 font-mono text-xs">
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </DetailSection>
            </section>

            <ConfirmDialog
                open={pendingDelete}
                onOpenChange={setPendingDelete}
                title={t('deleteRoleTitle')}
                description={t('confirmDeleteRole', { name: role.displayName })}
                confirmLabel={t('delete')}
                variant="destructive"
                onConfirm={async () => {
                    await removeRole.mutateAsync({ roleId: role.id })
                }}
            />
        </div>
    )
}

function DetailSection({
    icon,
    title,
    children,
    className,
}: {
    icon: ReactNode
    title: string
    children: ReactNode
    className?: string
}) {
    return (
        <section className={`rounded-xl border p-5 ${className ?? ''}`}>
            <div className="mb-5 flex items-center gap-2">
                <span className="text-primary [&_svg]:size-4">{icon}</span>
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            {children}
        </section>
    )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <dt className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground">{children}</dd>
        </div>
    )
}
