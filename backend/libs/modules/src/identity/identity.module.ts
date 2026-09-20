import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { IdentityEventsListener } from './events/identity.events'
import { IdentityController } from './identity.controller'
import { IdentityRepository } from './identity.repository'
import { IdentityService } from './identity.service'

@Module({
    // JwtModule.register({}) rỗng: mỗi lần signAsync/verify truyền algorithm + key riêng (RS256, xem auth.service.ts).
    imports: [JwtModule.register({})],
    controllers: [IdentityController, AuthController],
    providers: [IdentityService, IdentityRepository, IdentityEventsListener, AuthService],
    exports: [IdentityService, AuthService],
})
export class IdentityModule {}
