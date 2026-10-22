'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VideoFeedResponseDto, VideoPostDto } from '@timmyhub/contracts'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'
import { useAuthModalStore } from '@/stores'

interface UseVideoFeedOptions {
    limit?: number
    initialData?: VideoFeedResponseDto
}

export function useVideoFeed(options: UseVideoFeedOptions = {}) {
    const { limit = 10, initialData } = options
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const isAuthenticated = Boolean(session?.user?.id)
    const openLoginModal = useAuthModalStore((s) => s.openModal)

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
            // Hủy các query feed và detail đang fetch
            await queryClient.cancelQueries({ queryKey: ['content', 'feed'] })
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.CONTENT.VIDEO_DETAIL(postId) })

            // Snapshot tất cả feed query caches hiện có để đồng bộ & rollback nếu lỗi
            const feedQueries = queryClient.getQueryCache().findAll({ queryKey: ['content', 'feed'] })
            const previousQueries = feedQueries.map((q) => ({
                queryKey: q.queryKey,
                data: q.state.data as VideoFeedResponseDto | undefined,
            }))
            const previousDetail = queryClient.getQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(postId))

            // Đồng bộ trạng thái like lạc quan trên TẤT CẢ các danh sách (Home limit 3 & Fullscreen limit 12)
            feedQueries.forEach((q) => {
                const d = q.state.data as VideoFeedResponseDto | undefined
                if (d?.items) {
                    queryClient.setQueryData<VideoFeedResponseDto>(q.queryKey, {
                        ...d,
                        items: d.items.map((item: VideoPostDto) => {
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
            })

            if (previousDetail) {
                const newLiked = !previousDetail.isLiked
                queryClient.setQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(postId), {
                    ...previousDetail,
                    isLiked: newLiked,
                    likeCount: newLiked ? previousDetail.likeCount + 1 : Math.max(0, previousDetail.likeCount - 1),
                })
            }

            return { previousQueries, previousDetail, postId }
        },
        onSuccess: (data) => {
            // Đồng bộ số like chính xác từ server vào toàn bộ cache
            const feedQueries = queryClient.getQueryCache().findAll({ queryKey: ['content', 'feed'] })
            feedQueries.forEach((q) => {
                const d = q.state.data as VideoFeedResponseDto | undefined
                if (d?.items) {
                    queryClient.setQueryData<VideoFeedResponseDto>(q.queryKey, {
                        ...d,
                        items: d.items.map((item: VideoPostDto) =>
                            item.id === data.postId
                                ? { ...item, isLiked: data.liked, likeCount: data.likeCount }
                                : item,
                        ),
                    })
                }
            })

            const detail = queryClient.getQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(data.postId))
            if (detail) {
                queryClient.setQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(data.postId), {
                    ...detail,
                    isLiked: data.liked,
                    likeCount: data.likeCount,
                })
            }
        },
        onError: (_err, _postId, context) => {
            if (context?.previousQueries) {
                context.previousQueries.forEach(({ queryKey, data }) => {
                    if (data) queryClient.setQueryData(queryKey, data)
                })
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(QUERY_KEY.CONTENT.VIDEO_DETAIL(context.postId), context.previousDetail)
            }
            toast.error('Vui lòng đăng nhập để thích video')
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
        },
    })

    const recordViewMutation = useMutation({
        mutationFn: async (postId: string) => {
            const res = await apiClient.post<{ id: string; viewCount: number }>(API_ROUTE.CONTENT.VIEW(postId))
            return res.data
        },
        onSuccess: (res) => {
            if (!res?.id) return
            // Cập nhật lượt xem thời gian thực vào tất cả cache feed
            const feedQueries = queryClient.getQueryCache().findAll({ queryKey: ['content', 'feed'] })
            feedQueries.forEach((q) => {
                const d = q.state.data as VideoFeedResponseDto | undefined
                if (d?.items) {
                    queryClient.setQueryData<VideoFeedResponseDto>(q.queryKey, {
                        ...d,
                        items: d.items.map((item: VideoPostDto) =>
                            item.id === res.id ? { ...item, viewCount: res.viewCount } : item,
                        ),
                    })
                }
            })

            const detail = queryClient.getQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(res.id))
            if (detail) {
                queryClient.setQueryData<VideoPostDto>(QUERY_KEY.CONTENT.VIDEO_DETAIL(res.id), {
                    ...detail,
                    viewCount: res.viewCount,
                })
            }
        },
    })

    const toggleLike = useCallback(
        (postId: string) => {
            if (!isAuthenticated) {
                openLoginModal()
                return
            }
            likeMutation.mutate(postId)
        },
        [isAuthenticated, likeMutation, openLoginModal],
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
