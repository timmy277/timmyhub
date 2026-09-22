import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { IdentityEventsListener } from './events/identity.events'
import { IdentityController } from './identity.controller'
import { IdentityRepository } from './identity.repository'
import { IdentityService } from './identity.service'
import { PermissionCacheService } from './rbac/permission-cache.service'
import { RbacRepository } from './rbac/rbac.repository'
import { RbacService } from './rbac/rbac.service'
import { RbacController } from './rbac.controller'

@Module({
    // JwtModule.register({}) rỗng: mỗi lần signAsync/verify truyền algorithm + key riêng (RS256, xem auth.service.ts).
    imports: [JwtModule.register({})],
    controllers: [IdentityController, AuthController, RbacController],
    providers: [
        IdentityService,
        IdentityRepository,
        IdentityEventsListener,
        AuthService,
        RbacRepository,
        RbacService,
        PermissionCacheService,
    ],
    exports: [IdentityService, AuthService, RbacService],
})
export class IdentityModule {}
