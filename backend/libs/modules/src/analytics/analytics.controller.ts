import { Controller, Get, Query } from '@nestjs/common'

import type { DashboardOverviewResponse, DashboardRange } from '@timmyhub/contracts'
import { DashboardRangeSchema } from '@timmyhub/contracts'
import { Permissions } from '@timmyhub/modules/platform/auth'

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
}
