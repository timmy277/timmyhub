import { z } from 'zod'

// Zod DTO cho REST API của domain rbac — docs/03-specs/rbac-permission/design.md §3.
// Đây là nguồn validation duy nhất (CLAUDE.md luật #15), dùng chung FE/BE.

export const CreateRoleSchema = z.object({
    name: z
        .string()
        .min(1, 'Tên vai trò không được để trống')
        .regex(/^[A-Z][A-Z0-9_]*$/, 'Tên vai trò viết HOA_GẠCH_DƯỚI, ví dụ SUPPORT_AGENT'),
    displayName: z.string().min(1, 'Tên hiển thị không được để trống'),
    description: z.string().optional(),
})
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = z.object({
    displayName: z.string().min(1).optional(),
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
            /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*(:any)?$/,
            'Định dạng phải là module:resource:action[:any]',
        ),
    displayName: z.string().min(1, 'Tên hiển thị không được để trống'),
})
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>

export const AssignUserRoleSchema = z.object({
    roleName: z.string().min(1, 'roleName không được để trống'),
})
export type AssignUserRoleInput = z.infer<typeof AssignUserRoleSchema>

export const GrantUserPermissionSchema = z.object({
    permissionName: z.string().min(1, 'permissionName không được để trống'),
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

export type EffectivePermissions = {
    userId: string
    permissions: string[]
}
