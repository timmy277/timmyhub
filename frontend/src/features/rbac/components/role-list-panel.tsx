import { getTranslations } from 'next-intl/server'

import type { RoleSummary } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { RbacPanelError } from './rbac-panel-error'
import { RoleTable } from './role-table'

interface RoleListPanelProps {
    permissions: RbacPermissionFlags
}

// Tab danh sách vai trò: Server Component tải **trọn** danh mục (backend trả mảng, không phân trang) rồi giao cho
// `RoleTable` (client) lo phần tương tác. Không có access token nào đi xuống client.
//
// Chỉ tab này mới gọi endpoint danh sách — mở tab tạo/sửa/chi tiết thì không tốn thêm một vòng request vô ích.
export async function RoleListPanel({ permissions }: RoleListPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <RbacPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<RoleSummary[]>(API_ROUTE.RBAC.ROLES, { token: actor.accessToken })

    return (
        <RoleTable
            rows={result.ok ? result.data : []}
            permissions={permissions}
            error={result.ok ? undefined : result.code === 'FORBIDDEN' ? t('noPermissionDescription') : t('loadFailed')}
        />
    )
}
