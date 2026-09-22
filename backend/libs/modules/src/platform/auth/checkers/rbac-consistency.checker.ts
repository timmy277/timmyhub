import type { OnApplicationBootstrap } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { PERMISSION_NAMES } from '@timmyhub/contracts'

import { RbacService } from '@timmyhub/modules/identity'

import { PERMISSIONS_KEY } from '../decorators/index'

// REQ-RBAC-014: quét toàn bộ @Permissions(...) lúc khởi động, đối chiếu với PERMISSION_NAMES (contracts) và bảng
// Permission (DB). Thiếu ở bất kỳ đâu thì từ chối khởi động — đây là fix cho lỗi nặng nhất của hệ thống cũ: một
// endpoint đòi permission chưa từng được seed, khiến không ai gọi được (kể cả SUPER_ADMIN nếu guard không bypass đúng).
@Injectable()
export class RbacConsistencyChecker implements OnApplicationBootstrap {
    private readonly logger = new Logger(RbacConsistencyChecker.name)

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
        private readonly reflector: Reflector,
        private readonly rbacService: RbacService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const usedPermissions = this.collectUsedPermissions()
        if (usedPermissions.size === 0) return

        const knownNames = new Set<string>(PERMISSION_NAMES)
        const missingFromCatalog = [...usedPermissions].filter((name) => !knownNames.has(name))
        if (missingFromCatalog.length > 0) {
            throw new Error(
                `RBAC: các permission dùng trong @Permissions() nhưng chưa khai báo trong PERMISSION_DEFINITIONS ` +
                    `(@timmyhub/contracts/permissions.catalog.ts): ${missingFromCatalog.join(', ')}`,
            )
        }

        const seeded = await this.rbacService.listPermissions()
        const seededNames = new Set(seeded.map((p) => p.name))
        const missingFromDb = [...usedPermissions].filter((name) => !seededNames.has(name))
        if (missingFromDb.length > 0) {
            throw new Error(
                `RBAC: các permission dùng trong @Permissions() nhưng chưa seed vào bảng Permission: ` +
                    `${missingFromDb.join(', ')}. Chạy lại prisma seed.`,
            )
        }

        this.logger.log(`RBAC: đối chiếu permission OK — ${usedPermissions.size} permission đang dùng trong route.`)
    }

    private collectUsedPermissions(): Set<string> {
        const used = new Set<string>()
        const controllers = this.discovery.getControllers()

        for (const wrapper of controllers) {
            const instance = wrapper.instance as object | undefined
            if (!instance) continue

            const prototype = Object.getPrototypeOf(instance) as object
            const classPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, instance.constructor)
            classPermissions?.forEach((p) => used.add(p))

            this.metadataScanner.getAllMethodNames(prototype).forEach((methodName) => {
                const handler = (instance as Record<string, unknown>)[methodName]
                if (typeof handler !== 'function') return
                const methodPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, handler)
                methodPermissions?.forEach((p) => used.add(p))
            })
        }

        return used
    }
}
