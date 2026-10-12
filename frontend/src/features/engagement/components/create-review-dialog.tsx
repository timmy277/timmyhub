'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Resolver } from 'react-hook-form'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Camera, CheckCircle2, Loader2, Send, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import type { CreateReviewInput } from '@timmyhub/contracts'
import { CreateReviewInputSchema } from '@timmyhub/contracts'

import {
    Badge,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Label,
    Rating,
    Separator,
} from '@/components/ui'
import { FloatTextarea, UploadSection } from '@/components/common'
import { QUERY_KEY } from '@/constants'
import { cn } from '@/utils'

import { createReviewAction } from '../actions'

export interface CreateReviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: {
        id: string
        name: string
        imageUrl?: string
        variantLabel?: string
    }
    orderItemId: string
    onSuccess?: () => void
}

export function CreateReviewDialog({ open, onOpenChange, product, orderItemId, onSuccess }: CreateReviewDialogProps) {
    // ===== State =====
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const [mediaUrls, setMediaUrls] = useState<string[]>([])

    // ===== Hooks =====
    const t = useTranslations('reviews')
    const queryClient = useQueryClient()

    const form = useForm<CreateReviewInput>({
        resolver: zodResolver(CreateReviewInputSchema) as unknown as Resolver<CreateReviewInput>,
        defaultValues: {
            productId: product.id,
            orderItemId,
            rating: 5,
            comment: '',
            images: [],
            videos: [],
        },
    })

    const currentRating = useWatch({ control: form.control, name: 'rating' }) ?? 5
    const currentComment = useWatch({ control: form.control, name: 'comment' }) ?? ''

    const createReviewMutation = useMutation({
        mutationFn: (values: CreateReviewInput) => createReviewAction(values),
        onSuccess: (res) => {
            if (!res.ok) {
                toast.error(res.message || t('errors.createFailed'))
                return
            }

            toast.success(t('messages.createSuccess'))
            void queryClient.invalidateQueries({
                queryKey: ['engagement', 'reviews', product.id],
            })
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.ENGAGEMENT.SUMMARY(product.id),
            })
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEY.ENGAGEMENT.PENDING,
            })
            void queryClient.invalidateQueries({
                queryKey: ['order', 'my-orders'],
            })

            onOpenChange(false)
            onSuccess?.()
        },
        onError: () => {
            toast.error(t('errors.createFailed'))
        },
    })

    // ===== Derived =====
    const displayRating = hoverRating !== null ? hoverRating : currentRating

    const ratingLabels: Record<number, { text: string; badge: string; color: string }> = {
        1: {
            text: t('ratings.terrible'),
            badge: `1/5 ${t('stars')}`,
            color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        },
        2: {
            text: t('ratings.poor'),
            badge: `2/5 ${t('stars')}`,
            color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        },
        3: {
            text: t('ratings.average'),
            badge: `3/5 ${t('stars')}`,
            color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        },
        4: {
            text: t('ratings.good'),
            badge: `4/5 ${t('stars')}`,
            color: 'text-lime-600 dark:text-lime-400 bg-lime-500/10 border-lime-500/20',
        },
        5: {
            text: t('ratings.excellent'),
            badge: `5/5 ${t('stars')}`,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        },
    }

    const activeRatingInfo = ratingLabels[displayRating] || ratingLabels[5]

    const quickTagKeys = [
        'quality',
        'fastDelivery',
        'goodPackaging',
        'asDescribed',
        'worthTheMoney',
        'greatService',
    ] as const

    // ===== Handlers =====
    const handleMediaChange = (urls: unknown) => {
        const urlArray = Array.isArray(urls) ? (urls.filter((u): u is string => typeof u === 'string') as string[]) : []
        setMediaUrls(urlArray)

        const images = urlArray.filter((u) => !u.match(/\.(mp4|webm|mov)$/i))
        const videos = urlArray.filter((u) => u.match(/\.(mp4|webm|mov)$/i))

        form.setValue('images', images)
        form.setValue('videos', videos)
    }

    const handleToggleTag = (tagText: string) => {
        const currentText = form.getValues('comment') || ''
        if (currentText.includes(tagText)) {
            const newText = currentText
                .replace(tagText, '')
                .replace(/\s{2,}/g, ' ')
                .trim()
            form.setValue('comment', newText, { shouldValidate: true })
        } else {
            const separator = currentText.length > 0 && !currentText.endsWith(' ') ? ' • ' : ''
            const newText = `${currentText}${separator}${tagText}`.trim()
            form.setValue('comment', newText.slice(0, 500), { shouldValidate: true })
        }
    }

    const onSubmit = (values: CreateReviewInput) => {
        createReviewMutation.mutate(values)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl flex flex-col bg-background">
                {/* Header */}
                <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/5 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                            <Sparkles className="size-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                                {t('dialog.title')}
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                {t('dialog.description')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Form Body - Horizontal Layout on md+ screens */}
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* CỘT TRÁI (md: 5 cols): Tóm tắt sản phẩm, Đánh giá sao & Quick Tags */}
                        <div className="md:col-span-5 space-y-4">
                            {/* Card thông tin sản phẩm với ảnh preview TO HƠN */}
                            <Card className="border border-border/70 shadow-2xs bg-card/60 overflow-hidden">
                                <CardContent className="p-4 flex gap-4 items-center">
                                    {product.imageUrl ? (
                                        <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-xs">
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                sizes="96px"
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="size-20 sm:size-24 rounded-2xl bg-muted/30 border border-border/80 flex items-center justify-center shrink-0">
                                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <p className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-snug">
                                            {product.name}
                                        </p>
                                        {product.variantLabel && (
                                            <div className="text-xs text-muted-foreground">
                                                {t('product.variant')}:{' '}
                                                <span className="font-medium text-foreground/80">
                                                    {product.variantLabel}
                                                </span>
                                            </div>
                                        )}
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] h-5 px-2 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium"
                                        >
                                            <CheckCircle2 className="size-3" />
                                            {t('dialog.completedOrder')}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card Đánh giá sao (Shadcn Rating Component) */}
                            <Card className="border border-amber-500/25 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent shadow-2xs">
                                <CardContent className="p-5 flex flex-col items-center justify-center space-y-3.5">
                                    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground text-center">
                                        {t('dialog.productQuality')}
                                    </Label>

                                    {/* Component Rating chuẩn Shadcn */}
                                    <div className="py-1">
                                        <Rating
                                            size="xl"
                                            value={currentRating}
                                            onChange={(val) => form.setValue('rating', val, { shouldValidate: true })}
                                            onHoverChange={setHoverRating}
                                        />
                                    </div>

                                    {/* Nhãn tâm trạng tương ứng số sao */}
                                    <div
                                        className={cn(
                                            'px-3.5 py-1 rounded-full border text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-2xs',
                                            activeRatingInfo.color,
                                        )}
                                    >
                                        <span>{activeRatingInfo.text}</span>
                                        <span className="opacity-70 font-mono text-[11px]">
                                            ({activeRatingInfo.badge})
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Gợi ý đánh giá nhanh (Quick Tags) */}
                            <div className="space-y-2 pt-1">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles className="size-3 text-amber-500" />
                                    {t('dialog.quickTagsLabel')}:
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickTagKeys.map((tagKey) => {
                                        const tagText = t(`dialog.quickTags.${tagKey}`)
                                        const isSelected = currentComment.includes(tagText)
                                        return (
                                            <Button
                                                key={tagKey}
                                                type="button"
                                                size="xs"
                                                variant={isSelected ? 'default' : 'outline'}
                                                onClick={() => handleToggleTag(tagText)}
                                                className={cn(
                                                    'rounded-full text-xs font-normal transition-all',
                                                    isSelected
                                                        ? 'shadow-2xs font-medium'
                                                        : 'border-border/70 text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {tagText}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* CỘT PHẢI (md: 7 cols): Ô nhận xét (FloatTextarea) và Tải lên hình ảnh/video */}
                        <div className="md:col-span-7 space-y-4">
                            {/* Ô nhập nhận xét chi tiết dùng FloatTextarea */}
                            <div className="space-y-1.5">
                                <FloatTextarea
                                    label={t('form.commentLabel')}
                                    placeholder=" "
                                    rows={4}
                                    maxLength={500}
                                    error={form.formState.errors.comment?.message}
                                    helperText={t('form.commentPlaceholder')}
                                    {...form.register('comment')}
                                />
                                <div className="flex justify-end text-[11px] text-muted-foreground font-mono">
                                    {currentComment.length}/500
                                </div>
                            </div>

                            <Separator className="bg-border/60" />

                            {/* Tải lên ảnh & video */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <Camera className="size-3.5 text-primary" />
                                        {t('form.mediaLabel')}
                                    </Label>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {mediaUrls.length}/6
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{t('form.mediaDescription')}</p>
                                <div className="rounded-2xl border border-dashed border-border/80 p-3 bg-muted/10 hover:border-primary/50 transition-colors">
                                    <UploadSection
                                        variant="dropzone"
                                        multiple={true}
                                        maxFiles={6}
                                        acceptType="all"
                                        ownerType="REVIEW"
                                        value={mediaUrls}
                                        onChange={handleMediaChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <DialogFooter className="pt-4 border-t border-border/50 flex items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createReviewMutation.isPending}
                            className="rounded-xl px-4 text-xs sm:text-sm"
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={createReviewMutation.isPending}
                            className="rounded-xl px-5 text-xs sm:text-sm font-semibold shadow-xs gap-1.5 min-w-32"
                        >
                            {createReviewMutation.isPending ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    <span>{t('buttons.submitting')}</span>
                                </>
                            ) : (
                                <>
                                    <Send className="size-4" />
                                    <span>{t('buttons.submitReview')}</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
