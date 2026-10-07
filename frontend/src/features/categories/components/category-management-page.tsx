import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { EmptyState, ErrorState, PageContainer } from '@/components'
import { ADMIN_CATEGORY_PERMISSION, CATEGORY_TAB } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

import { getAdminCategoryDetailAction, listAdminCategoriesAction } from '../actions'
import type { CategoryTabsState } from '../category-tab-query'
import { CategoryCreatePanel } from './category-create-panel'
import { CategoryDetailPanel } from './category-detail-panel'
import { CategoryTable } from './category-table'
import { CategoryTabs } from './category-tabs'

interface CategoryManagementPageProps {
    tabs: CategoryTabsState
}

export async function CategoryManagementPage({ tabs }: CategoryManagementPageProps) {
    const { active } = tabs
    const t = await getTranslations('categories')

    const actor = await getActor()
    if (!actor) {
        return (
            <PageContainer>
                <ErrorState description={t('sessionExpired')} />
            </PageContainer>
        )
    }

    if (actor.permissionsUnavailable) {
        return (
            <PageContainer>
                <ErrorState description={t('permissionsLoadFailed')} />
            </PageContainer>
        )
    }

    const canManage = actor.permissions.has(ADMIN_CATEGORY_PERMISSION.CREATE)
    if (!canManage) {
        return (
            <PageContainer>
                <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDesc')} />
            </PageContainer>
        )
    }

    let panel: ReactNode
    let activeLabel: string | undefined

    // Always fetch category list for available parent options
    const listRes = await listAdminCategoriesAction({ pageSize: 100 })
    const allCategories = listRes.ok ? listRes.data.items : []

    if (active.tab === CATEGORY_TAB.CREATE) {
        panel = <CategoryCreatePanel availableParents={allCategories} />
    } else if (active.tab === CATEGORY_TAB.DETAIL) {
        const detailRes = await getAdminCategoryDetailAction(active.id)
        const categoryDetail = detailRes.ok ? detailRes.data : null
        activeLabel = categoryDetail?.name
        panel = <CategoryDetailPanel id={active.id} initialCategory={categoryDetail} availableParents={allCategories} />
    } else {
        panel = (
            <CategoryTable
                rows={allCategories}
                totalItems={listRes.ok ? listRes.data.totalItems : 0}
                canCreate={canManage}
                canUpdate={actor.permissions.has(ADMIN_CATEGORY_PERMISSION.UPDATE)}
                canDelete={actor.permissions.has(ADMIN_CATEGORY_PERMISSION.DELETE)}
                error={listRes.ok ? undefined : listRes.message || t('messages.loadFailed')}
            />
        )
    }

    return (
        <PageContainer>
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <CategoryTabs active={active} userId={actor.userId} activeLabel={activeLabel} />
                <div className="mt-4">{panel}</div>
            </section>
        </PageContainer>
    )
}
