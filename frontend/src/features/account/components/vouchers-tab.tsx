'use client'

import { MyVouchersView } from '@/features/vouchers'

export function VouchersTab() {
    return (
        <section className="space-y-4">
            <MyVouchersView compact />
        </section>
    )
}
