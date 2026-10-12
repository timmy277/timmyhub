'use client'
import Image from 'next/image'

import React, { useState } from 'react'
import { ExternalLink, FileCheck, FileText, ImageOff, Maximize2, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components'
import { cn, resolveMediaUrl } from '@/utils'

interface DocumentPreviewProps {
    url?: string | null
    shopName?: string
    title?: string
    className?: string
    thumbnailOnly?: boolean
}

export function DocumentPreview({ url, shopName, title, className, thumbnailOnly = false }: DocumentPreviewProps) {
    const t = useTranslations('sellerApplications')
    const displayTitle = title || t('docModalTitle')

    const [hasError, setHasError] = useState(false)
    const [isZoomOpen, setIsZoomOpen] = useState(false)

    const resolvedUrl = resolveMediaUrl(url)

    if (thumbnailOnly) {
        if (!resolvedUrl || hasError) {
            return (
                <div
                    className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-muted/40 text-xs text-muted-foreground font-medium',
                        className,
                    )}
                >
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[120px]">{t('idDoc')}</span>
                </div>
            )
        }

        return (
            <>
                <Button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsZoomOpen(true)
                    }}
                    className={cn(
                        'group relative flex items-center gap-2 p-1 rounded-lg border bg-card hover:border-primary/50 transition-all text-left max-w-[160px]',
                        className,
                    )}
                    title={t('clickToZoom')}
                    variant="ghost"
                >
                    <div className="relative size-8 rounded overflow-hidden bg-muted shrink-0 border">
                        <Image
                            src={resolvedUrl}
                            alt="Document"
                            className="size-full object-cover group-hover:scale-105 transition-transform"
                            onError={() => setHasError(true)}
                            width={1200}
                            height={800}
                            sizes="100vw"
                            unoptimized
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-foreground truncate">{t('idDoc')}</span>
                        <span className="text-[10px] text-muted-foreground group-hover:text-primary flex items-center gap-0.5">
                            {t('viewImage')} <Maximize2 className="size-2.5" />
                        </span>
                    </div>
                </Button>

                <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                    <DialogContent className="sm:max-w-3xl p-3 rounded-2xl bg-card border-border shadow-2xl overflow-hidden">
                        <DialogHeader className="p-3 pb-2 border-b">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                    <FileCheck className="size-4 text-primary" />
                                    {displayTitle}
                                </DialogTitle>
                                {resolvedUrl && (
                                    <a
                                        href={resolvedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        {t('openOriginalLink')}
                                        <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>
                        </DialogHeader>
                        <div className="relative aspect-video max-h-[70vh] w-full flex items-center justify-center p-3 bg-muted/20 rounded-xl overflow-hidden mt-2">
                            <Image
                                src={resolvedUrl}
                                alt={displayTitle}
                                className="max-h-[65vh] w-full object-contain rounded-lg shadow-sm"
                                onError={() => setHasError(true)}
                                width={1200}
                                height={800}
                                sizes="100vw"
                                unoptimized
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    // Full detail preview card
    return (
        <>
            <div
                className={cn(
                    'relative overflow-hidden rounded-xl border bg-muted/10 transition-all hover:border-primary/40',
                    className,
                )}
            >
                {resolvedUrl && !hasError ? (
                    <div
                        className="group relative aspect-video w-full overflow-hidden bg-muted/40 cursor-pointer"
                        onClick={() => setIsZoomOpen(true)}
                    >
                        <Image
                            src={resolvedUrl}
                            alt={displayTitle}
                            className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                            onError={() => setHasError(true)}
                            width={1200}
                            height={800}
                            sizes="100vw"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary" className="gap-1.5 shadow-md">
                                <Maximize2 className="size-3.5" />
                                {t('zoomIn')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Graceful fallback illustration card when image fails or URL is mock/broken
                    <div className="p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-muted/20 to-muted/40 min-h-[220px]">
                        <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                            <FileCheck className="size-7 text-primary" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">{displayTitle}</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mb-4">
                            {url ? t('docEncryptedNotice') : t('docNoFile')}
                        </p>
                        {resolvedUrl ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs rounded-lg"
                                    onClick={() => window.open(resolvedUrl, '_blank', 'noopener,noreferrer')}
                                >
                                    <ExternalLink className="size-3.5" />
                                    {t('openOriginalFile')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5 text-xs rounded-lg"
                                    onClick={() => setIsZoomOpen(true)}
                                >
                                    <Maximize2 className="size-3.5" />
                                    {t('viewDocumentFrame')}
                                </Button>
                            </div>
                        ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                                <ImageOff className="size-3" /> {t('noImage')}
                            </Badge>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between p-3 border-t bg-card text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Shield className="size-3.5 text-primary" />
                        {shopName ? t('profileLabel', { name: shopName }) : t('identityVerify')}
                    </span>
                    {resolvedUrl && (
                        <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                            {t('downloadOriginal')}
                            <ExternalLink className="size-3" />
                        </a>
                    )}
                </div>
            </div>

            {/* Zoom dialog */}
            <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent className="sm:max-w-4xl p-3 rounded-2xl bg-card border-border shadow-2xl overflow-hidden">
                    <DialogHeader className="p-3 pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                <FileCheck className="size-4 text-primary" />
                                {displayTitle}
                            </DialogTitle>
                            {resolvedUrl && (
                                <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    {t('openOriginalLink')}
                                    <ExternalLink className="size-3" />
                                </a>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="relative aspect-video max-h-[75vh] w-full flex items-center justify-center p-3 bg-muted/20 rounded-xl overflow-hidden mt-2">
                        {resolvedUrl && !hasError ? (
                            <Image
                                src={resolvedUrl}
                                alt={displayTitle}
                                className="max-h-[70vh] w-full object-contain rounded-lg shadow-sm"
                                onError={() => setHasError(true)}
                                width={1200}
                                height={800}
                                sizes="100vw"
                                unoptimized
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                                    <FileCheck className="size-8 text-primary" />
                                </div>
                                <h4 className="text-base font-semibold mb-1 text-foreground">
                                    {t('docFallbackTitle')}
                                </h4>
                                <p className="text-xs text-muted-foreground max-w-md mb-4">
                                    {resolvedUrl ? t('docFallbackNotice') : t('docNoFile')}
                                </p>
                                {resolvedUrl && (
                                    <Button variant="default" size="sm" asChild className="gap-1.5 rounded-lg">
                                        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="size-3.5" />
                                            {t('openInNewTab')}
                                        </a>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
