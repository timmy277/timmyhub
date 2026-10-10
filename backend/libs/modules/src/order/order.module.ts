import { Module } from '@nestjs/common'
import { PrismaModule } from '@timmyhub/prisma'

import { AddressController } from './address.controller'
import { OrderController } from './order.controller'
import { OrderRepository } from './order.repository'
import { OrderService } from './order.service'

@Module({
    imports: [PrismaModule],
    controllers: [AddressController, OrderController],
    providers: [OrderRepository, OrderService],
    exports: [OrderService, OrderRepository],
})
export class OrderModule {}
