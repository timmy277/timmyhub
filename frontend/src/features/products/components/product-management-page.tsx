import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { EmptyState, ErrorState, PageContainer } from '@/components'
import { ADMIN_PRODUCT_PERMISSION, PRODUCT_TAB, SELLER_PRODUCT_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { getMyShopAction } from '@/features/seller'
import { getActor } from '@/lib/actor-permissions'

import { getMyProductsAction, getProductDetailAction, listAdminProductsAction } from '../actions'
import type { ProductTabsState } from '../product-tab-query'
import { ProductCreatePanel } from './product-create-panel'
import { ProductDetailPanel } from './product-detail-panel'
import { ProductTable } from './product-table'
import { ProductTabs } from './product-tabs'

interface ProductManagementPageProps {
    tabs: ProductTabsState
}

export async function ProductManagementPage({ tabs }: ProductManagementPageProps) {
    const t = await getTranslations('products')
    const { active } = tabs

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

    const isAdmin = actor.permissions.has(ADMIN_PRODUCT_PERMISSION.LIST)
    let isSeller =
        actor.permissions.has(SELLER_PRODUCT_PERMISSION.READ) ||
        actor.permissions.has(SELLER_PRODUCT_PERMISSION.CREATE) ||
        actor.permissions.has(SELLER_SHOP_PERMISSION)

    if (!isAdmin && !isSeller) {
        const shopRes = await getMyShopAction()
        if (shopRes.ok && Boolean(shopRes.data)) {
            isSeller = true
        }
    }

    if (!isAdmin && !isSeller) {
        return (
            <PageContainer>
                <EmptyState title={t('noAccessTitle')} description={t('noAccessDesc')} />
            </PageContainer>
        )
    }

    let panel: ReactNode
    let activeLabel: string | undefined

    if (active.tab === PRODUCT_TAB.CREATE) {
        panel = isSeller ? (
            <ProductCreatePanel />
        ) : (
            <EmptyState title={t('noPermissionTitle')} description={t('noPermissionDesc')} />
        )
    } else if (active.tab === PRODUCT_TAB.DETAIL) {
        const detailRes = await getProductDetailAction(active.id)
        const productDetail = detailRes.ok ? detailRes.data : null
        activeLabel = productDetail?.name
        panel = <ProductDetailPanel id={active.id} isAdmin={isAdmin} initialDetail={productDetail} />
    } else {
        const result = isAdmin
            ? await listAdminProductsAction({ pageSize: 100 })
            : await getMyProductsAction({ pageSize: 100 })

        panel = (
            <ProductTable
                rows={result.ok ? result.data.items : []}
                totalItems={result.ok ? result.data.totalItems : 0}
                isAdmin={isAdmin}
                canCreate={isSeller}
                error={result.ok ? undefined : result.message || t('loadFailed')}
            />
        )
    }

    return (
        <PageContainer>
            <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
                <ProductTabs active={active} userId={actor.userId} activeLabel={activeLabel} />
                <div className="mt-4">{panel}</div>
            </section>
        </PageContainer>
    )
}
