import { getTranslations } from 'next-intl/server'

import type { PermissionSummary } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { PermissionDetailView } from './permission-detail-view'
import { RbacPanelError } from './rbac-panel-error'

interface PermissionDetailPanelProps {
    permissionId: string
    permissions: RbacPermissionFlags
    actorId: string
}

// Tab "Chi tiết" quyền. Server Component tải chi tiết ngay trên server; chỉ cần `rbac:permissions:read` — endpoint
// chi tiết tách khỏi danh sách đúng vì lý do này (xem `RbacController.getPermission`).
export async function PermissionDetailPanel({ permissionId, permissions, actorId }: PermissionDetailPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Derived =====
    if (!permissions.PERMISSIONS_READ) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <RbacPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<PermissionSummary>(API_ROUTE.RBAC.PERMISSION(permissionId), {
        token: actor.accessToken,
    })

    if (!result.ok) {
        return (
            <RbacPanelError description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')} />
        )
    }

    return <PermissionDetailView permission={result.data} permissions={permissions} actorId={actorId} />
}
