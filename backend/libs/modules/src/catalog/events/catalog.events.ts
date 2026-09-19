import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

export const CATALOG_PRODUCT_PINGED_EVENT = 'catalog.product.pinged'

@Injectable()
export class CatalogEventsListener {
    private readonly logger = new Logger(CatalogEventsListener.name)

    @OnEvent(CATALOG_PRODUCT_PINGED_EVENT)
    handleProductPinged(): void {
        this.logger.debug(`Nhận event ${CATALOG_PRODUCT_PINGED_EVENT}`)
    }
}
