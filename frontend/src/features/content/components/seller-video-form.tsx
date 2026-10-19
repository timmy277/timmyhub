'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CreateVideoPostInput } from '@timmyhub/contracts'
import { CreateVideoPostSchema } from '@timmyhub/contracts'
import { Sparkles, Video } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { FloatInput, FloatSelect, FloatTextarea } from '@/components/common'
import { Button, Card, Label, SelectItem, Spinner } from '@/components/ui'

import { useSellerVideos } from '../hooks/use-seller-videos'
import { HashtagInputList } from './hashtag-input-list'
import { ProductPickerDialog } from './product-picker-dialog'
import { VideoDropzoneUpload } from './video-dropzone-upload'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface SellerVideoFormProps {
    onSuccess?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function SellerVideoForm({ onSuccess }: SellerVideoFormProps) {
    const t = useTranslations('content.form')

    // ===== State =====
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false)
    const { createVideo, isCreating } = useSellerVideos()

    // ===== Form Hooks =====
    const form = useForm<CreateVideoPostInput>({
        resolver: zodResolver(CreateVideoPostSchema),
        defaultValues: {
            title: '',
            content: '',
            videoUrl: '',
            thumbnailUrl: '',
            hashtags: [],
            productIds: [],
            status: 'PUBLISHED',
        },
    })

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = form

    const watchedVideoUrl = useWatch({ control, name: 'videoUrl' })
    const watchedThumbnailUrl = useWatch({ control, name: 'thumbnailUrl' })
    const watchedProductIds = useWatch({ control, name: 'productIds' }) || []
    const watchedHashtags = useWatch({ control, name: 'hashtags' }) || []

    // ===== Handlers =====
    const handleToggleProduct = (productId: string) => {
        if (watchedProductIds.includes(productId)) {
            setValue(
                'productIds',
                watchedProductIds.filter((id) => id !== productId),
                { shouldValidate: true },
            )
        } else {
            setValue('productIds', [...watchedProductIds, productId], { shouldValidate: true })
        }
    }

    const onSubmit = async (data: CreateVideoPostInput) => {
        if (!data.videoUrl) {
            toast.error(t('uploadRequired'))
            return
        }
        await createVideo({
            ...data,
            thumbnailUrl: data.thumbnailUrl || `${data.videoUrl}#t=0.0001`,
        })
        form.reset()
        toast.success(t('successToast'))
        onSuccess?.()
    }

    // ===== Render =====
    return (
        <Card className="p-6 md:p-8 bg-card border-border/80 shadow-lg rounded-3xl max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3.5 border-b border-border/60 pb-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Video className="size-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>{t('title')}</span>
                        <Sparkles className="size-4 text-emerald-500 animate-pulse" />
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {t('videoLabel')} <span className="text-red-500">*</span>
                    </Label>
                    <VideoDropzoneUpload
                        value={watchedVideoUrl}
                        thumbnailValue={watchedThumbnailUrl}
                        onChange={(url) => setValue('videoUrl', url, { shouldValidate: true })}
                        onThumbnailChange={(thumb) => setValue('thumbnailUrl', thumb, { shouldValidate: true })}
                        error={errors.videoUrl?.message}
                    />
                </div>

                <div className="space-y-4">
                    <FloatInput
                        {...register('title')}
                        label={t('titleLabel')}
                        error={errors.title?.message}
                        required
                        labelClassName="bg-card peer-focus:bg-card peer-autofill:bg-card"
                    />

                    <FloatTextarea
                        {...register('content')}
                        label={t('contentLabel')}
                        error={errors.content?.message}
                        rows={3}
                        labelClassName="bg-card peer-focus:bg-card peer-autofill:bg-card"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-xs font-bold text-foreground">{t('productTagsLabel')}</Label>
                            <p className="text-[11px] text-muted-foreground">{t('productTagsDesc')}</p>
                        </div>
                        <ProductPickerDialog
                            open={isProductPickerOpen}
                            onOpenChange={setIsProductPickerOpen}
                            selectedProductIds={watchedProductIds}
                            onToggleProduct={handleToggleProduct}
                        />
                    </div>
                    {errors.productIds && <p className="text-xs text-red-500">{errors.productIds.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">{t('hashtagsLabel')}</Label>
                    <HashtagInputList hashtags={watchedHashtags} onChange={(tags) => setValue('hashtags', tags)} />
                </div>

                <div className="space-y-2">
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <FloatSelect
                                label={t('statusLabel')}
                                value={field.value}
                                onValueChange={field.onChange}
                                labelClassName="bg-card peer-focus:bg-card peer-autofill:bg-card"
                            >
                                <SelectItem value="PUBLISHED">{t('statusPublished')}</SelectItem>
                                <SelectItem value="DRAFT">{t('statusDraft')}</SelectItem>
                                <SelectItem value="HIDDEN">{t('statusHidden')}</SelectItem>
                            </FloatSelect>
                        )}
                    />
                </div>

                <div className="pt-4 border-t border-border/60 flex justify-end gap-3">
                    <Button
                        type="submit"
                        disabled={isCreating}
                        className="rounded-2xl px-6 h-11 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <Spinner className="size-4 animate-spin" />
                                <span>{t('publishing')}</span>
                            </>
                        ) : (
                            t('submit')
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
