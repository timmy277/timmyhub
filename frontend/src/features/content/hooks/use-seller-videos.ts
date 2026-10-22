'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateVideoPostInput, UpdateVideoPostInput } from '@timmyhub/contracts'
import { toast } from 'sonner'

import { QUERY_KEY } from '@/constants'

import {
    createSellerVideoAction,
    deleteSellerVideoAction,
    getSellerVideosAction,
    updateSellerVideoAction,
    type SellerVideosResponse,
} from '../actions'

interface UseSellerVideosOptions {
    status?: string
    page?: number
    limit?: number
}

export function useSellerVideos(options: UseSellerVideosOptions = {}) {
    const { status, page = 1, limit = 10 } = options
    const queryClient = useQueryClient()

    const queryKey = QUERY_KEY.CONTENT.SELLER_VIDEOS({ status, page, limit })

    const query = useQuery<SellerVideosResponse>({
        queryKey,
        queryFn: async () => {
            const res = await getSellerVideosAction({ status, page, limit })
            if (!res.ok) {
                throw new Error(res.message || 'Không thể tải danh sách video của gian hàng')
            }
            return res.data
        },
    })

    const createMutation = useMutation({
        mutationFn: async (data: CreateVideoPostInput) => {
            const res = await createSellerVideoAction(data)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể đăng video bài đăng')
            }
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
            toast.success('Đăng video bán hàng thành công!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể đăng video bài đăng')
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateVideoPostInput }) => {
            const res = await updateSellerVideoAction(id, data)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể cập nhật video')
            }
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
            toast.success('Cập nhật video thành công!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể cập nhật video')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteSellerVideoAction(id)
            if (!res.ok) {
                throw new Error(res.message || 'Không thể xóa video')
            }
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
            toast.success('Xóa video thành công!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể xóa video')
        },
    })

    return {
        videos: query.data?.items ?? [],
        total: query.data?.total ?? 0,
        totalPages: query.data?.totalPages ?? 1,
        page,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        createVideo: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
        updateVideo: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        deleteVideo: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    }
}
