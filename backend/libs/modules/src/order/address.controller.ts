import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '@timmyhub/common'
import type { AddressDetail, CreateAddressInput, UpdateAddressInput } from '@timmyhub/contracts'
import { CreateAddressInputSchema, UpdateAddressInputSchema } from '@timmyhub/contracts'
import type { AuthUser } from '@timmyhub/modules/platform/auth'
import { AuthenticatedOnly, CurrentUser } from '@timmyhub/modules/platform/auth'

import { ORDER_ROUTE } from './order.constants'
import { OrderService } from './order.service'

@Controller(ORDER_ROUTE.ADDRESSES)
export class AddressController {
    constructor(private readonly orderService: OrderService) {}

    // Lấy danh sách sổ địa chỉ của user
    @AuthenticatedOnly()
    @Get()
    getAddresses(@CurrentUser() actor: AuthUser): Promise<AddressDetail[]> {
        return this.orderService.getAddresses(actor.id)
    }

    // Thêm địa chỉ mới
    @AuthenticatedOnly()
    @Post()
    createAddress(
        @Body(new ZodValidationPipe(CreateAddressInputSchema)) body: CreateAddressInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<AddressDetail> {
        return this.orderService.createAddress(actor.id, body)
    }

    // Cập nhật địa chỉ
    @AuthenticatedOnly()
    @Patch(':id')
    updateAddress(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateAddressInputSchema)) body: UpdateAddressInput,
        @CurrentUser() actor: AuthUser,
    ): Promise<AddressDetail> {
        return this.orderService.updateAddress(actor.id, id, body)
    }

    // Xoá địa chỉ
    @AuthenticatedOnly()
    @Delete(':id')
    deleteAddress(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<{ success: boolean }> {
        return this.orderService.deleteAddress(actor.id, id)
    }

    // Đặt làm địa chỉ mặc định
    @AuthenticatedOnly()
    @Patch(':id/default')
    setDefaultAddress(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<AddressDetail> {
        return this.orderService.setDefaultAddress(actor.id, id)
    }
}
