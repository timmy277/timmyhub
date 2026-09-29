import { getTranslations } from 'next-intl/server'

import type { UserListQuery, UserListResult } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import type { UserPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { userListRequestParams } from '../user-list-query'
import { UserPanelError } from './user-panel-error'
import { UserTable } from './user-table'

interface UserListPanelProps {
    query: UserListQuery
    permissions: UserPermissionFlags
}

// Tab danh sách: Server Component tải đúng **một trang** dữ liệu từ backend rồi giao cho `UserTable` (client) lo phần
// tương tác. Không có access token nào đi xuống client.
//
// Chỉ tab này mới gọi endpoint danh sách — mở tab tạo/cập nhật/chi tiết thì không tốn thêm một vòng request vô ích.
export async function UserListPanel({ query, permissions }: UserListPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('userManagement')

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <UserPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<UserListResult>(API_ROUTE.USERS.LIST, {
        token: actor.accessToken,
        // Đọc từ **cùng một hàm** dựng tham số mà `parseUserListQuery` đọc ngược lại: URL có tham số nào thì tham số
        // đó phải đi lên server, nếu không bộ lọc hiện trên màn hình nhưng kết quả không đổi.
        query: userListRequestParams(query),
    })

    return (
        <UserTable
            rows={result.ok ? result.data.items : []}
            pagination={
                result.ok
                    ? result.data.pagination
                    : {
                          page: 1,
                          pageSize: query.pageSize,
                          totalItems: 0,
                          totalPages: 1,
                          hasNext: false,
                          hasPrev: false,
                      }
            }
            query={query}
            permissions={permissions}
            error={result.ok ? undefined : result.code === 'FORBIDDEN' ? t('noPermissionDescription') : t('loadFailed')}
        />
    )
}
