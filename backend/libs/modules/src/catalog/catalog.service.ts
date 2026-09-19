import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { CatalogRepository } from './catalog.repository'
import { CATALOG_PRODUCT_PINGED_EVENT } from './events/catalog.events'
import type { PingResponse } from './dto/ping.dto'

@Injectable()
export class CatalogService {
    constructor(
        private readonly catalogRepository: CatalogRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    ping(): PingResponse {
        this.eventEmitter.emit(CATALOG_PRODUCT_PINGED_EVENT)
        return { module: 'catalog', status: 'ok' }
    }

    countProducts(): Promise<number> {
        return this.catalogRepository.countProducts()
    }
}
