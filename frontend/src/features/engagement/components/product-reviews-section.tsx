'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
    Star,
    ThumbsUp,
    MessageSquare,
    CheckCircle2,
    ImageIcon,
    Play,
    Send,
    ArrowUpDown,
    CornerDownRight,
    Store,
    Smile,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ReviewItem, ReviewQuery, ReviewCommentItem, ReviewListResult } from '@timmyhub/contracts'

import { Badge, Button, Card, CardContent, Input, Separator, Skeleton } from '@/components/ui'
import { ErrorState, UserAvatar } from '@/components/common'
import { MediaLightbox, type MediaLightboxItem } from '@/features/media'
import { QUERY_KEY } from '@/constants'
import { cn } from '@/utils'
import { createCommentAction, getProductReviewsAction, toggleHelpfulAction } from '../actions'
import { useProductRealtime } from '../hooks/use-product-realtime'

// Định dạng thời gian gồm cả Giờ:Phút:Giây Ngày/Tháng/Năm (HH:mm:ss DD/MM/YYYY)
function formatReviewDateTime(dateString: string): string {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => n.toString().padStart(2, '0')
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    const seconds = pad(d.getSeconds())
    const day = pad(d.getDate())
    const month = pad(d.getMonth() + 1)
    const year = d.getFullYear()
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
}

export interface ProductReviewsSectionProps {
    productId: string
    productName: string
    className?: string
}

