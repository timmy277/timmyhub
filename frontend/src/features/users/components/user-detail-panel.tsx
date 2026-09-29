import { getTranslations } from 'next-intl/server'

import type { UserDetail } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { UserPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { UserDetailView } from './user-detail-view'
import { UserPanelError } from './user-panel-error'

interface UserDetailPanelProps {
    userId: string
    permissions: UserPermissionFlags
}

// Tab "Chi tiết" (FEAT-USR-010). Server Component: tự lấy phiên rồi tải chi tiết ngay trên server, nên tab này không
// cần react-query cho đường đọc và không có màn nháy skeleton như hồi còn là hộp thoại.
//
// Ai vào được không phụ thuộc role: chỉ cần `identity:users:read`, thiếu thì thấy khối "không có quyền" — cùng câu
// trả lời mà backend sẽ đưa ra (403) nếu gọi thẳng.
export async function UserDetailPanel({ userId, permissions }: UserDetailPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('userManagement')

    // ===== Derived =====
    if (!permissions.READ) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <UserPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<UserDetail>(API_ROUTE.USERS.DETAIL(userId), { token: actor.accessToken })

    if (!result.ok) {
        // 404 là chuyện thường gặp (bản ghi bị xoá, hoặc ai đó dán id sai) nên phải nói đúng chuyện gì xảy ra,
        // không gộp chung thành "tải thất bại".
        return (
            <UserPanelError description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')} />
        )
    }

    return <UserDetailView user={result.data} permissions={permissions} />
}
