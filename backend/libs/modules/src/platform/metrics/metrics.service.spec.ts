import { MetricsService } from './metrics.service'

describe('MetricsService', () => {
    let service: MetricsService

    beforeEach(() => {
        service = new MetricsService()
    })

    afterEach(() => {
        service.onModuleDestroy()
    })

    it('should initialize registry and default metrics', async () => {
        const metrics = await service.getMetrics()
        expect(service.contentType).toContain('text/plain')
        expect(metrics).toContain('timmyhub_')
    })

    it('should record HTTP request counter and histogram', async () => {
        service.recordHttpRequest('GET', '/v1/products', 200, 0.05)

        const metrics = await service.getMetrics()
        expect(metrics).toContain('timmyhub_http_requests_total{method="GET",route="/v1/products",status_code="200"} 1')
        expect(metrics).toContain(
            'timmyhub_http_request_duration_seconds_count{method="GET",route="/v1/products",status_code="200"} 1',
        )
    })

    it('should track in-flight requests correctly', async () => {
        service.incrementInFlight('POST')
        let metrics = await service.getMetrics()
        expect(metrics).toContain('timmyhub_http_requests_in_flight{method="POST"} 1')

        service.decrementInFlight('POST')
        metrics = await service.getMetrics()
        expect(metrics).toContain('timmyhub_http_requests_in_flight{method="POST"} 0')
    })
})