export function ProductReviewsSection({ productId, className }: ProductReviewsSectionProps) {
    const t = useTranslations('reviews')

    // 1. Kích hoạt kết nối realtime Socket.IO
    useProductRealtime(productId)

    // 2. Bộ lọc & Sắp xếp
    const [selectedStar, setSelectedStar] = useState<number | undefined>(undefined)
    const [hasMediaOnly, setHasMediaOnly] = useState<boolean>(false)
    const [sort, setSort] = useState<'newest' | 'helpful' | 'rating_desc'>('newest')
    const [page, setPage] = useState<number>(1)

    // 3. Lightbox xem ảnh/video (hỗ trợ toàn bộ album của review)
    const [lightboxGallery, setLightboxGallery] = useState<{
        items: MediaLightboxItem[]
        initialIndex: number
    } | null>(null)

    // 4. Query reviews
    const queryParams: ReviewQuery = {
        productId,
        page,
        limit: 10,
        sort,
        rating: selectedStar,
        hasMedia: hasMediaOnly,
    }

    const {
        data: reviewResult,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.ENGAGEMENT.REVIEWS(productId, queryParams as Record<string, unknown>),
        queryFn: async () => {
            const res = await getProductReviewsAction(queryParams)
            if (!res.ok) throw new Error(res.message || 'Failed to fetch reviews')
            return res.data
        },
    })

    const summary = reviewResult?.summary
    const reviews = reviewResult?.items ?? []
    const total = reviewResult?.total ?? 0

    const openLightbox = (items: MediaLightboxItem[], initialIndex = 0) => {
        setLightboxGallery({
            items,
            initialIndex,
        })
    }

    return (
        <div className={cn('space-y-6', className)} id="product-reviews">
            {/* Header / Tổng quan đánh giá */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between">
                    {/* Điểm trung bình to rõ */}
                    <div className="flex items-center gap-5">
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 min-w-32">
                            <span className="text-4xl font-extrabold text-amber-500 tracking-tight">
                                {summary?.ratingAvg ? summary.ratingAvg.toFixed(1) : '5.0'}
                            </span>
                            <div className="flex items-center gap-0.5 mt-1.5 mb-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            'h-4 w-4',
                                            star <= Math.round(summary?.ratingAvg ?? 5)
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'fill-transparent text-muted-foreground/30',
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{t('outOfFive')}</span>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-foreground">{t('sectionTitle')}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {t('totalReviewsCount', { count: summary?.ratingCount ?? 0 })}
                            </p>
                        </div>
                    </div>

                    {/* Thanh phân bổ tỉ lệ các sao */}
                    <div className="flex-1 max-w-sm space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary?.countsByStar?.[star as 1 | 2 | 3 | 4 | 5] ?? 0
                            const totalReviews = summary?.ratingCount ?? 0
                            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                            return (
                                <div key={star} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                    <span className="w-8 flex items-center justify-end gap-1 font-medium text-foreground">
                                        {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    </span>
                                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right font-mono">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <Separator className="my-6" />

                {/* Bộ lọc Chips & Sắp xếp */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={selectedStar === undefined && !hasMediaOnly ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full text-xs h-8"
                            onClick={() => {
                                setSelectedStar(undefined)
                                setHasMediaOnly(false)
                                setPage(1)
                            }}
                        >
                            {t('filters.all')} ({summary?.ratingCount ?? 0})
                        </Button>

                        {[5, 4, 3, 2, 1].map((star) => (
                            <Button
                                key={star}
                                type="button"
                                variant={selectedStar === star ? 'default' : 'outline'}
                                size="sm"
                                className="rounded-full text-xs h-8"
                                onClick={() => {
                                    setSelectedStar(selectedStar === star ? undefined : star)
                                    setPage(1)
                                }}
                            >
                                {star} {t('stars')} ({summary?.countsByStar?.[star as 1 | 2 | 3 | 4 | 5] ?? 0})
                            </Button>
                        ))}

                        <Button
                            type="button"
                            variant={hasMediaOnly ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full text-xs h-8 gap-1.5"
                            onClick={() => {
                                setHasMediaOnly(!hasMediaOnly)
                                setPage(1)
                            }}
                        >
                            <ImageIcon className="h-3.5 w-3.5" />
                            {t('filters.hasMedia')} ({summary?.mediaCount ?? 0})
                        </Button>
                    </div>

                    {/* Sắp xếp */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ArrowUpDown className="h-3 w-3" /> {t('sort.label')}:
                        </span>
                        <select
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value as 'newest' | 'helpful' | 'rating_desc')
                                setPage(1)
                            }}
                            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="newest">{t('sort.newest')}</option>
                            <option value="helpful">{t('sort.helpful')}</option>
                            <option value="rating_desc">{t('sort.ratingDesc')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Danh sách đánh giá hoặc trạng thái */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-5">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : isError ? (
                <ErrorState
                    title={t('errors.loadTitle')}
                    description={t('errors.loadDescription')}
                    onRetry={() => void refetch()}
                />
            ) : reviews.length === 0 ? (
                <Card className="p-8 text-center bg-muted/20 border-dashed">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3.5 rounded-full bg-amber-500/10 text-amber-500">
                            <Smile className="h-8 w-8" />
                        </div>
                        <h4 className="font-semibold text-foreground text-base">{t('empty.title')}</h4>
                        <p className="text-sm text-muted-foreground max-w-md">{t('empty.description')}</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <ReviewCardItem
                            key={review.id}
                            review={review}
                            productId={productId}
                            onOpenLightbox={openLightbox}
                        />
                    ))}

                    {total > 10 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-8 px-3 text-xs"
                            >
                                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                {page > 1 ? `Trang ${page - 1}` : 'Đầu trang'}
                            </Button>
                            <span className="text-xs text-muted-foreground font-mono px-2">
                                {page} / {Math.ceil(total / 10)}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page >= Math.ceil(total / 10)}
                                onClick={() => setPage((p) => p + 1)}
                                className="h-8 px-3 text-xs"
                            >
                                {page < Math.ceil(total / 10) ? `Trang ${page + 1}` : 'Cuối trang'}
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox component */}
            {lightboxGallery && (
                <MediaLightbox
                    items={lightboxGallery.items}
                    initialIndex={lightboxGallery.initialIndex}
                    onClose={() => setLightboxGallery(null)}
                />
            )}
        </div>
    )
}

// ===== Review Card Item Component =====

interface ReviewCardItemProps {
    review: ReviewItem
    productId: string
    onOpenLightbox: (items: MediaLightboxItem[], index: number) => void
}

