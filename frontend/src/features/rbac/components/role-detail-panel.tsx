import { getTranslations } from 'next-intl/server'

import type { RoleDetail } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { RbacPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { RbacPanelError } from './rbac-panel-error'
import { RoleDetailView } from './role-detail-view'

interface RoleDetailPanelProps {
    roleId: string
    permissions: RbacPermissionFlags
    actorId: string
}

// Tab "Chi tiết" vai trò. Server Component: tự lấy phiên rồi tải chi tiết ngay trên server, nên tab này không cần
// react-query cho đường đọc và không có màn nháy skeleton.
//
// Vào được không phụ thuộc role: chỉ cần `rbac:roles:read`, thiếu thì thấy khối "không có quyền" — cùng câu trả lời
// mà backend sẽ đưa ra (403) nếu gọi thẳng.
export async function RoleDetailPanel({ roleId, permissions, actorId }: RoleDetailPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Derived =====
    if (!permissions.ROLES_READ) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <RbacPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<RoleDetail>(API_ROUTE.RBAC.ROLE(roleId), { token: actor.accessToken })

    if (!result.ok) {
        // 404 là chuyện thường gặp (vai trò vừa bị xoá, hoặc ai đó dán id sai) nên phải nói đúng chuyện gì xảy ra,
        // không gộp chung thành "tải thất bại".
        return (
            <RbacPanelError description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')} />
        )
    }

    return <RoleDetailView role={result.data} permissions={permissions} actorId={actorId} />
}
