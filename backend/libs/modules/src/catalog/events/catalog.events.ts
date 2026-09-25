import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { CATALOG_EVENT } from '../catalog.constants'

@Injectable()
export class CatalogEventsListener {
    // ===== Dependencies =====
    private readonly logger = new Logger(CatalogEventsListener.name)

    // ===== Event handlers =====
    @OnEvent(CATALOG_EVENT.PRODUCT_PINGED)
    handleProductPinged(): void {
        this.logger.debug(`Nhận event ${CATALOG_EVENT.PRODUCT_PINGED}`)
    }
}