function ReviewCardItem({ review, productId, onOpenLightbox }: ReviewCardItemProps) {
    const t = useTranslations('reviews')
    const queryClient = useQueryClient()
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)

    const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null)
    const [optimisticCount, setOptimisticCount] = useState<number | null>(null)

    const isLiked = optimisticLiked ?? review.isHelpfulVotedByMe
    const helpfulCount = optimisticCount ?? review.helpfulCount

    const [prevVoted, setPrevVoted] = useState(review.isHelpfulVotedByMe)
    const [prevCount, setPrevCount] = useState(review.helpfulCount)

    if (prevVoted !== review.isHelpfulVotedByMe) {
        setPrevVoted(review.isHelpfulVotedByMe)
        setOptimisticLiked(review.isHelpfulVotedByMe ?? null)
    }
    if (prevCount !== review.helpfulCount) {
        setPrevCount(review.helpfulCount)
        setOptimisticCount(review.helpfulCount)
    }

    // Mutation vote helpful với optimistic update
    const helpfulMutation = useMutation({
        mutationFn: () => toggleHelpfulAction(review.id),
        onMutate: async () => {
            await queryClient.cancelQueries({
                queryKey: ['engagement', 'reviews', productId],
            })

            const nextLiked = !isLiked
            const nextCount = nextLiked ? helpfulCount + 1 : Math.max(0, helpfulCount - 1)
            setOptimisticLiked(nextLiked)
            setOptimisticCount(nextCount)

            // Cập nhật ngay trong cache của React Query
            queryClient.setQueriesData<ReviewListResult>({ queryKey: ['engagement', 'reviews', productId] }, (old) => {
                if (!old) return old
                return {
                    ...old,
                    items: old.items.map((it) =>
                        it.id === review.id
                            ? {
                                  ...it,
                                  isHelpfulVotedByMe: nextLiked,
                                  helpfulCount: nextCount,
                              }
                            : it,
                    ),
                }
            })
        },
        onSuccess: (res) => {
            if (!res.ok) {
                setOptimisticLiked(null)
                setOptimisticCount(null)
                toast.error(res.message || t('errors.voteFailed'))
                void queryClient.invalidateQueries({
                    queryKey: ['engagement', 'reviews', productId],
                })
                return
            }

            const { voted, count } = res.data
            setOptimisticLiked(voted)
            setOptimisticCount(count)
            setPrevVoted(voted)
            setPrevCount(count)

            queryClient.setQueriesData<ReviewListResult>({ queryKey: ['engagement', 'reviews', productId] }, (old) => {
                if (!old) return old
                return {
                    ...old,
                    items: old.items.map((it) =>
                        it.id === review.id
                            ? {
                                  ...it,
                                  isHelpfulVotedByMe: voted,
                                  helpfulCount: count,
                              }
                            : it,
                    ),
                }
            })
        },
        onError: () => {
            setOptimisticLiked(null)
            setOptimisticCount(null)
            toast.error(t('errors.voteFailed'))
            void queryClient.invalidateQueries({
                queryKey: ['engagement', 'reviews', productId],
            })
        },
    })

    // Xử lý gửi phản hồi cho review
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!replyContent.trim()) return

        setIsSubmittingReply(true)
        try {
            const res = await createCommentAction(review.id, {
                reviewId: review.id,
                content: replyContent.trim(),
            })

            if (!res.ok) {
                toast.error(res.message || t('errors.replyFailed'))
                return
            }

            toast.success(t('messages.replySuccess'))
            setReplyContent('')
            setIsReplying(false)
            void queryClient.invalidateQueries({
                queryKey: ['engagement', 'reviews', productId],
            })
        } catch {
            toast.error(t('errors.replyFailed'))
        } finally {
            setIsSubmittingReply(false)
        }
    }

    const allMedia = [...(review.images ?? []), ...(review.videos ?? [])]

    return (
        <Card className="rounded-2xl border border-border/70 overflow-hidden shadow-xs hover:border-border transition-colors">
            <CardContent className="p-5 space-y-4">
                {/* Người đánh giá & Thông tin */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <UserAvatar
                            name={review.userName}
                            imageUrl={review.userAvatar}
                            className="h-10 w-10 border border-border/60"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{review.userName}</span>
                                {review.isVerified && (
                                    <Badge
                                        variant="secondary"
                                        className="text-[11px] font-normal py-0 h-5 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    >
                                        <CheckCircle2 className="h-3 w-3" />
                                        {t('verifiedPurchase')}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                'h-3.5 w-3.5',
                                                star <= review.rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'fill-transparent text-muted-foreground/30',
                                            )}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                                    {formatReviewDateTime(review.createdAt)}
                                </span>
                                {review.variantLabel && (
                                    <span className="text-xs text-muted-foreground/80 before:content-['•'] before:mr-2">
                                        {review.variantLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nội dung nhận xét */}
                {review.comment && (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{review.comment}</p>
                )}

                {/* Thư viện hình ảnh & video đính kèm */}
                {allMedia.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1">
                        {allMedia.map((mediaUrl, idx) => {
                            const isVideo = Boolean(mediaUrl.match(/\.(mp4|webm|mov)$/i))
                            const mediaItems: MediaLightboxItem[] = allMedia.map((url, i) => ({
                                url,
                                type: Boolean(url.match(/\.(mp4|webm|mov)$/i)) ? 'VIDEO' : 'IMAGE',
                                title: `Đánh giá của ${review.userName} (${i + 1}/${allMedia.length})`,
                            }))

                            return (
                                <div
                                    key={idx}
                                    className="group relative size-20 sm:size-24 rounded-2xl overflow-hidden border-2 border-border/70 hover:border-primary/80 bg-muted/30 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer select-none"
                                    onClick={() => onOpenLightbox(mediaItems, idx)}
                                >
                                    {isVideo ? (
                                        <div className="relative size-full flex items-center justify-center bg-black">
                                            <video
                                                src={mediaUrl}
                                                className="size-full object-cover"
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                                <div className="size-8 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                                                    <Play className="size-4 fill-white text-white ml-0.5" />
                                                </div>
                                            </div>
                                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded-md bg-black/70 text-white text-[9px] font-semibold flex items-center gap-1 backdrop-blur-sm">
                                                Video
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="relative size-full">
                                            <Image
                                                src={mediaUrl}
                                                alt="Review media"
                                                fill
                                                sizes="(max-width: 640px) 80px, 96px"
                                                className="object-cover group-hover:scale-108 transition-transform duration-300"
                                            />
                                            {/* Hover Zoom Indicator */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                                                <div className="size-7 rounded-full bg-white/25 text-white backdrop-blur-md flex items-center justify-center shadow-sm">
                                                    <ZoomIn className="size-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Nút Hữu ích & Nút Phản hồi */}
                <div className="flex items-center gap-3 pt-1 text-xs">
                    <button
                        type="button"
                        onClick={() => helpfulMutation.mutate()}
                        disabled={helpfulMutation.isPending}
                        className={cn(
                            'flex items-center gap-1.5 py-1.5 px-3 rounded-full border transition-all duration-200 select-none active:scale-95 shadow-2xs',
                            isLiked
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs hover:bg-primary/90'
                                : 'border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium',
                        )}
                    >
                        <ThumbsUp
                            className={cn(
                                'h-3.5 w-3.5 transition-transform duration-200',
                                isLiked ? 'fill-current scale-105' : 'fill-transparent',
                            )}
                        />
                        <span className={cn(isLiked && 'font-bold')}>{t('buttons.helpful')}</span>
                        {helpfulCount > 0 && (
                            <span className={cn('tabular-nums', isLiked ? 'font-bold' : 'font-normal')}>
                                ({helpfulCount})
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsReplying(!isReplying)}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors font-medium select-none"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{t('buttons.reply')}</span>
                        {review.comments.length > 0 && <span>({review.comments.length})</span>}
                    </button>
                </div>

                {/* Danh sách phản hồi (Comments & Replies) */}
                {review.comments.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-border/50">
                        {review.comments.map((comment) => (
                            <CommentItemCard
                                key={comment.id}
                                comment={comment}
                                reviewId={review.id}
                                productId={productId}
                            />
                        ))}
                    </div>
                )}

                {/* Khung nhập phản hồi cho review (Reply Box) */}
                {isReplying && (
                    <form
                        onSubmit={handleSendReply}
                        className="flex items-center gap-2 pt-2 animate-in fade-in duration-200"
                    >
                        <Input
                            placeholder={t('form.replyPlaceholder')}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="text-xs h-9 bg-background"
                            disabled={isSubmittingReply}
                            autoFocus
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-xs"
                            onClick={() => {
                                setIsReplying(false)
                                setReplyContent('')
                            }}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="h-9 px-3 gap-1 shrink-0"
                            disabled={isSubmittingReply || !replyContent.trim()}
                        >
                            <Send className="h-3.5 w-3.5" />
                            <span>{t('buttons.sendReply')}</span>
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

// ===== Comment Item Card Component (Hỗ trợ trả lời lồng nhau / Threaded replies) =====

interface CommentItemCardProps {
    comment: ReviewCommentItem
    reviewId: string
    productId: string
    depth?: number
}

function CommentItemCard({ comment, reviewId, productId, depth = 0 }: CommentItemCardProps) {
    const t = useTranslations('reviews')
    const queryClient = useQueryClient()
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)

    // Xử lý gửi phản hồi cho comment này
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!replyContent.trim()) return

        setIsSubmittingReply(true)
        try {
            const res = await createCommentAction(reviewId, {
                reviewId,
                content: replyContent.trim(),
                parentId: comment.id,
            })

            if (!res.ok) {
                toast.error(res.message || t('errors.replyFailed'))
                return
            }

            toast.success(t('messages.replySuccess'))
            setReplyContent('')
            setIsReplying(false)
            void queryClient.invalidateQueries({
                queryKey: ['engagement', 'reviews', productId],
            })
        } catch {
            toast.error(t('errors.replyFailed'))
        } finally {
            setIsSubmittingReply(false)
        }
    }

    return (
        <div className="space-y-2">
            <div
                className={cn(
                    'rounded-xl p-3 text-xs space-y-1.5 transition-colors',
                    comment.isSellerReply
                        ? 'bg-amber-500/10 border border-amber-500/25 shadow-xs'
                        : 'bg-muted/40 border border-border/40 hover:border-border/60',
                )}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <UserAvatar
                            name={comment.userName}
                            imageUrl={comment.userAvatar}
                            className="h-6 w-6 border border-border/60 text-[10px]"
                        />
                        <span className="font-semibold text-foreground">{comment.userName}</span>
                        {comment.isSellerReply && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] py-0 h-4 px-1.5 gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium"
                            >
                                <Store className="h-2.5 w-2.5" />
                                {t('sellerReply')}
                            </Badge>
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono" suppressHydrationWarning>
                        {formatReviewDateTime(comment.createdAt)}
                    </span>
                </div>

                <p className="text-foreground/90 pl-8 whitespace-pre-wrap leading-relaxed">{comment.content}</p>

                {/* Nút hành động Trả lời */}
                <div className="pl-8 pt-0.5 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsReplying(!isReplying)}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
                    >
                        <CornerDownRight className="h-3 w-3" />
                        <span>{t('buttons.reply')}</span>
                    </button>
                </div>

                {/* Form nhập phản hồi cho bình luận này */}
                {isReplying && (
                    <form
                        onSubmit={handleSendReply}
                        className="flex items-center gap-2 pt-2 pl-8 animate-in fade-in duration-200"
                    >
                        <Input
                            placeholder={t('form.replyTo', { name: comment.userName })}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="text-xs h-8 bg-background"
                            disabled={isSubmittingReply}
                            autoFocus
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                                setIsReplying(false)
                                setReplyContent('')
                            }}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            className="h-8 px-2.5 gap-1 shrink-0 text-xs"
                            disabled={isSubmittingReply || !replyContent.trim()}
                        >
                            <Send className="h-3 w-3" />
                            <span>{t('buttons.sendReply')}</span>
                        </Button>
                    </form>
                )}
            </div>

            {/* Danh sách các phản hồi lồng nhau (Threaded Replies) */}
            {comment.replies && comment.replies.length > 0 && (
                <div
                    className={cn(
                        'space-y-2 mt-2',
                        depth < 3
                            ? 'ml-5 sm:ml-7 border-l-2 border-border/60 pl-3 sm:pl-4'
                            : 'ml-2 border-l border-border/40 pl-2',
                    )}
                >
                    {comment.replies.map((childReply) => (
                        <CommentItemCard
                            key={childReply.id}
                            comment={childReply}
                            reviewId={reviewId}
                            productId={productId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
