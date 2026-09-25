import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { CATALOG_EVENT } from './catalog.constants'
import { CatalogRepository } from './catalog.repository'
import type { PingResponse } from './dto/index'

@Injectable()
export class CatalogService {
    // ===== Dependencies =====
    constructor(
        private readonly catalogRepository: CatalogRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ===== Queries =====
    ping(): PingResponse {
        this.eventEmitter.emit(CATALOG_EVENT.PRODUCT_PINGED)
        return { module: 'catalog', status: 'ok' }
    }

    countProducts(): Promise<number> {
        return this.catalogRepository.countProducts()
    }
}
