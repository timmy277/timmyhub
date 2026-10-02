import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AuditManagementPage, parseAuditListQuery, parseAuditTabs } from '@/features/audit'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('auditLog')
    return { title: t('pageTitle') }
}

interface AuditPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Bộ lọc/phân trang/tab nằm trong URL nên trang này luôn render động (đọc cookie phiên + searchParams) — không có gì
// để cache tĩnh, và nhật ký kiểm toán phải là bản mới nhất.
export default async function Page({ searchParams }: AuditPageProps) {
    const params = await searchParams
    const query = parseAuditListQuery(params)
    const tabs = parseAuditTabs(params)
    return <AuditManagementPage query={query} tabs={tabs} />
}
