'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostCommentDto, VideoFeedResponseDto, VideoPostDto } from '@timmyhub/contracts'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { API_ROUTE, QUERY_KEY } from '@/constants'
import { apiClient } from '@/services'

interface UseVideoCommentsOptions {
    postId?: string
    enabled?: boolean
}

export function useVideoComments({ postId, enabled = true }: UseVideoCommentsOptions) {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const currentUser = session?.user

    const commentsQuery = useQuery<PostCommentDto[]>({
        queryKey: postId ? QUERY_KEY.CONTENT.COMMENTS(postId) : ['content', 'comments', 'none'],
        queryFn: async () => {
            if (!postId) return []
            const res = await apiClient.get<PostCommentDto[]>(API_ROUTE.CONTENT.COMMENTS(postId))
            return res.data
        },
        enabled: Boolean(postId) && enabled,
        staleTime: 10_000,
    })

    const addCommentMutation = useMutation({
        mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
            if (!postId) throw new Error('postId is required')
            const res = await apiClient.post<PostCommentDto>(API_ROUTE.CONTENT.COMMENTS(postId), {
                content,
                parentId,
            })
            return res.data
        },
        onMutate: async ({ content, parentId }) => {
            if (!postId) return
            await queryClient.cancelQueries({ queryKey: QUERY_KEY.CONTENT.COMMENTS(postId) })
            const previousComments =
                queryClient.getQueryData<PostCommentDto[]>(QUERY_KEY.CONTENT.COMMENTS(postId)) || []

            const optimisticComment: PostCommentDto = {
                id: `temp-${Date.now()}`,
                postId,
                userId: currentUser?.id || 'current-user',
                content,
                parentId: parentId || null,
                createdAt: new Date().toISOString(),
                user: {
                    id: currentUser?.id || 'current-user',
                    name: currentUser?.name || 'Người dùng',
                    avatar: currentUser?.image || null,
                },
                replies: [],
            }

            queryClient.setQueryData<PostCommentDto[]>(QUERY_KEY.CONTENT.COMMENTS(postId), [
                optimisticComment,
                ...previousComments,
            ])

            return { previousComments }
        },
        onError: (_err, _vars, context) => {
            if (postId && context?.previousComments) {
                queryClient.setQueryData(QUERY_KEY.CONTENT.COMMENTS(postId), context.previousComments)
            }
            toast.error('Vui lòng đăng nhập để bình luận')
        },
        onSuccess: (data) => {
            if (!postId) return
            // Cập nhật comment thật từ server
            queryClient.setQueryData<PostCommentDto[]>(QUERY_KEY.CONTENT.COMMENTS(postId), (old = []) =>
                old.map((c) => (c.id.startsWith('temp-') ? data : c)),
            )

            // Đồng bộ tăng commentCount trên feed video cache
            const feedQueries = queryClient.getQueryCache().findAll({ queryKey: ['content', 'feed'] })
            feedQueries.forEach((q) => {
                const d = q.state.data as VideoFeedResponseDto | undefined
                if (d?.items) {
                    queryClient.setQueryData<VideoFeedResponseDto>(q.queryKey, {
                        ...d,
                        items: d.items.map((item: VideoPostDto) =>
                            item.id === postId ? { ...item, commentCount: item.commentCount + 1 } : item,
                        ),
                    })
                }
            })

            toast.success('Đã gửi bình luận!')
        },
        onSettled: () => {
            if (postId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.COMMENTS(postId) })
                queryClient.invalidateQueries({ queryKey: QUERY_KEY.CONTENT.ALL })
            }
        },
    })

    const addComment = useCallback(
        (content: string, parentId?: string) => {
            if (!content.trim()) return
            addCommentMutation.mutate({ content: content.trim(), parentId })
        },
        [addCommentMutation],
    )

    return {
        comments: commentsQuery.data ?? [],
        isLoading: commentsQuery.isLoading,
        isAddingComment: addCommentMutation.isPending,
        addComment,
        refetch: commentsQuery.refetch,
    }
}
