import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { Observable } from 'rxjs'
import { finalize } from 'rxjs'

import { MetricsService } from './metrics.service'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    // ===== Dependencies =====
    constructor(private readonly metricsService: MetricsService) {}

    // ===== Lifecycle =====

    // ===== Queries =====

    // ===== Commands =====
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle()
        }

        const http = context.switchToHttp()
        const request = http.getRequest<Request>()
        const response = http.getResponse<Response>()

        // Bỏ qua endpoint nội bộ /metrics để tránh làm sai lệch số liệu
        const path = request.path || request.url || ''
        if (path === '/metrics' || path.startsWith('/metrics?')) {
            return next.handle()
        }

        const method = request.method || 'GET'
        const startTime = process.hrtime.bigint()

        this.metricsService.incrementInFlight(method)

        return next.handle().pipe(
            finalize(() => {
                this.metricsService.decrementInFlight(method)
                const elapsedNano = process.hrtime.bigint() - startTime
                const durationSeconds = Number(elapsedNano) / 1e9

                const routePath = this.resolveRoutePath(request)
                const statusCode = response.statusCode || 200

                this.metricsService.recordHttpRequest(method, routePath, statusCode, durationSeconds)
            }),
        )
    }

    // ===== Private helpers =====
    private resolveRoutePath(request: Request): string {
        const route = request.route as { path?: string } | undefined
        if (route?.path) {
            const baseUrl = request.baseUrl || ''
            return `${baseUrl}${route.path}`
        }
        // Với request không match route nào (404), gom về 'unmatched' để chống bùng nổ cardinality khi bị scan URL rác
        return 'unmatched'
    }
}
