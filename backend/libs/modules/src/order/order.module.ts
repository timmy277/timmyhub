import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@timmyhub/prisma'

import { AddressController } from './address.controller'
import { OrderController } from './order.controller'
import { OrderRepository } from './order.repository'
import { OrderService } from './order.service'
import { VnpayService } from './vnpay.service'

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [AddressController, OrderController],
    providers: [OrderRepository, OrderService, VnpayService],
    exports: [OrderService, OrderRepository, VnpayService],
})
export class OrderModule {}
