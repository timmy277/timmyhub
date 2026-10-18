'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react'
import type { VideoPostDto } from '@timmyhub/contracts'
import { Eye, Film, Heart, Plus, ShoppingBag, Video, X } from 'lucide-react'

import { Button, Card, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { SellerVideoDetailPanel, SellerVideoForm, SellerVideoTable, useSellerVideos } from '@/features/content'

// ═══════════════════════════════════════════════════════════════════════════
// 2. PAGE DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export default function SellerVideosPage() {
    // 2.1. State & Data Hooks
    const { videos, total, isLoading, deleteVideo, isDeleting } = useSellerVideos()

    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'detail'>('list')
    const [selectedVideo, setSelectedVideo] = useState<VideoPostDto | null>(null)

    // 2.2. Calculated Stats
    const stats = useMemo(() => {
        const totalViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0)
        const totalLikes = videos.reduce((acc, v) => acc + (v.likeCount || 0), 0)
        const totalProductsTagged = videos.reduce((acc, v) => acc + (v.productTags?.length || 0), 0)

        return {
            totalVideos: total || videos.length,
            totalViews,
            totalLikes,
            totalProductsTagged,
        }
    }, [videos, total])

    // 2.3. Handlers
    const handleSelectDetail = (video: VideoPostDto) => {
        setSelectedVideo(video)
        setActiveTab('detail')
    }

    const handleBackToList = () => {
        setActiveTab('list')
    }

    const handleCloseDetailTab = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedVideo(null)
        setActiveTab('list')
    }

    const handleDelete = async (videoId: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa video bài đăng này không?')) {
            await deleteVideo(videoId)
            if (selectedVideo?.id === videoId) {
                setSelectedVideo(null)
                setActiveTab('list')
            }
        }
    }

    const handleCreateSuccess = () => {
        setActiveTab('list')
    }

    // 2.4. JSX Return
    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header Portal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Video className="size-5" />
                        </div>
                        <span>Quản lý Video & Bài Viết Bán Hàng</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Đăng tải video ngắn shoppable, gắn link giỏ hàng trực tiếp để khách hàng mua sắm ngay trong
                        video.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setActiveTab(activeTab === 'create' ? 'list' : 'create')}
                        className="rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-black"
                    >
                        {activeTab === 'create' ? (
                            <>
                                <Film className="size-4" />
                                Danh sách video
                            </>
                        ) : (
                            <>
                                <Plus className="size-4" />
                                Đăng video mới
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 rounded-3xl border-border bg-card space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-semibold">Tổng số video</span>
                        <Film className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-foreground font-mono">{stats.totalVideos}</p>
                    <p className="text-[10px] text-muted-foreground">Video đang lưu hành</p>
                </Card>

                <Card className="p-4 rounded-3xl border-border bg-card space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-semibold">Lượt xem tích lũy</span>
                        <Eye className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-foreground font-mono">
                        {stats.totalViews.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Trên toàn storefront</p>
                </Card>

                <Card className="p-4 rounded-3xl border-border bg-card space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-semibold">Lượt thích</span>
                        <Heart className="size-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-black text-foreground font-mono">
                        {stats.totalLikes.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Tương tác từ khách</p>
                </Card>

                <Card className="p-4 rounded-3xl border-border bg-card space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-semibold">Sản phẩm gắn kèm</span>
                        <ShoppingBag className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-foreground font-mono">{stats.totalProductsTagged}</p>
                    <p className="text-[10px] text-muted-foreground">Shoppable product tags</p>
                </Card>
            </div>

            {/* Folder Tab Strip */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as typeof activeTab)}
                className="space-y-4"
            >
                <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/80">
                    <TabsTrigger value="list" className="rounded-xl text-xs font-bold px-4 py-2">
                        Danh sách video ({videos.length})
                    </TabsTrigger>

                    <TabsTrigger value="create" className="rounded-xl text-xs font-bold px-4 py-2">
                        Tạo bài đăng video mới
                    </TabsTrigger>

                    {selectedVideo && (
                        <TabsTrigger
                            value="detail"
                            className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 max-w-xs"
                        >
                            <span className="truncate">Chi tiết: {selectedVideo.title}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCloseDetailTab}
                                className="size-4 p-0 h-auto rounded-full hover:bg-black/20 text-muted-foreground"
                            >
                                <X className="size-3" />
                            </Button>
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Tab 1: Danh sách video dạng Table chuẩn */}
                <TabsContent value="list" className="mt-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full rounded-2xl" />
                            <Skeleton className="h-64 w-full rounded-2xl" />
                        </div>
                    ) : (
                        <SellerVideoTable
                            videos={videos}
                            isLoading={isLoading}
                            onSelectDetail={handleSelectDetail}
                            onDeleteVideo={handleDelete}
                            isDeleting={isDeleting}
                        />
                    )}
                </TabsContent>

                {/* Tab 2: Tạo bài đăng video mới với Draggable upload dropzone */}
                <TabsContent value="create" className="mt-4">
                    <SellerVideoForm onSuccess={handleCreateSuccess} />
                </TabsContent>

                {/* Tab 3: Tabs Detail hiển thị đầy đủ thông tin video, player, sản phẩm */}
                {selectedVideo && (
                    <TabsContent value="detail" className="mt-4">
                        <SellerVideoDetailPanel
                            video={selectedVideo}
                            onBackToList={handleBackToList}
                            onDeleteVideo={handleDelete}
                            isDeleting={isDeleting}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
