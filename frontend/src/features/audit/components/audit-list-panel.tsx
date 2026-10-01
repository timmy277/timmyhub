import { getTranslations } from 'next-intl/server'

import type { AuditLogListQuery, AuditLogListResult } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import type { AuditPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { auditListRequestParams } from '../audit-list-query'
import { AuditPanelError } from './audit-panel-error'
import { AuditTable } from './audit-table'

interface AuditListPanelProps {
    query: AuditLogListQuery
    permissions: AuditPermissionFlags
}

// Tab danh sách: Server Component tải đúng **một trang** dữ liệu từ backend rồi giao cho `AuditTable` (client) lo phần
// tương tác. Không có access token nào đi xuống client.
export async function AuditListPanel({ query, permissions }: AuditListPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('auditLog')

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <AuditPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<AuditLogListResult>(API_ROUTE.AUDIT.LIST, {
        token: actor.accessToken,
        // Đọc từ **cùng một hàm** dựng tham số mà `parseAuditListQuery` đọc ngược lại: URL có tham số nào thì tham số
        // đó phải đi lên server, nếu không bộ lọc hiện trên màn hình nhưng kết quả không đổi.
        query: auditListRequestParams(query),
    })

    return (
        <AuditTable
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
