import { Module } from '@nestjs/common'

import { CartController } from './cart.controller'
import { CartRepository } from './cart.repository'
import { CartService } from './cart.service'

@Module({
    controllers: [CartController],
    providers: [CartRepository, CartService],
    exports: [CartService, CartRepository],
})
export class CartModule {}
