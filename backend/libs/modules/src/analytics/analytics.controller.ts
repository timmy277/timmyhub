import { Controller, Get, Query } from '@nestjs/common'

import type { DashboardOverviewResponse, DashboardRange, SellerDashboardOverviewResponse } from '@timmyhub/contracts'
import { DashboardRangeSchema } from '@timmyhub/contracts'
import { AuthenticatedOnly, CurrentUser, Permissions } from '@timmyhub/modules/platform/auth'
import type { AuthUser } from '@timmyhub/modules/platform/auth'

import { ANALYTICS_ROUTE } from './analytics.constants'
import { AnalyticsService } from './analytics.service'

@Controller(ANALYTICS_ROUTE.BASE)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Permissions('analytics:platform:read')
    @Get(ANALYTICS_ROUTE.DASHBOARD_OVERVIEW)
    getDashboardOverview(@Query('range') rangeRaw?: string): Promise<DashboardOverviewResponse> {
        const parsed = DashboardRangeSchema.safeParse(rangeRaw)
        const range: DashboardRange = parsed.success ? parsed.data : '30d'
        return this.analyticsService.getDashboardOverview(range)
    }

    @AuthenticatedOnly()
    @Get(ANALYTICS_ROUTE.SELLER_DASHBOARD_OVERVIEW)
    getSellerDashboardOverview(
        @CurrentUser() actor: AuthUser,
        @Query('range') rangeRaw?: string,
    ): Promise<SellerDashboardOverviewResponse> {
        const parsed = DashboardRangeSchema.safeParse(rangeRaw)
        const range: DashboardRange = parsed.success ? parsed.data : '30d'
        return this.analyticsService.getSellerDashboardOverview(actor.id, range)
    }
}
