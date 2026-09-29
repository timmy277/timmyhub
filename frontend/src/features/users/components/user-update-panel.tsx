import { getTranslations } from 'next-intl/server'

import type { UserDetail } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { UserPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { UserForm } from './user-form'
import { UserPanelError } from './user-panel-error'

interface UserUpdatePanelProps {
    userId: string
    permissions: UserPermissionFlags
    currentUserId: string
}

// Tab "Cập nhật". Server Component tải bản ghi rồi đưa giá trị hiện tại xuống `UserForm` (client) — form không phải
// tự gọi backend để lấy dữ liệu khởi tạo, nên không có trạng thái "đang tải" cho phần điền sẵn.
//
// Cần cả `update` lẫn `read`: form lấy giá trị hiện tại từ endpoint chi tiết, mà endpoint đó đòi `identity:users:read`.
export async function UserUpdatePanel({ userId, permissions, currentUserId }: UserUpdatePanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('userManagement')

    // ===== Derived =====
    if (!permissions.UPDATE || !permissions.READ) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <UserPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<UserDetail>(API_ROUTE.USERS.DETAIL(userId), { token: actor.accessToken })

    if (!result.ok) {
        return (
            <UserPanelError description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')} />
        )
    }

    // Đổi vai trò ở màn sửa không nằm trong form: việc đó có endpoint riêng và nằm ở tab "Chi tiết" để mọi thay đổi
    // quyền đều đi qua một chỗ.
    return <UserForm user={result.data} canAssignRole={false} actorId={currentUserId} />
}
