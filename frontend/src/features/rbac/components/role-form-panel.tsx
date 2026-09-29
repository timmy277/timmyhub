import { getTranslations } from 'next-intl/server'

import type { PermissionSummary, RoleDetail } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { RbacPanelError } from './rbac-panel-error'
import { RoleForm } from './role-form'

interface RoleFormPanelProps {
    // `create` = tab Tạo (không có `roleId`); `edit` = tab Cập nhật (có `roleId`).
    mode: 'create' | 'edit'
    roleId?: string
    permissions: RbacPermissionFlags
    actorId: string
}

// Tab "Tạo" / "Cập nhật" vai trò. Server Component tải bản ghi (khi sửa) rồi đưa giá trị hiện tại xuống `RoleForm`
// (client) — form không tự gọi backend để lấy dữ liệu khởi tạo, nên không có trạng thái "đang tải" cho phần điền sẵn.
//
// Cần cả `read` lẫn `update` khi sửa: form lấy giá trị hiện tại (kể cả tập quyền) từ endpoint chi tiết, mà endpoint đó
// đòi `rbac:roles:read`.
export async function RoleFormPanel({ mode, roleId, permissions, actorId }: RoleFormPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Derived =====
    const canEdit = permissions.ROLES_UPDATE && permissions.ROLES_READ
    if (mode === 'edit' && (!canEdit || !roleId)) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <RbacPanelError description={t('sessionExpired')} />

    // Danh mục quyền chỉ cần khi có thể gán: thiếu `rbac:permissions:list` thì form vẫn lưu được metadata, chỉ là
    // không hiện được phần chọn quyền.
    const canAssignPermissions = permissions.ROLE_PERMISSIONS_ASSIGN && permissions.PERMISSIONS_LIST

    let role: RoleDetail | undefined
    if (mode === 'edit' && roleId) {
        const result = await fetchBackend<RoleDetail>(API_ROUTE.RBAC.ROLE(roleId), { token: actor.accessToken })
        if (!result.ok) {
            return (
                <RbacPanelError
                    description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')}
                />
            )
        }
        role = result.data
    }

    let permissionCatalog: PermissionSummary[] = []
    if (canAssignPermissions) {
        const result = await fetchBackend<PermissionSummary[]>(API_ROUTE.RBAC.PERMISSIONS, {
            token: actor.accessToken,
        })
        permissionCatalog = result.ok ? result.data : []
    }

    return (
        <RoleForm
            // Dữ liệu đổi (đặc biệt là tập quyền) thì phải dựng lại form: `useState` chỉ nhận giá trị khởi tạo một lần,
            // nên sau `router.refresh()` form sẽ giữ tập quyền cũ nếu không remount.
            key={role ? `${role.id}:${role.permissionNames.join(',')}` : 'create'}
            role={role}
            permissionCatalog={permissionCatalog}
            canAssignPermissions={canAssignPermissions}
            flags={permissions}
            actorId={actorId}
        />
    )
}
