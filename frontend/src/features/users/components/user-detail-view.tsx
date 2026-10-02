'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
    CalendarDaysIcon,
    CheckIcon,
    FingerprintIcon,
    PencilIcon,
    ShieldCheckIcon,
    Trash2Icon,
    UserRoundIcon,
    XIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { UserDetail } from '@timmyhub/contracts'
import { UserStatus } from '@timmyhub/contracts'

import { Button, ConfirmDialog, RoleBadges, StatusBadge, UserAvatar } from '@/components'
import type { UserPermissionFlags } from '@/constants'
import { USER_STATUS_LABEL_KEY, USER_STATUS_TONE, USER_TAB } from '@/constants'
import { useDeleteUser } from '@/hooks'
import { formatTimestamp, getUserDisplayName } from '@/utils'

import { buildUserTabsHref } from '../user-tab-query'
import { UserLockDialog } from './user-lock-dialog'

interface UserDetailViewProps {
    user: UserDetail
    permissions: UserPermissionFlags
}

// Nội dung tab "Chi tiết". Là client component vì phần thao tác cần state (hộp xác nhận xoá, hộp nhập lý do khoá);
// còn dữ liệu thì Server Component đã tải sẵn và truyền xuống — client không tự gọi backend.
// 7 trạng thái: mặc định · đang tải (dữ liệu đã sẵn, nút đang gửi mới quay) · rỗng (chưa có hồ sơ → "chưa cập nhật") ·
// lỗi (panel cha lo) · không có quyền (nút thao tác ẩn theo `permissions`) · vô hiệu hoá (nút đang gửi) ·
// thành công (toast + bảng dựng lại).
export function UserDetailView({ user, permissions }: UserDetailViewProps) {
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
    const displayName = getUserDisplayName(user) ?? user.email

    // Mở tab Sửa **thêm một tab** bên cạnh tab Chi tiết đang xem, không thay thế nó: tab Chi tiết vẫn nằm trên thanh
    // tab để quay lại. UserTabs sẽ ghi tab mới vào localStorage khi URL active đổi.
    const editHref = buildUserTabsHref(pathname, searchParams, { tab: USER_TAB.UPDATE, id: user.id })

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-5 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <UserAvatar
                        name={displayName}
                        imageUrl={user.profile?.avatar}
                        className="size-14 shrink-0 rounded-2xl"
                        fallbackClassName="rounded-2xl text-lg font-semibold"
                    />
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
                            <RoleBadges roles={user.roles} />
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge
                                tone={USER_STATUS_TONE[user.status]}
                                label={t(USER_STATUS_LABEL_KEY[user.status])}
                            />
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <FingerprintIcon className="size-3.5" />
                                {t('detailAccountId', { id: user.id })}
                            </span>
                        </div>
                    </div>
                </div>
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
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <DetailSection icon={<UserRoundIcon />} title={t('detailSectionProfile')}>
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <DetailItem label={t('columnName')}>
                            {user.profile
                                ? `${user.profile.lastName} ${user.profile.firstName}`.trim()
                                : t('notUpdated')}
                        </DetailItem>
                        <DetailItem label={t('fieldDisplayName')}>
                            {user.profile?.displayName ?? t('notUpdated')}
                        </DetailItem>
                        <DetailItem label={t('columnEmail')}>{user.email}</DetailItem>
                        <DetailItem label={t('fieldPhone')}>{user.phone ?? t('notUpdated')}</DetailItem>
                    </dl>
                </DetailSection>

                <DetailSection icon={<ShieldCheckIcon />} title={t('detailSectionSecurity')}>
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <DetailItem label={t('columnStatus')}>
                            <StatusBadge
                                tone={USER_STATUS_TONE[user.status]}
                                label={t(USER_STATUS_LABEL_KEY[user.status])}
                            />
                        </DetailItem>
                        <DetailItem label={t('detailEmailVerified')}>
                            <BooleanValue value={user.isEmailVerified} yes={t('yes')} no={t('no')} />
                        </DetailItem>
                        <DetailItem label={t('detailTwoFactor')}>
                            <BooleanValue value={user.twoFactorEnabled} yes={t('yes')} no={t('no')} />
                        </DetailItem>
                        {user.banReason && (
                            <DetailItem label={t('detailBanReason')} className="sm:col-span-2">
                                {user.banReason}
                            </DetailItem>
                        )}
                    </dl>
                </DetailSection>

                <DetailSection icon={<CalendarDaysIcon />} title={t('detailSectionActivity')} className="lg:col-span-2">
                    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
                        <DetailItem label={t('columnMemberSince')}>
                            {formatTimestamp(user.createdAt) || t('never')}
                        </DetailItem>
                        <DetailItem label={t('detailLastLogin')}>
                            {formatTimestamp(user.lastLoginAt) || t('never')}
                        </DetailItem>
                        <DetailItem label={t('detailUpdatedAt')}>
                            {formatTimestamp(user.updatedAt) || t('never')}
                        </DetailItem>
                    </dl>
                </DetailSection>
            </section>

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

function DetailSection({
    icon,
    title,
    children,
    className,
}: {
    icon: React.ReactNode
    title: string
    children: React.ReactNode
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

function BooleanValue({ value, yes, no }: { value: boolean; yes: string; no: string }) {
    const Icon = value ? CheckIcon : XIcon
    return (
        <span className={`inline-flex items-center gap-1.5 ${value ? 'text-primary' : 'text-muted-foreground'}`}>
            <Icon className="size-4" />
            {value ? yes : no}
        </span>
    )
}

function DetailItem({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <dt className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground">{children}</dd>
        </div>
    )
}
