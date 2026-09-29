import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { EmptyState, ErrorState, PageContainer } from '@/components'
import { RBAC_KIND, RBAC_TAB, toRbacPermissionFlags, type RbacKind } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

import type { RbacTabsState } from '../rbac-tab-query'
import { PermissionDetailPanel } from './permission-detail-panel'
import { PermissionForm } from './permission-form'
import { PermissionListPanel } from './permission-list-panel'
import { RbacPanelError } from './rbac-panel-error'
import { RbacTabs } from './rbac-tabs'
import { RoleDetailPanel } from './role-detail-panel'
import { RoleFormPanel } from './role-form-panel'
import { RoleListPanel } from './role-list-panel'

interface RbacManagementPageProps {
    kind: RbacKind
    // Chỉ tab hiện tại nằm trong URL; danh sách tab đang mở do RbacTabs nạp từ localStorage.
    tabs: RbacTabsState
}

// Khung màn quản trị vai trò/quyền (TASK-RBAC-015) — dạng tab: danh sách · tạo · (sửa) · chi tiết. Một component dùng
// chung cho cả hai màn, phân biệt bằng `kind`. Tab nằm trong URL nên Server Component chọn đúng panel và render ngay
// trên server; không có state tab ở client, tải lại/chia sẻ link đều ra đúng màn hình.
//
// Không có tiêu đề trang: thanh tab đã nói rõ đang ở màn nào (giống màn quản lý người dùng). Tiêu đề cho thẻ trình
// duyệt đặt ở `generateMetadata` của route.
export async function RbacManagementPage({ kind, tabs }: RbacManagementPageProps) {
    // ===== Hooks =====
    const t = await getTranslations('rbac')

    // ===== Derived =====
    const { active } = tabs
    const isRoles = kind === RBAC_KIND.ROLES

    // ===== Data =====
    const actor = await getActor()

    // Nhóm route `(protected)` đã chặn người chưa đăng nhập; tới đây mà không có phiên nghĩa là phiên vừa hết hạn.
    if (!actor) {
        return (
            <PageContainer>
                <ErrorState description={t('sessionExpired')} />
            </PageContainer>
        )
    }

    // Không hỏi được backend tập quyền (chết/mất mạng) thì KHÔNG được kết luận "không có quyền": nói đúng nguyên nhân
    // và cho thử lại (xem `permissionsUnavailable`).
    if (actor.permissionsUnavailable) {
        return (
            <PageContainer>
                <RbacPanelError description={t('permissionsLoadFailed')} />
            </PageContainer>
        )
    }

    const permissions = toRbacPermissionFlags(actor.permissions)
    const canList = isRoles ? permissions.ROLES_LIST : permissions.PERMISSIONS_LIST

    if (!canList) {
        return (
            <PageContainer>
                <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
            </PageContainer>
        )
    }

    // ===== Panels =====
    // Mỗi panel tự lo phần quyền và phần tải dữ liệu của mình; ở đây chỉ chọn panel theo tab đang mở.
    let panel: ReactNode
    if (active.tab === RBAC_TAB.CREATE) {
        panel = isRoles ? (
            permissions.ROLES_CREATE ? (
                <RoleFormPanel mode="create" permissions={permissions} actorId={actor.userId} />
            ) : (
                <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
            )
        ) : permissions.PERMISSIONS_CREATE ? (
            <PermissionForm actorId={actor.userId} />
        ) : (
            <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
        )
    } else if (active.tab === RBAC_TAB.UPDATE && isRoles) {
        panel = <RoleFormPanel mode="edit" roleId={active.id} permissions={permissions} actorId={actor.userId} />
    } else if (active.tab === RBAC_TAB.DETAIL) {
        panel = isRoles ? (
            <RoleDetailPanel roleId={active.id} permissions={permissions} actorId={actor.userId} />
        ) : (
            <PermissionDetailPanel permissionId={active.id} permissions={permissions} actorId={actor.userId} />
        )
    } else {
        panel = isRoles ? (
            <RoleListPanel permissions={permissions} />
        ) : (
            <PermissionListPanel permissions={permissions} />
        )
    }

    return (
        <PageContainer>
            {/* Thanh tab nằm trong card — tab là một phần của màn hình đang xem, không phải dải điều hướng treo lơ lửng. */}
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <RbacTabs kind={kind} active={active} userId={actor.userId} />
                <div className="mt-4">{panel}</div>
            </section>
        </PageContainer>
    )
}
