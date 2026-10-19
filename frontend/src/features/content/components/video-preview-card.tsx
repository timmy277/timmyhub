'use client'

import React from 'react'
import { Camera, Film, Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, Button, Progress } from '@/components/ui'
import { formatBytes } from '@/utils'

export interface VideoPreviewCardProps {
    file: File | null
    displayUrl: string
    isUploading: boolean
    uploadProgress: number
    isExtractingFrame: boolean
    onOpenPicker: () => void
    onRemove: (e: React.MouseEvent) => void
    onExtractFrame: () => void
}

export function VideoPreviewCard({
    file,
    displayUrl,
    isUploading,
    uploadProgress,
    isExtractingFrame,
    onOpenPicker,
    onRemove,
    onExtractFrame,
}: VideoPreviewCardProps) {
    const t = useTranslations('content.uploader')

    return (
        <div className="relative rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Film className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate max-w-xs">
                            {file ? file.name : 'Shoppable Video'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            {file && <span>{formatBytes(file.size)}</span>}
                            <Badge
                                variant="secondary"
                                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                            >
                                {t('readyToPublish')}
                            </Badge>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenPicker}
                        className="h-8 rounded-xl text-xs"
                    >
                        {t('changeVideo')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="size-8 rounded-xl text-muted-foreground hover:text-red-500"
                        title={t('removeVideo')}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Progress bar khi đang tải lên */}
            {isUploading && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="size-3.5 animate-spin text-emerald-500" />
                            {t('uploadingHls')}
                        </span>
                        <span className="font-mono font-bold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                </div>
            )}

            {/* Video Player Mini Preview */}
            <div className="relative aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-border shadow-inner">
                <video src={displayUrl} controls playsInline className="size-full object-contain" />
            </div>

            {/* Thumbnail Capture Action */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                    <Camera className="size-3.5 text-emerald-500" />
                    {t('thumbnailAt')}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isExtractingFrame}
                    onClick={onExtractFrame}
                    className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:underline px-2"
                >
                    {isExtractingFrame ? (
                        <>
                            <Loader2 className="size-3 animate-spin mr-1" />
                            {t('extracting')}
                        </>
                    ) : (
                        t('extractAgain')
                    )}
                </Button>
            </div>
        </div>
    )
}
