import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import type { AuditLogListQuery } from '@timmyhub/contracts'

import { EmptyState, ErrorState, PageContainer } from '@/components'
import { AUDIT_TAB, toAuditPermissionFlags } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

import type { AuditTabsState } from '../audit-tab-query'
import { AuditDetailPanel } from './audit-detail-panel'
import { AuditListPanel } from './audit-list-panel'
import { AuditPanelError } from './audit-panel-error'
import { AuditTabs } from './audit-tabs'

interface AuditManagementPageProps {
    query: AuditLogListQuery
    // Chỉ tab hiện tại nằm trong URL; danh sách tab đang mở do AuditTabs nạp từ localStorage.
    tabs: AuditTabsState
}

// Trang tra cứu audit log (FEAT-AUD-004) — khung dạng tab: danh sách · chi tiết. Tab nằm trong URL nên Server Component
// chọn đúng panel và render ngay trên server; tải lại trang hay chia sẻ link đều ra đúng màn hình đang xem.
//
// Không có tab tạo/sửa/xoá: bảng AuditLog là bất biến (ADR-0011) — mọi bản ghi sinh trong transaction nghiệp vụ qua
// `writeAuditLog`, API chỉ có đường đọc.
//
// Ai vào được không phụ thuộc role: chỉ cần có `audit:logs:list` là xem được danh sách, thiếu thì thấy khối "không có
// quyền" — cùng câu trả lời mà backend sẽ đưa ra (403) nếu gọi thẳng.
//
// "Không có quyền" và "không hỏi được quyền" là **hai** trạng thái khác nhau: backend không trả lời thì hiện lỗi hạ
// tầng kèm nút thử lại, không gộp thành "không có quyền".
export async function AuditManagementPage({ query, tabs }: AuditManagementPageProps) {
    // ===== Hooks =====
    const t = await getTranslations('auditLog')

    // ===== Derived =====
    const { active } = tabs

    // ===== Data =====
    const actor = await getActor()

    // Nhóm route `(protected)` đã chặn người chưa đăng nhập; tới đây mà không có phiên nghĩa là phiên vừa hết hạn
    // giữa hai lượt render.
    if (!actor) {
        return (
            <PageContainer>
                <ErrorState description={t('sessionExpired')} />
            </PageContainer>
        )
    }

    // Không hỏi được backend tập quyền (chết/mất mạng) thì không được kết luận là "không có quyền": vẫn chặn như cũ,
    // nhưng nói đúng nguyên nhân và cho thử lại.
    if (actor.permissionsUnavailable) {
        return (
            <PageContainer>
                <AuditPanelError description={t('permissionsLoadFailed')} />
            </PageContainer>
        )
    }

    const permissions = toAuditPermissionFlags(actor.permissions)

    if (!permissions.LIST) {
        return (
            <PageContainer>
                <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
            </PageContainer>
        )
    }

    // ===== Panels =====
    let panel: ReactNode
    if (active.tab === AUDIT_TAB.DETAIL) {
        panel = <AuditDetailPanel logId={active.id} permissions={permissions} />
    } else {
        panel = <AuditListPanel query={query} permissions={permissions} />
    }

    return (
        <PageContainer>
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <AuditTabs active={active} userId={actor.userId} />
                <div className="mt-4">{panel}</div>
            </section>
        </PageContainer>
    )
}
