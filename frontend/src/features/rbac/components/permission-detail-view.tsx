'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FingerprintIcon, KeyRoundIcon, Trash2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { PermissionSummary } from '@timmyhub/contracts'

import { Button, ConfirmDialog } from '@/components'
import { Badge } from '@/components/ui'
import { RBAC_KIND, RBAC_TAB } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { useDeletePermission } from '@/hooks'

import { buildRbacTabsHref, parseRbacTabKeys, withoutRbacTab, type RbacTabItem } from '../rbac-tab-query'
import { getOpenRbacTabsSnapshot, writeOpenRbacTabs } from '../rbac-tabs-storage'

interface PermissionDetailViewProps {
    permission: PermissionSummary
    permissions: RbacPermissionFlags
    // Khoá localStorage của danh sách tab mở là (loại màn, tài khoản) — xem `rbac-tabs-storage`.
    actorId: string
}

// Nội dung tab "Chi tiết" quyền: tên quyền (`module:resource:action`), mô tả, và ba phần đã tách sẵn ở backend.
// Không có nút Sửa vì backend chưa có endpoint sửa permission.
// 7 trạng thái: mặc định · đang tải (dữ liệu đã sẵn, nút đang gửi mới quay) · rỗng (N/A) · lỗi (panel cha lo) ·
// không có quyền (nút thao tác ẩn theo `permissions`) · vô hiệu hoá (đang gửi) · thành công (toast + quay về danh sách).
export function PermissionDetailView({ permission, permissions, actorId }: PermissionDetailViewProps) {
    // ===== State =====
    const [pendingDelete, setPendingDelete] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('rbac')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const detailTab: RbacTabItem = { tab: RBAC_TAB.DETAIL, id: permission.id }

    // Xoá xong thì tab Chi tiết trỏ vào bản ghi không còn tồn tại, nên gỡ nó khỏi localStorage rồi quay về danh sách.
    const removePermission = useDeletePermission({
        onSucceeded: () => {
            const stored = parseRbacTabKeys(
                RBAC_KIND.PERMISSIONS,
                JSON.parse(getOpenRbacTabsSnapshot(RBAC_KIND.PERMISSIONS, actorId)),
            )
            writeOpenRbacTabs(RBAC_KIND.PERMISSIONS, actorId, withoutRbacTab(stored, detailTab))
            router.push(buildRbacTabsHref(pathname, searchParams, { tab: RBAC_TAB.LIST }))
        },
    })

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                        aria-hidden="true"
                    >
                        <KeyRoundIcon className="size-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h1 className="truncate text-xl font-semibold tracking-tight">{permission.displayName}</h1>
                            <Badge variant="secondary">{permission.module}</Badge>
                        </div>
                        <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{permission.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <FingerprintIcon className="size-3.5" />
                                {t('detailPermissionId', { id: permission.id })}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {permissions.PERMISSIONS_DELETE && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setPendingDelete(true)}
                            disabled={removePermission.isPending}
                        >
                            <Trash2Icon data-icon="inline-start" />
                            {t('delete')}
                        </Button>
                    )}
                </div>
            </section>

            <section className="rounded-xl border p-5">
                <div className="mb-5 flex items-center gap-2">
                    <span className="text-primary [&_svg]:size-4">
                        <KeyRoundIcon />
                    </span>
                    <h2 className="text-sm font-semibold">{t('detailSectionPermissionKey')}</h2>
                </div>
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                    <DetailItem label={t('fieldPermissionModule')}>
                        <Badge variant="secondary">{permission.module}</Badge>
                    </DetailItem>
                    <DetailItem label={t('fieldPermissionResource')}>
                        <span className="font-mono">{permission.resource}</span>
                    </DetailItem>
                    <DetailItem label={t('fieldPermissionAction')}>
                        <span className="font-mono">{permission.action}</span>
                    </DetailItem>
                    <DetailItem label={t('fieldPermissionDisplayName')}>{permission.displayName}</DetailItem>
                </dl>
            </section>

            <ConfirmDialog
                open={pendingDelete}
                onOpenChange={setPendingDelete}
                title={t('deletePermissionTitle')}
                description={t('confirmDeletePermission', { name: permission.name })}
                confirmLabel={t('delete')}
                variant="destructive"
                onConfirm={async () => {
                    await removePermission.mutateAsync({ permissionId: permission.id })
                }}
            />
        </div>
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
