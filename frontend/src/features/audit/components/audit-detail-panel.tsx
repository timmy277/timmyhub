import { getTranslations } from 'next-intl/server'

import type { AuditLogDetail } from '@timmyhub/contracts'

import { EmptyState } from '@/components'
import { API_ROUTE } from '@/constants'
import type { AuditPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

import { AuditDetailView } from './audit-detail-view'
import { AuditPanelError } from './audit-panel-error'

interface AuditDetailPanelProps {
    logId: string
    permissions: AuditPermissionFlags
}

// Tab "Chi tiết": Server Component tự lấy phiên rồi tải chi tiết ngay trên server, nên tab này không cần react-query
// cho đường đọc và không có màn nháy skeleton.
//
// Ai vào được chỉ phụ thuộc permission `audit:logs:read`, thiếu thì thấy khối "không có quyền" — cùng câu trả lời mà
// backend sẽ đưa ra (403) nếu gọi thẳng.
export async function AuditDetailPanel({ logId, permissions }: AuditDetailPanelProps) {
    // ===== Hooks =====
    const t = await getTranslations('auditLog')

    // ===== Derived =====
    if (!permissions.READ) {
        return <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
    }

    // ===== Data =====
    const actor = await getActor()
    if (!actor) return <AuditPanelError description={t('sessionExpired')} />

    const result = await fetchBackend<AuditLogDetail>(API_ROUTE.AUDIT.DETAIL(logId), { token: actor.accessToken })

    if (!result.ok) {
        // 404 là chuyện thường gặp (bản ghi bị dọn, hoặc ai đó dán id sai) nên phải nói đúng chuyện gì xảy ra.
        return (
            <AuditPanelError description={result.code === 'NOT_FOUND' ? t('detailNotFound') : t('detailLoadFailed')} />
        )
    }

    return <AuditDetailView log={result.data} />
}
