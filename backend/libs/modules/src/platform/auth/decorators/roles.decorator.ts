import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@timmyhub/prisma'

export const ROLES_KEY = 'roles'

// Layer 1 — kiểm tra thô trên User.roles (docs/01-architecture/rbac-advanced.md). Không thay thế layer permission.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
