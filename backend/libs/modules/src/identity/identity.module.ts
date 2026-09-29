import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { PERMISSION_RESOLVER } from '@timmyhub/modules/platform/auth'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { IdentityEventsListener } from './events/index'
import { IdentityController } from './identity.controller'
import { IdentityRepository } from './identity.repository'
import { IdentityService } from './identity.service'
import { PermissionCacheService, RbacController, RbacRepository, RbacService } from './rbac/index'
import { UsersController, UsersRepository, UsersService } from './users/index'

@Module({
    // JwtModule.register({}) rỗng: mỗi lần signAsync/verify truyền algorithm + key riêng (RS256, xem auth.service.ts).
    imports: [JwtModule.register({})],
    controllers: [IdentityController, AuthController, RbacController, UsersController],
    providers: [
        IdentityService,
        IdentityRepository,
        IdentityEventsListener,
        AuthService,
        RbacRepository,
        RbacService,
        PermissionCacheService,
        UsersRepository,
        UsersService,
        // Guard/checker của platform/auth chỉ biết token này, không biết RbacService — xem permission-resolver.interface.ts.
        { provide: PERMISSION_RESOLVER, useExisting: RbacService },
    ],
    exports: [IdentityService, AuthService, RbacService, UsersService, PERMISSION_RESOLVER],
})
export class IdentityModule {}
