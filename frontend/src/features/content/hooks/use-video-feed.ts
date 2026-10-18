'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VideoFeedResponseDto, VideoPostDto } from '@timmyhub/contracts'
import { toast } from 'sonner'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

interface UseVideoFeedOptions {
    limit?: number
    initialData?: VideoFeedResponseDto
}

export function useVideoFeed(options: UseVideoFeedOptions = {}) {
    const { limit = 10, initialData } = options
    const queryClient = useQueryClient()

    const query = useQuery<VideoFeedResponseDto>({
        queryKey: QUERY_KEY.CONTENT.FEED(limit),
        queryFn: async () => {
            const res = await apiClient.get<VideoFeedResponseDto>(API_ROUTE.CONTENT.FEED, {
                params: { limit },
            })
            return res.data
        },
        initialData,
        staleTime: 60_000,
    })

    const likeMutation = useMutation({
        mutationFn: async (postId: string) => {
            const res = await apiClient.post<{ liked: boolean; likeCount: number }>(API_ROUTE.CONTENT.LIKE(postId))
            return { postId, ...res.data }
        },
        onMutate: async (postId: string) => {
            // Hủy các query đang fetch để tránh xung đột
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.CONTENT.FEED(limit) })

            // Lưu snapshot dữ liệu cũ để rollback nếu lỗi
            const previousData = queryClient.getQueryData<VideoFeedResponseDto>(QUERY_KEY.CONTENT.FEED(limit))

            if (previousData) {
                queryClient.setQueryData<VideoFeedResponseDto>(QUERY_KEY.CONTENT.FEED(limit), {
                    ...previousData,
                    items: previousData.items.map((item: VideoPostDto) => {
                        if (item.id === postId) {
                            const newLiked = !item.isLiked
                            return {
                                ...item,
                                isLiked: newLiked,
                                likeCount: newLiked ? item.likeCount + 1 : Math.max(0, item.likeCount - 1),
                            }
                        }
                        return item
                    }),
                })
            }

            return { previousData }
        },
        onError: (_err, _postId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(QUERY_KEY.CONTENT.FEED(limit), context.previousData)
            }
            toast.error('Vui lòng đăng nhập để thích video')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
        },
    })

    const recordViewMutation = useMutation({
        mutationFn: async (postId: string) => {
            await apiClient.post<{ id: string; viewCount: number }>(API_ROUTE.CONTENT.VIEW(postId))
        },
    })

    const toggleLike = useCallback(
        (postId: string) => {
            likeMutation.mutate(postId)
        },
        [likeMutation],
    )

    const recordView = useCallback(
        (postId: string) => {
            recordViewMutation.mutate(postId)
        },
        [recordViewMutation],
    )

    return {
        videos: query.data?.items ?? [],
        total: query.data?.total ?? 0,
        hasMore: query.data?.hasMore ?? false,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        toggleLike,
        recordView,
    }
}
