import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import type { UserListQuery } from '@timmyhub/contracts'

import { EmptyState, ErrorState, PageContainer } from '@/components'
import { toUserPermissionFlags, USER_TAB } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

import type { UserTabsState } from '../user-tab-query'
import { UserDetailPanel } from './user-detail-panel'
import { UserForm } from './user-form'
import { UserListPanel } from './user-list-panel'
import { UserPanelError } from './user-panel-error'
import { UserTabs } from './user-tabs'
import { UserUpdatePanel } from './user-update-panel'

interface UserManagementPageProps {
    query: UserListQuery
    // Chỉ tab hiện tại nằm trong URL; danh sách tab đang mở do UserTabs nạp từ localStorage.
    tabs: UserTabsState
}

// Trang quản trị người dùng (FEAT-USR-004/005, FEAT-ADM-001) — khung dạng tab: danh sách · tạo · cập nhật · chi tiết.
// Tab nằm trong URL nên Server Component chọn đúng panel và render ngay trên server; không có state tab ở client, và
// tải lại trang hay chia sẻ link đều ra đúng màn hình đang xem.
//
// Không có tiêu đề trang: thanh tab đã nói rõ đang ở màn nào, thêm một dòng "Người dùng" phía trên chỉ tổ trùng lặp
// (TimmyHub gốc cũng không có — `ManagementPage` đi thẳng vào `Paper` bọc `Tabs`). Tiêu đề cho thẻ trình duyệt vẫn
// còn, đặt ở `generateMetadata` của route.
//
// Ai vào được không phụ thuộc role: chỉ cần có `identity:users:list` là xem được, thiếu thì thấy khối "không có
// quyền" — cùng câu trả lời mà backend sẽ đưa ra (403) nếu gọi thẳng.
//
// "Không có quyền" và "không hỏi được quyền" là **hai** trạng thái khác nhau: backend không trả lời thì hiện lỗi hạ
// tầng kèm nút thử lại, không gộp thành "không có quyền" (xem `permissionsUnavailable`).
export async function UserManagementPage({ query, tabs }: UserManagementPageProps) {
    // ===== Hooks =====
    const t = await getTranslations('userManagement')

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

    // Không hỏi được backend tập quyền (chết/mất mạng) thì **không** được kết luận là "không có quyền": `getActor`
    // trả `permissions` rỗng trong trường hợp đó, nên rơi xuống cổng `LIST` bên dưới sẽ hiện "Không có quyền truy
    // cập" trong khi nguyên nhân thật là máy chủ không trả lời. Vẫn chặn như cũ (không mở nút thao tác), nhưng nói
    // đúng nguyên nhân và cho thử lại.
    if (actor.permissionsUnavailable) {
        return (
            <PageContainer>
                <UserPanelError description={t('permissionsLoadFailed')} />
            </PageContainer>
        )
    }

    const permissions = toUserPermissionFlags(actor.permissions)

    if (!permissions.LIST) {
        return (
            <PageContainer>
                <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
            </PageContainer>
        )
    }

    // ===== Panels =====
    // Mỗi panel tự lo phần quyền và phần tải dữ liệu của mình; ở đây chỉ chọn panel theo tab đang mở.
    let panel: ReactNode
    if (active.tab === USER_TAB.CREATE) {
        panel = permissions.CREATE ? (
            <UserForm user={null} canAssignRole={permissions.ASSIGN_ROLE} actorId={actor.userId} />
        ) : (
            <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDescription')} />
        )
    } else if (active.tab === USER_TAB.UPDATE) {
        panel = <UserUpdatePanel userId={active.id} permissions={permissions} currentUserId={actor.userId} />
    } else if (active.tab === USER_TAB.DETAIL) {
        panel = <UserDetailPanel userId={active.id} permissions={permissions} currentUserId={actor.userId} />
    } else {
        panel = <UserListPanel query={query} permissions={permissions} />
    }

    return (
        <PageContainer>
            {/* Thanh tab nằm trong card, cùng chỗ với khung `Paper` bọc `Tabs` của TimmyHub gốc — tab là một phần của
                màn hình đang xem, không phải một dải điều hướng treo lơ lửng phía trên. */}
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <UserTabs active={active} userId={actor.userId} />
                <div className="mt-4">{panel}</div>
            </section>
        </PageContainer>
    )
}
