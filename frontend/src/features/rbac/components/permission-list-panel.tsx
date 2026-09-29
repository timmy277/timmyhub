import { getTranslations } from 'next-intl/server'

import type { PermissionSummary } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { PermissionTable } from './permission-table'
import { RbacPanelError } from './rbac-panel-error'

interface PermissionListPanelProps {
    permissions: RbacPermissionFlags
}

// Tab danh sách quyền: Server Component tải trọn danh mục (backend trả mảng, đã sắp theo module → resource → action)
// rồi giao cho `PermissionTable` (client) lo phần tương tác.
export async function PermissionListPanel({ permissions }: PermissionListPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <RbacPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<PermissionSummary[]>(API_ROUTE.RBAC.PERMISSIONS, { token: actor.accessToken })

    return (
        <PermissionTable
            rows={result.ok ? result.data : []}
            permissions={permissions}
            error={result.ok ? undefined : result.code === 'FORBIDDEN' ? t('noPermissionDescription') : t('loadFailed')}
        />
    )
}
