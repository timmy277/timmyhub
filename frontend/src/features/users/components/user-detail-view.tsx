'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { parseISO } from 'date-fns'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { UserDetail } from '@timmyhub/contracts'
import { UserStatus } from '@timmyhub/contracts'

import { Button, ConfirmDialog, StatusBadge } from '@/components'
import type { UserPermissionFlags } from '@/constants'
import { USER_STATUS_LABEL_KEY, USER_STATUS_TONE, USER_TAB } from '@/constants'
import { useDeleteUser } from '@/hooks'
import { formatDisplayDate } from '@/utils'

import { buildUserTabsHref } from '../user-tab-query'
import { UserLockDialog } from './user-lock-dialog'
import { UserRolesSection } from './user-roles-section'

interface UserDetailViewProps {
    user: UserDetail
    permissions: UserPermissionFlags
    currentUserId: string
}

// Nội dung tab "Chi tiết". Là client component vì phần thao tác cần state (hộp xác nhận xoá, hộp nhập lý do khoá);
// còn dữ liệu thì Server Component đã tải sẵn và truyền xuống — client không tự gọi backend.
// 7 trạng thái: mặc định · đang tải (dữ liệu đã sẵn, nút đang gửi mới quay) · rỗng (chưa có hồ sơ → "chưa cập nhật") ·
// lỗi (panel cha lo) · không có quyền (nút thao tác ẩn theo `permissions`) · vô hiệu hoá (nút đang gửi) ·
// thành công (toast + bảng dựng lại).
export function UserDetailView({ user, permissions, currentUserId }: UserDetailViewProps) {
    // ===== State =====
    const [pendingLock, setPendingLock] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(false)

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const removeUser = useDeleteUser({ onSucceeded: () => setPendingDelete(false) })

    // ===== Derived =====
    const isLocked = user.status === UserStatus.LOCKED

    // Mở tab Sửa **thêm một tab** bên cạnh tab Chi tiết đang xem, không thay thế nó: tab Chi tiết vẫn nằm trên thanh
    // tab để quay lại. UserTabs sẽ ghi tab mới vào localStorage khi URL active đổi.
    const editHref = buildUserTabsHref(pathname, searchParams, { tab: USER_TAB.UPDATE, id: user.id })

    const formatTimestamp = (value: string | null) => (value ? formatDisplayDate(parseISO(value)) : t('never'))

    return (
        <div className="flex flex-col gap-4">
            <dl className="grid max-w-3xl gap-x-6 gap-y-3 sm:grid-cols-2">
                <DetailItem label={t('columnName')}>
                    {user.profile ? `${user.profile.lastName} ${user.profile.firstName}`.trim() : t('notUpdated')}
                </DetailItem>
                <DetailItem label={t('fieldDisplayName')}>{user.profile?.displayName ?? t('notUpdated')}</DetailItem>
                <DetailItem label={t('columnEmail')}>{user.email}</DetailItem>
                <DetailItem label={t('fieldPhone')}>{user.phone ?? t('notUpdated')}</DetailItem>
                <DetailItem label={t('columnStatus')}>
                    <StatusBadge tone={USER_STATUS_TONE[user.status]} label={t(USER_STATUS_LABEL_KEY[user.status])} />
                </DetailItem>
                <DetailItem label={t('detailEmailVerified')}>{user.isEmailVerified ? t('yes') : t('no')}</DetailItem>
                <DetailItem label={t('detailTwoFactor')}>{user.twoFactorEnabled ? t('yes') : t('no')}</DetailItem>
                <DetailItem label={t('columnMemberSince')}>{formatTimestamp(user.createdAt)}</DetailItem>
                <DetailItem label={t('detailLastLogin')}>{formatTimestamp(user.lastLoginAt)}</DetailItem>
                <DetailItem label={t('detailUpdatedAt')}>{formatTimestamp(user.updatedAt)}</DetailItem>
                {user.banReason && (
                    <DetailItem label={t('detailBanReason')} className="sm:col-span-2">
                        {user.banReason}
                    </DetailItem>
                )}
            </dl>

            <UserRolesSection
                userId={user.id}
                email={user.email}
                roles={user.roles}
                permissions={permissions}
                currentUserId={currentUserId}
            />

            <div className="flex flex-wrap gap-2">
                {permissions.UPDATE && permissions.READ && (
                    <Button type="button" variant="outline" asChild>
                        <Link href={editHref}>
                            <PencilIcon data-icon="inline-start" />
                            {t('edit')}
                        </Link>
                    </Button>
                )}
                {permissions.LOCK && (
                    <Button
                        type="button"
                        variant={isLocked ? 'outline' : 'destructive'}
                        onClick={() => setPendingLock(true)}
                        disabled={removeUser.isPending}
                    >
                        {isLocked ? t('unlock') : t('lock')}
                    </Button>
                )}
                {permissions.DELETE && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setPendingDelete(true)}
                        disabled={removeUser.isPending}
                    >
                        <Trash2Icon data-icon="inline-start" />
                        {t('delete')}
                    </Button>
                )}
            </div>

            {pendingLock && <UserLockDialog user={user} onOpenChange={(open) => setPendingLock(open)} />}

            <ConfirmDialog
                open={pendingDelete}
                onOpenChange={setPendingDelete}
                title={t('deleteAccount')}
                description={t('confirmDelete', { email: user.email })}
                confirmLabel={t('deleteAccount')}
                variant="destructive"
                onConfirm={async () => {
                    await removeUser.mutateAsync({ userId: user.id })
                }}
            />
        </div>
    )
}

function DetailItem({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">{children}</dd>
        </div>
    )
}
