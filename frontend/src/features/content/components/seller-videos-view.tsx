'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react'
import type { VideoPostDto } from '@timmyhub/contracts'
import { Eye, Film, Heart, Plus, ShoppingBag, Video, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common'
import { Button, Card, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { useSellerVideos } from '../hooks/use-seller-videos'
import { SellerVideoDetailPanel } from './seller-video-detail-panel'
import { SellerVideoForm } from './seller-video-form'
import { SellerVideoTable } from './seller-video-table'

// ═══════════════════════════════════════════════════════════════════════════
// 2. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function SellerVideosView() {
    const t = useTranslations('content.sellerVideos')

    // ===== State =====
    const { videos, total, isLoading, deleteVideo } = useSellerVideos()
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'detail'>('list')
    const [selectedVideo, setSelectedVideo] = useState<VideoPostDto | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

    // ===== Derived =====
    const stats = useMemo(() => {
        const totalViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0)
        const totalLikes = videos.reduce((acc, v) => acc + (v.likeCount || 0), 0)
        const totalProductsTagged = videos.reduce((acc, v) => acc + (v.productTags?.length || 0), 0)
        return { totalVideos: total || videos.length, totalViews, totalLikes, totalProductsTagged }
    }, [videos, total])

    // ===== Handlers =====
    const handleSelectDetail = (video: VideoPostDto) => {
        setSelectedVideo(video)
        setActiveTab('detail')
    }

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return
        await deleteVideo(deleteTargetId)
        if (selectedVideo?.id === deleteTargetId) {
            setSelectedVideo(null)
            setActiveTab('list')
        }
        setDeleteTargetId(null)
        toast.success(t('deleteSuccess'))
    }

    // ===== Render =====
    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Video className="size-5" />
                        </div>
                        <span>{t('title')}</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">{t('subtitle')}</p>
                </div>

                <Button
                    onClick={() => setActiveTab(activeTab === 'create' ? 'list' : 'create')}
                    className="rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                    {activeTab === 'create' ? (
                        <>
                            <Film className="size-4" />
                            {t('listTab')}
                        </>
                    ) : (
                        <>
                            <Plus className="size-4" />
                            {t('createTab')}
                        </>
                    )}
                </Button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {[
                    { label: t('totalVideos'), val: stats.totalVideos, icon: Film, color: 'text-emerald-500' },
                    {
                        label: t('totalViews'),
                        val: stats.totalViews.toLocaleString(),
                        icon: Eye,
                        color: 'text-blue-500',
                    },
                    {
                        label: t('totalLikes'),
                        val: stats.totalLikes.toLocaleString(),
                        icon: Heart,
                        color: 'text-rose-500',
                    },
                    {
                        label: t('totalProducts'),
                        val: stats.totalProductsTagged,
                        icon: ShoppingBag,
                        color: 'text-amber-500',
                    },
                ].map((st, i) => (
                    <Card key={i} className="p-4 rounded-2xl bg-card border-border/70 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-muted/60 ${st.color}`}>
                            <st.icon className="size-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{st.label}</p>
                            <p className="text-lg font-bold text-foreground font-mono">{isLoading ? '...' : st.val}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'list' | 'create' | 'detail')}>
                <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/50">
                    <TabsTrigger value="list" className="rounded-xl text-xs data-[state=active]:bg-background">
                        {t('listTab')} ({videos.length})
                    </TabsTrigger>
                    <TabsTrigger value="create" className="rounded-xl text-xs data-[state=active]:bg-background">
                        {t('createTab')}
                    </TabsTrigger>
                    {selectedVideo && (
                        <TabsTrigger
                            value="detail"
                            className="rounded-xl text-xs data-[state=active]:bg-background flex items-center gap-1.5"
                        >
                            <span>{t('detailTab')}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedVideo(null)
                                    setActiveTab('list')
                                }}
                                className="size-4 rounded-full hover:bg-muted-foreground/20 p-0"
                            >
                                <X className="size-3" />
                            </Button>
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="list" className="mt-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <SellerVideoTable
                            videos={videos}
                            onSelectDetail={handleSelectDetail}
                            onDeleteVideo={(id: string) => setDeleteTargetId(id)}
                        />
                    )}
                </TabsContent>

                <TabsContent value="create" className="mt-4">
                    <SellerVideoForm onSuccess={() => setActiveTab('list')} />
                </TabsContent>

                {selectedVideo && (
                    <TabsContent value="detail" className="mt-4">
                        <SellerVideoDetailPanel
                            video={selectedVideo}
                            onBack={() => setActiveTab('list')}
                            onDelete={(id) => setDeleteTargetId(id)}
                        />
                    </TabsContent>
                )}
            </Tabs>

            <ConfirmDialog
                open={Boolean(deleteTargetId)}
                onOpenChange={(open) => !open && setDeleteTargetId(null)}
                title={t('deleteConfirmTitle')}
                description={t('deleteConfirmDesc')}
                confirmLabel={t('confirmDelete')}
                cancelLabel={t('cancel')}
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}
