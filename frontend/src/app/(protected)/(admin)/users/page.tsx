import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { UserManagementPage, parseUserListQuery, parseUserTabs } from '@/features/users'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('userManagement')
    return { title: t('pageTitle') }
}

interface UsersPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Bộ lọc/phân trang/tab nằm trong URL nên trang này luôn render động (đọc cookie phiên + searchParams) — không có gì
// để cache tĩnh, và dữ liệu quản trị phải là bản mới nhất.
export default async function Page({ searchParams }: UsersPageProps) {
    const params = await searchParams
    const query = parseUserListQuery(params)
    const tabs = parseUserTabs(params)
    return <UserManagementPage query={query} tabs={tabs} />
}
