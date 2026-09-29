'use client'

import { useState } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { UserRole } from '@timmyhub/contracts'
import { USER_ROLES } from '@timmyhub/contracts'

import { Button, ConfirmDialog, EmptyState, FloatCombobox, ON_CARD_LABEL_CLASS, RoleBadges } from '@/components'
import type { UserPermissionFlags } from '@/constants'
import { ROLE_LABEL_KEY } from '@/constants'
import { useUserRole } from '@/hooks'

interface UserRolesSectionProps {
    userId: string
    email: string
    roles: UserRole[]
    permissions: UserPermissionFlags
    currentUserId: string
}

// Phần gán/gỡ vai trò trong tab "Chi tiết". Tách riêng khỏi phần hồ sơ vì chỉ mục này cần client — nó gọi mutation,
// còn hồ sơ thì Server Component render sẵn.
// 7 trạng thái: mặc định · đang tải (nút đang gửi) · rỗng (chưa có vai trò → EmptyState) · lỗi (toast ở hook) ·
// không có quyền (nút thêm/gỡ ẩn theo `permissions`) · vô hiệu hoá (chưa chọn vai trò thì nút Thêm không bấm được) ·
// thành công (toast + bảng dựng lại).
export function UserRolesSection({ userId, email, roles, permissions, currentUserId }: UserRolesSectionProps) {
    // ===== State =====
    const [roleToAdd, setRoleToAdd] = useState<string | null>(null)
    const [roleToRevoke, setRoleToRevoke] = useState<UserRole | null>(null)

    // ===== Hooks =====
    const t = useTranslations('userManagement')
    const tRole = useTranslations('role')
    const { assign, revoke } = useUserRole({ onSucceeded: () => setRoleToRevoke(null) })

    // ===== Derived =====
    // Gán/gỡ vai trò của chính mình bị `RbacService.assertNotSelf` chặn ở backend (`CANNOT_MODIFY_SELF`, 422) — cùng
    // luật với khoá/xoá tài khoản. Giao diện ẩn nút để người quản trị khỏi bấm vào chỗ chắc chắn hỏng, và thay bằng
    // dòng nhắc `rolesSelfHint` bên dưới.
    const isSelf = userId === currentUserId
    const canManageRoles = permissions.ASSIGN_ROLE && !isSelf
    const assignableRoles = USER_ROLES.filter((role) => !roles.includes(role))
    const roleOptions = assignableRoles.map((role) => ({ value: role, label: tRole(ROLE_LABEL_KEY[role]) }))

    // ===== Handlers =====
    const handleAssign = () => {
        if (!roleToAdd) return
        assign.mutate({ userId, roleName: roleToAdd }, { onSuccess: () => setRoleToAdd(null) })
    }

    return (
        <>
            <section className="flex flex-col gap-3 rounded-lg border p-3">
                <h3 className="text-sm font-medium">{t('rolesTitle')}</h3>

                {roles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                            <span key={role} className="flex items-center gap-1">
                                <RoleBadges roles={[role]} />
                                {canManageRoles && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={t('removeRoleAria', {
                                            role: tRole(ROLE_LABEL_KEY[role]),
                                            email,
                                        })}
                                        disabled={revoke.isPending}
                                        onClick={() => setRoleToRevoke(role)}
                                    >
                                        <XIcon />
                                    </Button>
                                )}
                            </span>
                        ))}
                    </div>
                ) : (
                    <EmptyState title={t('noRolesTitle')} description={t('noRolesDescription')} />
                )}

                {canManageRoles && assignableRoles.length > 0 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <FloatCombobox
                            label={t('roleToAdd')}
                            options={roleOptions}
                            value={roleToAdd}
                            onValueChange={setRoleToAdd}
                            disabled={assign.isPending}
                            className="sm:max-w-xs"
                            labelClassName={ON_CARD_LABEL_CLASS}
                        />
                        <Button type="button" onClick={handleAssign} disabled={!roleToAdd || assign.isPending}>
                            <PlusIcon data-icon="inline-start" />
                            {t('addRole')}
                        </Button>
                    </div>
                )}

                {permissions.ASSIGN_ROLE && isSelf && (
                    <p className="text-xs text-muted-foreground">{t('rolesSelfHint')}</p>
                )}
            </section>

            <ConfirmDialog
                open={roleToRevoke !== null}
                onOpenChange={(open) => (open ? undefined : setRoleToRevoke(null))}
                title={t('confirmRevokeRoleTitle')}
                description={
                    roleToRevoke && t('confirmRevokeRole', { role: tRole(ROLE_LABEL_KEY[roleToRevoke]), email })
                }
                confirmLabel={t('removeRole')}
                variant="destructive"
                onConfirm={() => {
                    if (roleToRevoke) revoke.mutate({ userId, roleName: roleToRevoke })
                }}
            />
        </>
    )
}
