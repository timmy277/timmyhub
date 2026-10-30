import type { Response } from 'express'

import { MetricsController } from './metrics.controller'
import { MetricsService } from './metrics.service'

describe('MetricsController', () => {
    let controller: MetricsController
    let service: MetricsService

    beforeEach(() => {
        service = new MetricsService()
        controller = new MetricsController(service)
    })

    afterEach(() => {
        service.onModuleDestroy()
    })

    it('should return metrics with correct contentType header', async () => {
        const setHeaderMock = jest.fn()
        const sendMock = jest.fn()

        const res = {
            setHeader: setHeaderMock,
            send: sendMock,
        } as unknown as Response

        await controller.getMetrics(res)

        expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', expect.stringContaining('text/plain'))
        expect(sendMock).toHaveBeenCalledWith(expect.stringContaining('timmyhub_'))
    })
})
