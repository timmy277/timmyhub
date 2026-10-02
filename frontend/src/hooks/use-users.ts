'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { CreateUserInput, UpdateUserInput } from '@timmyhub/contracts'

import { QUERY_KEY } from '@/constants'
import type { UserActionFailureCode, UserActionResult } from '@/features/users'
import {
    assignUserRoleAction,
    createUserAction,
    deleteUserAction,
    revokeUserRoleAction,
    setUserLockAction,
    updateUserAction,
} from '@/features/users'

// Mutation của màn quản trị người dùng. Mọi thao tác ghi đều: gọi Server Action → hiện toast theo kết quả → làm mới dữ
// liệu trang (Server Action đã `revalidatePath`, `router.refresh` để client lấy bản mới ngay). Lỗi nghiệp vụ hiện câu
// dịch từ catalog `api` dùng chung với backend, không nuốt thành thông báo chung chung.

type MutationOptions = {
    // Chạy khi thao tác thành công (đóng hộp thoại, xoá state đang chọn…).
    onSucceeded?: () => void
}

function useUserActionFeedback() {
    // ===== Hooks =====
    const router = useRouter()
    const queryClient = useQueryClient()
    const t = useTranslations('userManagement')
    const tApi = useTranslations('api')

    // ===== Handlers =====
    const messageFor = (code: UserActionFailureCode): string => {
        if (code === 'BACKEND_UNAVAILABLE') return t('backendUnavailable')
        if (code === 'UNAUTHORIZED') return t('sessionExpired')
        if (code === 'VALIDATION_FAILED') return t('invalidInput')
        const key = `error.${code}`
        // Cùng catalog với backend (`api`) — khoá là `error.<MÃ>`, giống cách hộp thoại đăng nhập dịch mã lỗi.
        if (tApi.has(key)) return tApi(key as 'error.FORBIDDEN')
        return t('actionFailed')
    }

    const settle = (
        result: UserActionResult,
        successMessage: string,
        options?: MutationOptions,
        additionalInvalidateKeys: (readonly unknown[])[] = [],
    ) => {
        if (!result.ok) {
            toast.error(messageFor(result.code))
            return
        }
        toast.success(successMessage)
        queryClient.invalidateQueries({ queryKey: QUERY_KEY.USERS.ALL })
        for (const key of additionalInvalidateKeys) {
            queryClient.invalidateQueries({ queryKey: key })
        }
        router.refresh()
        options?.onSucceeded?.()
    }

    return { settle, t }
}

// Chi tiết một tài khoản KHÔNG còn hook riêng: tab "Chi tiết" là Server Component, tự tải dữ liệu ngay trên server
// (`UserDetailPanel`) nên không cần react-query cho đường đọc.

export function useCreateUser(options?: MutationOptions) {
    const { settle, t } = useUserActionFeedback()
    return useMutation({
        mutationFn: (input: CreateUserInput) => createUserAction(input),
        onSuccess: (result) => settle(result, t('created'), options),
    })
}

export function useUpdateUser(options?: MutationOptions) {
    const { settle, t } = useUserActionFeedback()
    return useMutation({
        mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) => updateUserAction(userId, input),
        onSuccess: (result) => settle(result, t('updated'), options),
    })
}

export function useSetUserLock(options?: MutationOptions) {
    const { settle, t } = useUserActionFeedback()
    return useMutation({
        mutationFn: ({ userId, locked, reason }: { userId: string; locked: boolean; reason?: string }) =>
            setUserLockAction(userId, locked, reason),
        onSuccess: (result, variables) => settle(result, variables.locked ? t('locked') : t('unlocked'), options),
    })
}

export function useDeleteUser(options?: MutationOptions) {
    const { settle, t } = useUserActionFeedback()
    return useMutation({
        mutationFn: ({ userId }: { userId: string }) => deleteUserAction(userId),
        onSuccess: (result) => settle(result, t('deleted'), options),
    })
}

export function useUserRole(options?: MutationOptions) {
    const { settle, t } = useUserActionFeedback()

    const assign = useMutation({
        mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
            assignUserRoleAction(userId, roleName),
        onSuccess: (result, variables) =>
            settle(result, t('roleGranted', { role: variables.roleName }), options, [
                QUERY_KEY.RBAC.USER_PERMISSIONS(variables.userId),
                QUERY_KEY.RBAC.ALL,
            ]),
    })

    const revoke = useMutation({
        mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
            revokeUserRoleAction(userId, roleName),
        onSuccess: (result, variables) =>
            settle(result, t('roleRevoked', { role: variables.roleName }), options, [
                QUERY_KEY.RBAC.USER_PERMISSIONS(variables.userId),
                QUERY_KEY.RBAC.ALL,
            ]),
    })

    return { assign, revoke }
}
