import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client'

import { METRIC_NAME, METRICS_CONSTANTS } from './metrics.constants'

@Injectable()
export class MetricsService implements OnModuleDestroy {
    // ===== Dependencies =====
    private readonly registry: Registry
    private readonly httpRequestsTotal: Counter<string>
    private readonly httpRequestDuration: Histogram<string>
    private readonly httpRequestsInFlight: Gauge<string>

    constructor() {
        this.registry = new Registry()

        // Thu thập metric mặc định của Node.js (CPU, Memory Heap/RSS, Event Loop lag, GC)
        collectDefaultMetrics({
            register: this.registry,
            prefix: METRICS_CONSTANTS.DEFAULT_PREFIX,
        })

        // RED metrics: Request rate & Error rate
        this.httpRequestsTotal = new Counter({
            name: `${METRICS_CONSTANTS.DEFAULT_PREFIX}${METRIC_NAME.HTTP_REQUESTS_TOTAL}`,
            help: 'Total number of HTTP requests processed',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.registry],
        })

        // RED metrics: Duration phân vị (p50/p95/p99) phục vụ kiểm soát NFR-001
        this.httpRequestDuration = new Histogram({
            name: `${METRICS_CONSTANTS.DEFAULT_PREFIX}${METRIC_NAME.HTTP_REQUEST_DURATION_SECONDS}`,
            help: 'Duration of HTTP requests in seconds (RED metrics)',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [...METRICS_CONSTANTS.HTTP_DURATION_BUCKETS],
            registers: [this.registry],
        })

        // Giám sát tải đồng thời hiện tại
        this.httpRequestsInFlight = new Gauge({
            name: `${METRICS_CONSTANTS.DEFAULT_PREFIX}${METRIC_NAME.HTTP_REQUESTS_IN_FLIGHT}`,
            help: 'Current number of HTTP requests being processed',
            labelNames: ['method'],
            registers: [this.registry],
        })
    }

    // ===== Lifecycle =====
    onModuleDestroy(): void {
        this.registry.clear()
    }

    // ===== Queries =====
    get contentType(): string {
        return this.registry.contentType
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics()
    }

    getRegistry(): Registry {
        return this.registry
    }

    // ===== Commands =====
    recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
        const labels = {
            method: method.toUpperCase(),
            route: route || 'unknown',
            status_code: String(statusCode),
        }
        this.httpRequestsTotal.inc(labels)
        this.httpRequestDuration.observe(labels, durationSeconds)
    }

    incrementInFlight(method: string): void {
        this.httpRequestsInFlight.inc({ method: method.toUpperCase() })
    }

    decrementInFlight(method: string): void {
        this.httpRequestsInFlight.dec({ method: method.toUpperCase() })
    }
}
