import { z } from 'zod'

const IDENTIFIER_REGEX = /^[a-z][a-z0-9-]*$/

export const PermissionFormSchema = z.object({
    module: z.string().trim().min(1, 'validation.required').regex(IDENTIFIER_REGEX, 'validation.permissionNameFormat'),
    resource: z
        .string()
        .trim()
        .min(1, 'validation.required')
        .regex(IDENTIFIER_REGEX, 'validation.permissionNameFormat'),
    action: z.string().trim().min(1, 'validation.required').regex(IDENTIFIER_REGEX, 'validation.permissionNameFormat'),
    scopedToAny: z.boolean().default(false),
    displayName: z.string().trim().min(1, 'validation.displayNameRequired').max(100),
})

export type PermissionFormValues = z.infer<typeof PermissionFormSchema>
