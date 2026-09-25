import { useTranslations } from 'next-intl'

import { PageContainer } from '@/components'

import { UserList } from './user-list'

// Khung server của trang — chỉ phần bảng (`UserList`) là client.
export function UserManagementPage() {
    // ===== Hooks =====
    const t = useTranslations('userManagement')

    return (
        <PageContainer title={t('pageTitle')} description={t('pageDescription')}>
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <UserList />
            </section>
        </PageContainer>
    )
}
