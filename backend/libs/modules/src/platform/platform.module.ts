import { Module } from '@nestjs/common'
import { APP_GUARD, DiscoveryModule } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'

import { IdentityModule } from '../identity/index'
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from './auth/guards/index'
import { RbacConsistencyChecker } from './auth/checkers/index'
import { PlatformEventsListener } from './events/platform.events'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'

@Module({
    // JwtModule.register({}) rỗng: JwtAuthGuard tự truyền algorithm + JWT_ACCESS_PUBLIC_KEY lúc verify.
    imports: [JwtModule.register({}), DiscoveryModule, IdentityModule],
    controllers: [PlatformController],
    providers: [
        PlatformService,
        PlatformEventsListener,
        RbacConsistencyChecker,
        // Thứ tự đăng ký = thứ tự chạy: xác thực (layer 0) → role thô (layer 1) → permission động (layer 2).
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
    ],
    exports: [PlatformService],
})
export class PlatformModule {}
