'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
    AddressDetail,
    CheckoutInput,
    CreateAddressInput,
    OrderDetail,
    UpdateAddressInput,
} from '@timmyhub/contracts'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/constants'
import {
    checkoutAction,
    createAddressAction,
    deleteAddressAction,
    getAddressesAction,
    getMyOrdersAction,
    getOrderByIdAction,
    setDefaultAddressAction,
    updateAddressAction,
} from '@/features/checkout'

// 1. Hook lấy sổ địa chỉ
export function useAddresses(options?: { enabled?: boolean; initialData?: AddressDetail[] }) {
    return useQuery<AddressDetail[]>({
        queryKey: QUERY_KEY.ADDRESS.LIST,
        queryFn: async () => {
            const res = await getAddressesAction()
            if (!res.ok) {
                if (res.code === 'UNAUTHORIZED') return []
                throw new Error(res.message || 'Không thể tải sổ địa chỉ')
            }
            return res.data
        },
        enabled: options?.enabled ?? true,
        initialData: options?.initialData,
        staleTime: 60_000,
    })
}

// 2. Hook thêm địa chỉ
export function useCreateAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateAddressInput) => {
            const res = await createAddressAction(input)
            if (!res.ok) {
                throw new Error(res.message || 'Thêm địa chỉ thất bại')
            }
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã thêm địa chỉ giao hàng mới')
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADDRESS.ALL })
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Không thể thêm địa chỉ')
        },
    })
}

// 3. Hook cập nhật địa chỉ
export function useUpdateAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, input }: { id: string; input: UpdateAddressInput }) => {
            const res = await updateAddressAction(id, input)
            if (!res.ok) {
                throw new Error(res.message || 'Cập nhật địa chỉ thất bại')
            }
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã cập nhật địa chỉ giao hàng')
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADDRESS.ALL })
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Không thể cập nhật địa chỉ')
        },
    })
}

// 4. Hook xoá địa chỉ
export function useDeleteAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteAddressAction(id)
            if (!res.ok) {
                throw new Error(res.message || 'Xoá địa chỉ thất bại')
            }
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã xoá địa chỉ')
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADDRESS.ALL })
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Không thể xoá địa chỉ')
        },
    })
}

// 5. Hook đặt làm mặc định
export function useSetDefaultAddress() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await setDefaultAddressAction(id)
            if (!res.ok) {
                throw new Error(res.message || 'Đặt địa chỉ mặc định thất bại')
            }
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã đặt làm địa chỉ mặc định')
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADDRESS.ALL })
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Không thể đặt làm địa chỉ mặc định')
        },
    })
}

// 6. Hook đặt hàng / Checkout
export function useCheckout() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CheckoutInput) => {
            const res = await checkoutAction(input)
            if (!res.ok) {
                throw new Error(res.message || 'Đặt hàng thất bại')
            }
            return res.data
        },
        onSuccess: () => {
            // Invalidate cả cart và order
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CART.ALL })
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.ORDER.ALL })
        },
        onError: (err: Error) => {
            toast.error(err.message || 'Đặt hàng không thành công. Vui lòng thử lại.')
        },
    })
}

// 7. Hook xem chi tiết đơn hàng
export function useOrderDetail(orderId: string, options?: { enabled?: boolean }) {
    return useQuery<OrderDetail>({
        queryKey: QUERY_KEY.ORDER.DETAIL(orderId),
        queryFn: async () => {
            const res = await getOrderByIdAction(orderId)
            if (!res.ok) {
                throw new Error(res.message || 'Không tìm thấy đơn hàng')
            }
            return res.data
        },
        enabled: (options?.enabled ?? true) && Boolean(orderId),
    })
}

// 8. Hook danh sách đơn hàng
export function useMyOrders(status?: string) {
    return useQuery<OrderDetail[]>({
        queryKey: QUERY_KEY.ORDER.MY_ORDERS(status),
        queryFn: async () => {
            const res = await getMyOrdersAction(status)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể tải danh sách đơn hàng')
            }
            return res.data
        },
    })
}
