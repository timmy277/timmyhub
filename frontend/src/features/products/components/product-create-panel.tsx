'use client'

import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { PRODUCT_TAB } from '@/constants'

import { buildProductTabsHref } from '../product-tab-query'
import { CreateProductModal } from './create-product-modal'

export function ProductCreatePanel() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleDone = () => {
        router.push(buildProductTabsHref(pathname, searchParams, { tab: PRODUCT_TAB.LIST }))
        router.refresh()
    }

    return (
        <CreateProductModal
            inline
            open={true}
            onOpenChange={(isOpen) => {
                if (!isOpen) handleDone()
            }}
            onSucceeded={handleDone}
        />
    )
}
