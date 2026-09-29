import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RBAC_KIND } from '@/constants'
import { RbacManagementPage, parseRbacTabs } from '@/features/rbac'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('rbac')
    return { title: t('rolesPageTitle') }
}

interface RolesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Tab đang xem nằm trong URL nên trang này luôn render động (đọc cookie phiên + searchParams) — không có gì để cache
// tĩnh, và dữ liệu phân quyền phải là bản mới nhất. Cùng khuôn với `app/(protected)/users/page.tsx`.
export default async function Page({ searchParams }: RolesPageProps) {
    const params = await searchParams
    const tabs = parseRbacTabs(RBAC_KIND.ROLES, params)
    return <RbacManagementPage kind={RBAC_KIND.ROLES} tabs={tabs} />
}
