import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RBAC_KIND } from '@/constants'
import { RbacManagementPage, parseRbacTabs } from '@/features/rbac'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('rbac')
    return { title: t('permissionsPageTitle') }
}

interface PermissionsPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Cùng khuôn với `app/(protected)/roles/page.tsx`: tab đang xem nằm trong URL nên trang luôn render động.
export default async function Page({ searchParams }: PermissionsPageProps) {
    const params = await searchParams
    const tabs = parseRbacTabs(RBAC_KIND.PERMISSIONS, params)
    return <RbacManagementPage kind={RBAC_KIND.PERMISSIONS} tabs={tabs} />
}
