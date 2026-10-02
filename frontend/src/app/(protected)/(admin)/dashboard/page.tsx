import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { DASHBOARD_PERMISSION, ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'

import { DashboardPage } from '@/features/dashboard'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('dashboard')
    return { title: t('pageTitle') }
}

// Dashboard chỉ dành cho người có quyền `analytics:platform:read` (ADMIN+).
// Người không có quyền bị redirect về `/` thay vì thấy 403 — hành vi nhất quán với "trang không tồn tại với họ".
export default async function Page() {
    const actor = await getActor()

    // Thiếu phiên: layout đã redirect, ở đây không thể xảy ra trong prod — dự phòng nếu bypass layout.
    if (!actor) redirect(ROUTE.LOGIN)

    // Không có quyền dashboard → ra trang chủ.
    if (!actor.permissions.has(DASHBOARD_PERMISSION)) redirect(ROUTE.HOME)

    return <DashboardPage />
}
