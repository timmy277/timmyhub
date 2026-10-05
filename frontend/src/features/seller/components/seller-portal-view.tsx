'use client'

import { Store } from 'lucide-react'

import type { SellerProfileDetail } from '@timmyhub/contracts'

interface SellerPortalViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerPortalView({ initialShop }: SellerPortalViewProps = {}) {
    void initialShop
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Kênh Người Bán</h1>
            <p className="text-sm text-muted-foreground">Tính năng đang được phát triển. Vui lòng quay lại sau.</p>
        </div>
    )
}
