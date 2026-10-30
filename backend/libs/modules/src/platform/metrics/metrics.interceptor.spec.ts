import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'

import { MetricsInterceptor } from './metrics.interceptor'
import { MetricsService } from './metrics.service'

describe('MetricsInterceptor', () => {
    let interceptor: MetricsInterceptor
    let metricsService: MetricsService

    beforeEach(() => {
        metricsService = new MetricsService()
        interceptor = new MetricsInterceptor(metricsService)
    })

    afterEach(() => {
        metricsService.onModuleDestroy()
    })

    it('should skip /metrics path', async () => {
        const mockContext = {
            getType: () => 'http',
            switchToHttp: () => ({
                getRequest: () => ({ path: '/metrics', method: 'GET' }),
                getResponse: () => ({ statusCode: 200 }),
            }),
        } as unknown as ExecutionContext

        const next: CallHandler = {
            handle: () => of('metrics-payload'),
        }

        const spyIncrement = jest.spyOn(metricsService, 'incrementInFlight')

        const result = await lastValueFrom(interceptor.intercept(mockContext, next))
        expect(result).toBe('metrics-payload')
        expect(spyIncrement).not.toHaveBeenCalled()
    })

    it('should measure execution time and record HTTP metrics for matched route', async () => {
        const mockContext = {
            getType: () => 'http',
            switchToHttp: () => ({
                getRequest: () => ({
                    path: '/v1/users/123',
                    baseUrl: '/v1/users',
                    route: { path: '/:id' },
                    method: 'GET',
                }),
                getResponse: () => ({ statusCode: 200 }),
            }),
        } as unknown as ExecutionContext

        const next: CallHandler = {
            handle: () => of({ success: true }),
        }

        const spyRecord = jest.spyOn(metricsService, 'recordHttpRequest')

        const result = await lastValueFrom(interceptor.intercept(mockContext, next))
        expect(result).toEqual({ success: true })
        expect(spyRecord).toHaveBeenCalledWith('GET', '/v1/users/:id', 200, expect.any(Number))
    })

    it('should fallback to unmatched for unmatched routes to avoid cardinality blowup', async () => {
        const mockContext = {
            getType: () => 'http',
            switchToHttp: () => ({
                getRequest: () => ({
                    path: '/random/unknown-url',
                    method: 'GET',
                }),
                getResponse: () => ({ statusCode: 404 }),
            }),
        } as unknown as ExecutionContext

        const next: CallHandler = {
            handle: () => of(null),
        }

        const spyRecord = jest.spyOn(metricsService, 'recordHttpRequest')

        await lastValueFrom(interceptor.intercept(mockContext, next))
        expect(spyRecord).toHaveBeenCalledWith('GET', 'unmatched', 404, expect.any(Number))
    })
})
