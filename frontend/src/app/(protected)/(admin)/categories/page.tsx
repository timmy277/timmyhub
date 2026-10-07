import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { parseCategoryTabs, CategoryManagementPage } from '@/features/categories'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('categories')
    return {
        title: t('pageTitle'),
    }
}

interface CategoriesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
    const resolvedParams = await searchParams
    const tabs = parseCategoryTabs(resolvedParams)

    return <CategoryManagementPage tabs={tabs} />
}
