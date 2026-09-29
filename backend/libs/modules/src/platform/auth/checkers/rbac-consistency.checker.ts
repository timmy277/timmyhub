import type { OnApplicationBootstrap } from '@nestjs/common'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'

import { PERMISSION_NAMES } from '@timmyhub/contracts'

import { PERMISSION_RESOLVER } from '../auth.constants'
import { AUTHENTICATED_ONLY_KEY, IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../decorators/index'
import type { PermissionResolver } from '../interfaces/index'

// REQ-RBAC-014: quét toàn bộ @Permissions(...) lúc khởi động, đối chiếu với PERMISSION_NAMES (contracts) và bảng
// Permission (DB). Thiếu ở bất kỳ đâu thì từ chối khởi động — đây là fix cho lỗi nặng nhất của hệ thống cũ: một
// endpoint đòi permission chưa từng được seed, khiến không ai gọi được (kể cả SUPER_ADMIN nếu guard không bypass đúng).
//
// Chiều ngược lại cũng được kiểm: handler có route mà **không khai gì** (không `@Permissions`, không
// `@AuthenticatedOnly`, không `@Public`) thì chặn khởi động. Trước đây PermissionsGuard fail-open nên một endpoint
// quên khai quyền sẽ mở cho mọi người dùng đã đăng nhập — lỗi im lặng, không có cổng nào bắt được.
@Injectable()
export class RbacConsistencyChecker implements OnApplicationBootstrap {
    // ===== Dependencies =====
    private readonly logger = new Logger(RbacConsistencyChecker.name)

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
        private readonly reflector: Reflector,
        @Inject(PERMISSION_RESOLVER) private readonly permissionResolver: PermissionResolver,
    ) {}

    // ===== Lifecycle =====
    async onApplicationBootstrap(): Promise<void> {
        const { usedPermissions, undeclaredHandlers } = this.collectRouteMetadata()

        if (undeclaredHandlers.length > 0) {
            throw new Error(
                `RBAC: handler có route nhưng không khai @Permissions/@AuthenticatedOnly/@Public — mặc định là từ ` +
                    `chối nên endpoint sẽ không gọi được: ${undeclaredHandlers.join(', ')}`,
            )
        }

        if (usedPermissions.size === 0) return

        const knownNames = new Set<string>(PERMISSION_NAMES)
        const missingFromCatalog = [...usedPermissions].filter((name) => !knownNames.has(name))
        if (missingFromCatalog.length > 0) {
            throw new Error(
                `RBAC: các permission dùng trong @Permissions() nhưng chưa khai báo trong PERMISSION_DEFINITIONS ` +
                    `(@timmyhub/contracts/permissions.catalog.ts): ${missingFromCatalog.join(', ')}`,
            )
        }

        const seeded = await this.permissionResolver.listPermissions()
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

    // ===== Private helpers =====
    private collectRouteMetadata(): { usedPermissions: Set<string>; undeclaredHandlers: string[] } {
        const usedPermissions = new Set<string>()
        const undeclaredHandlers: string[] = []

        for (const wrapper of this.discovery.getControllers()) {
            const instance = wrapper.instance as object | undefined
            if (!instance) continue

            const prototype = Object.getPrototypeOf(instance) as object
            const classPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, instance.constructor) ?? []
            classPermissions.forEach((permission) => usedPermissions.add(permission))

            const classIsPublic = this.reflector.get<boolean>(IS_PUBLIC_KEY, instance.constructor) === true
            const classIsAuthenticatedOnly =
                this.reflector.get<boolean>(AUTHENTICATED_ONLY_KEY, instance.constructor) === true

            this.metadataScanner.getAllMethodNames(prototype).forEach((methodName) => {
                const handler = (instance as Record<string, unknown>)[methodName]
                if (typeof handler !== 'function') return

                // Chỉ xét handler thật sự có route (`@Get/@Post/…`); bỏ qua hàm phụ trợ khai trong controller.
                if (this.reflector.get<string | undefined>(PATH_METADATA, handler) === undefined) return

                const methodPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, handler) ?? []
                methodPermissions.forEach((permission) => usedPermissions.add(permission))

                const declared =
                    methodPermissions.length > 0 ||
                    classPermissions.length > 0 ||
                    classIsPublic ||
                    classIsAuthenticatedOnly ||
                    this.reflector.get<boolean>(IS_PUBLIC_KEY, handler) === true ||
                    this.reflector.get<boolean>(AUTHENTICATED_ONLY_KEY, handler) === true

                if (!declared) {
                    undeclaredHandlers.push(`${instance.constructor.name}.${methodName}`)
                }
            })
        }

        return { usedPermissions, undeclaredHandlers }
    }
}
