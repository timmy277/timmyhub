'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type {
    CreatePermissionInput,
    CreateRoleInput,
    PermissionSummary,
    RoleSummary,
    UpdateRoleInput,
} from '@timmyhub/contracts'

import type { RbacActionFailureCode, RbacActionResult } from '@/features/rbac'
import type { CreateRoleResult, UpdateRoleResult } from '@/features/rbac'
import {
    createPermissionAction,
    createRoleAction,
    deletePermissionAction,
    deleteRoleAction,
    updateRoleAction,
} from '@/features/rbac'

type MutationOptions<T> = {
    onSucceeded?: (data: T) => void
}

type RbacTranslator = ReturnType<typeof useTranslations<'rbac'>>

// Mã lỗi → câu hiển thị. Lỗi nghiệp vụ (`ROLE_ALREADY_EXISTS`, `ROLE_IS_SYSTEM`…) đã có sẵn câu trong catalog `api`
// dùng chung với backend, nên tra ở đó trước; chỉ khi catalog không có khoá mới rơi về câu chung của màn này.
function failureMessage(
    t: RbacTranslator,
    tApi: ReturnType<typeof useTranslations<'api'>>,
    code: RbacActionFailureCode,
) {
    if (code === 'BACKEND_UNAVAILABLE') return t('backendUnavailable')
    if (code === 'UNAUTHORIZED') return t('sessionExpired')
    if (code === 'VALIDATION_FAILED') return t('invalidInput')
    const key = `error.${code}`
    if (tApi.has(key)) return tApi(key as 'error.FORBIDDEN')
    return t('actionFailed')
}

function useRbacActionFeedback() {
    // ===== Hooks =====
    const router = useRouter()
    const t = useTranslations('rbac')
    const tApi = useTranslations('api')

    // ===== Handlers =====
    const settle = <T>(result: RbacActionResult<T>, successMessage: string, options?: MutationOptions<T>) => {
        if (!result.ok) {
            toast.error(failureMessage(t, tApi, result.code))
            return
        }
        toast.success(successMessage)
        router.refresh()
        options?.onSucceeded?.(result.data)
    }

    return { settle, t, tApi }
}

function useRoleWriteFeedback(options?: MutationOptions<RoleSummary>) {
    // ===== Hooks =====
    const router = useRouter()
    const t = useTranslations('rbac')
    const tApi = useTranslations('api')

    // ===== Handlers =====
    const settleRoleWrite = (result: CreateRoleResult | UpdateRoleResult, successMessage: string) => {
        if (!result.ok) {
            toast.error(failureMessage(t, tApi, result.code))
            return
        }
        if (result.permissionsAssigned) toast.success(successMessage)
        else toast.warning(t('roleSavedPermissionsFailed'))
        router.refresh()
        options?.onSucceeded?.(result.data)
    }

    return { settleRoleWrite, t }
}

export function useCreateRole(options?: MutationOptions<RoleSummary>) {
    const { settleRoleWrite, t } = useRoleWriteFeedback(options)

    return useMutation({
        mutationFn: ({ input, permissionNames }: { input: CreateRoleInput; permissionNames: string[] }) =>
            createRoleAction(input, permissionNames),
        onSuccess: (result) => settleRoleWrite(result, t('roleCreated')),
    })
}

export function useUpdateRole(options?: MutationOptions<RoleSummary>) {
    const { settleRoleWrite, t } = useRoleWriteFeedback(options)

    return useMutation({
        mutationFn: ({
            roleId,
            input,
            permissionNames,
        }: {
            roleId: string
            input: UpdateRoleInput
            permissionNames?: string[]
        }) => updateRoleAction(roleId, input, permissionNames),
        onSuccess: (result) => settleRoleWrite(result, t('roleUpdated')),
    })
}

export function useDeleteRole(options?: MutationOptions<undefined>) {
    const { settle, t } = useRbacActionFeedback()
    return useMutation({
        mutationFn: ({ roleId }: { roleId: string }) => deleteRoleAction(roleId),
        onSuccess: (result) => settle(result, t('roleDeleted'), options),
    })
}

export function useCreatePermission(options?: MutationOptions<PermissionSummary>) {
    const { settle, t } = useRbacActionFeedback()
    return useMutation({
        mutationFn: (input: CreatePermissionInput) => createPermissionAction(input),
        onSuccess: (result) => settle(result, t('permissionCreated'), options),
    })
}

export function useDeletePermission(options?: MutationOptions<undefined>) {
    const { settle, t } = useRbacActionFeedback()
    return useMutation({
        mutationFn: ({ permissionId }: { permissionId: string }) => deletePermissionAction(permissionId),
        onSuccess: (result) => settle(result, t('permissionDeleted'), options),
    })
}
