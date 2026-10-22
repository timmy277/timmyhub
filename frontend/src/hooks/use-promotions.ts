'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserVoucherItem, VoucherItem } from '@timmyhub/contracts'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/constants'
import { useAuthModalStore } from '@/stores'
import {
    claimVoucherByCodeAction,
    getAvailableVouchersAction,
    getMySavedVoucherIdsAction,
    getMyUserVouchersAction,
    saveUserVoucherAction,
} from '@/features/vouchers'

export function usePublicAvailableVouchers(options?: { enabled?: boolean }) {
    return useQuery<VoucherItem[]>({
        queryKey: QUERY_KEY.PROMOTION.AVAILABLE_VOUCHERS(),
        queryFn: async () => {
            const res = await getAvailableVouchersAction()
            if (!res.ok) {
                return []
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        staleTime: 30_000,
    })
}

export function useMySavedVoucherIds(options?: { enabled?: boolean }) {
    return useQuery<string[]>({
        queryKey: QUERY_KEY.PROMOTION.MY_SAVED_VOUCHERS,
        queryFn: async () => {
            const res = await getMySavedVoucherIdsAction()
            if (!res.ok) {
                return []
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        staleTime: 30_000,
    })
}

export function useMyUserVouchers(status?: string, options?: { enabled?: boolean }) {
    return useQuery<UserVoucherItem[]>({
        queryKey: QUERY_KEY.PROMOTION.MY_VOUCHERS_LIST(status),
        queryFn: async () => {
            const res = await getMyUserVouchersAction(status)
            if (!res.ok) {
                return []
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        staleTime: 15_000,
    })
}

export function useSaveUserVoucher() {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const openLoginModal = useAuthModalStore((s) => s.openModal)

    return useMutation({
        mutationFn: async ({ voucherId, code }: { voucherId: string; code: string }) => {
            if (!session?.user?.id) {
                openLoginModal()
                throw new Error('LOGIN_REQUIRED')
            }
            const res = await saveUserVoucherAction(voucherId)
            if (!res.ok) {
                throw new Error(res.message || 'Lưu mã voucher thất bại')
            }
            return { ...res.data, code }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROMOTION.MY_SAVED_VOUCHERS })
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROMOTION.ALL })
            if (data.saved) {
                toast.success(`Đã lưu mã ${data.code} vào ví voucher của bạn!`, {
                    description: 'Áp dụng tự động tại bước thanh toán.',
                })
            } else {
                toast.info(`Đã gỡ mã ${data.code} khỏi ví voucher của bạn`)
            }
        },
        onError: (err: Error) => {
            if (err.message === 'LOGIN_REQUIRED') return
            toast.error(err.message || 'Không thể lưu voucher')
        },
    })
}

export function useClaimVoucherByCode() {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const openLoginModal = useAuthModalStore((s) => s.openModal)

    return useMutation({
        mutationFn: async (code: string) => {
            if (!session?.user?.id) {
                openLoginModal()
                throw new Error('LOGIN_REQUIRED')
            }
            const res = await claimVoucherByCodeAction(code)
            if (!res.ok) {
                throw new Error(res.message || 'Lưu mã voucher thất bại')
            }
            return res.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROMOTION.MY_SAVED_VOUCHERS })
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.PROMOTION.ALL })
            if (data.saved) {
                toast.success(`Đã lưu mã ${data.code} vào ví voucher của bạn!`, {
                    description: 'Áp dụng tự động tại bước thanh toán.',
                })
            } else {
                toast.info(`Đã gỡ mã ${data.code} khỏi ví voucher của bạn`)
            }
        },
        onError: (err: Error) => {
            if (err.message === 'LOGIN_REQUIRED') return
            toast.error(err.message || 'Không thể lưu mã voucher')
        },
    })
}
