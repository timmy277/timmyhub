import { z } from 'zod'

import { apiMessageKey } from './i18n/translate'

// Zod DTO cho REST API của domain rbac — docs/03-specs/rbac-permission/design.md §3.
// Đây là nguồn validation duy nhất (CLAUDE.md luật #15), dùng chung FE/BE. Message là khoá thông điệp (auth.schema.ts).

const DisplayNameSchema = z.string().min(1, apiMessageKey('validation.displayNameRequired'))

export const CreateRoleSchema = z.object({
    name: z
        .string()
        .min(1, apiMessageKey('validation.roleNameRequired'))
        .regex(/^[A-Z][A-Z0-9_]*$/, apiMessageKey('validation.roleNameFormat')),
    displayName: DisplayNameSchema,
    description: z.string().optional(),
})
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = z.object({
    displayName: DisplayNameSchema.optional(),
    description: z.string().optional(),
})
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>

export const AssignRolePermissionsSchema = z.object({
    permissionNames: z.array(z.string().min(1)).min(0),
})
export type AssignRolePermissionsInput = z.infer<typeof AssignRolePermissionsSchema>

export const CreatePermissionSchema = z.object({
    name: z
        .string()
        .regex(
            /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)?$/,
            apiMessageKey('validation.permissionNameFormat'),
        ),
    displayName: DisplayNameSchema,
})
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>

export const AssignUserRoleSchema = z.object({
    roleName: z.string().min(1, apiMessageKey('validation.roleNameRequired')),
})
export type AssignUserRoleInput = z.infer<typeof AssignUserRoleSchema>

export const GrantUserPermissionSchema = z.object({
    permissionName: z.string().min(1, apiMessageKey('validation.permissionNameRequired')),
    isGranted: z.boolean(),
})
export type GrantUserPermissionInput = z.infer<typeof GrantUserPermissionSchema>

export type RoleSummary = {
    id: string
    name: string
    displayName: string
    description: string | null
    isSystem: boolean
    createdAt: string
}

export type PermissionSummary = {
    id: string
    name: string
    displayName: string
    module: string
    resource: string
    action: string
}

export type RoleDetail = RoleSummary & {
    permissionNames: string[]
}

export type EffectivePermissions = {
    userId: string
    permissions: string[]
}
