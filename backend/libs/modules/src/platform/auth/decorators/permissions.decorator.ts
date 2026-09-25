import { SetMetadata } from '@nestjs/common'

import type { PermissionName } from '@timmyhub/contracts'

export const PERMISSIONS_KEY = 'permissions'

// Layer 2 — permission động `module:resource:action[:any]`. Gõ sai tên là lỗi biên dịch nhờ PermissionName.
export const Permissions = (...permissions: PermissionName[]) => SetMetadata(PERMISSIONS_KEY, permissions)
