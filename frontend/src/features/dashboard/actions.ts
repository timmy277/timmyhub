'use server'

import type { DashboardOverviewResponse, DashboardRange } from '@timmyhub/contracts'

import { API_ROUTE } from '@/constants'
import { getActor } from '@/lib/actor-permissions'
import { fetchBackend } from '@/lib/api-server'

export type DashboardActionResult<T = DashboardOverviewResponse> =
    { ok: true; data: T } | { ok: false; code: string; message?: string }

export async function getDashboardOverviewAction(
    range: DashboardRange = '30d',
): Promise<DashboardActionResult<DashboardOverviewResponse>> {
    const actor = await getActor()
    const result = await fetchBackend<DashboardOverviewResponse>(API_ROUTE.ANALYTICS.DASHBOARD_OVERVIEW(range), {
        token: actor?.accessToken,
    })

    if (!result.ok) {
        return { ok: false, code: result.code, message: result.message }
    }

    return { ok: true, data: result.data }
}
