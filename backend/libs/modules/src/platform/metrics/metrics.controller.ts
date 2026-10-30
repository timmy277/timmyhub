import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'

import { Public } from '../auth/index'
import { PLATFORM_ROUTE } from '../platform.constants'
import { MetricsService } from './metrics.service'

@Controller(PLATFORM_ROUTE.METRICS)
export class MetricsController {
    // ===== Dependencies =====
    constructor(private readonly metricsService: MetricsService) {}

    // ===== Lifecycle =====

    // ===== Queries =====
    @Public()
    @Get()
    async getMetrics(@Res() res: Response): Promise<void> {
        const metrics = await this.metricsService.getMetrics()
        res.setHeader('Content-Type', this.metricsService.contentType)
        res.send(metrics)
    }

    // ===== Commands =====

    // ===== Event handlers =====

    // ===== Private helpers =====
}
