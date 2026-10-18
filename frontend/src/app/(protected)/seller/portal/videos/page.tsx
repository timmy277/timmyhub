'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react'
import Image from 'next/image'
import { Eye, Film, Heart, Play, Plus, ShoppingBag, Trash2, Video } from 'lucide-react'

import { Badge, Button, Card, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { SellerVideoForm, ShoppableVideoModal, useSellerVideos } from '@/features/content'

// ═══════════════════════════════════════════════════════════════════════════
// 2. PAGE DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export default function SellerVideosPage() {
    // 2.1. State & Hooks
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
    const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    const { videos, total, isLoading, deleteVideo, isDeleting } = useSellerVideos()

    // 2.2. Handlers
    const handlePreview = (videoId: string) => {
        setPreviewVideoId(videoId)
        setIsPreviewOpen(true)
    }

    const handleDelete = async (videoId: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa video bài đăng này không?')) {
            await deleteVideo(videoId)
        }
    }

    // 2.3. JSX Return
    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <Video className="size-6 text-primary" />
                        Quản lý Video Bán Hàng (Shoppable Videos)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Đăng tải video ngắn giới thiệu sản phẩm kèm tính năng giỏ hàng mua sắm trực tiếp trên video.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setActiveTab(activeTab === 'list' ? 'create' : 'list')}
                        className="rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                        {activeTab === 'list' ? (
                            <>
                                <Plus className="size-4" />
                                Đăng video mới
                            </>
                        ) : (
                            <>
                                <Film className="size-4" />
                                Xem danh sách video
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'list' | 'create')}>
                <TabsList className="bg-muted/60 p-1 rounded-xl">
                    <TabsTrigger value="list" className="rounded-lg text-xs font-semibold px-4">
                        Video của Shop ({total})
                    </TabsTrigger>
                    <TabsTrigger value="create" className="rounded-lg text-xs font-semibold px-4">
                        Tạo bài đăng video mới
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Danh sách video đã đăng */}
                <TabsContent value="list" className="mt-6 space-y-4">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="rounded-2xl p-0 overflow-hidden">
                                    <Skeleton className="h-44 w-full" />
                                    <div className="p-4 space-y-3">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-full" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : videos.length === 0 ? (
                        <Card className="p-12 text-center border-dashed rounded-2xl space-y-4">
                            <div className="flex size-14 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Film className="size-7" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-foreground">Shop chưa có video bán hàng nào</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Hãy đăng tải video đầu tiên để tiếp cận hàng triệu khách hàng tiềm năng trên trang
                                    chủ TimmyHub.
                                </p>
                            </div>
                            <Button
                                onClick={() => setActiveTab('create')}
                                className="rounded-xl text-xs font-bold px-5"
                            >
                                <Plus className="size-4 mr-1.5" />
                                Tạo video ngay
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {videos.map((video) => (
                                <Card
                                    key={video.id}
                                    className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all p-0 flex flex-col"
                                >
                                    {/* Thumbnail Preview */}
                                    <div className="relative h-44 w-full bg-neutral-900 overflow-hidden border-b border-border">
                                        {video.thumbnailUrl ? (
                                            <Image
                                                src={video.thumbnailUrl}
                                                alt={video.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                unoptimized
                                            />
                                        ) : (
                                            <video
                                                src={`${video.videoUrl}#t=0.0001`}
                                                preload="metadata"
                                                playsInline
                                                muted
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}

                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                onClick={() => handlePreview(video.id)}
                                                className="size-11 rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform"
                                            >
                                                <Play className="size-5 fill-current ml-0.5" />
                                            </Button>
                                        </div>

                                        <Badge
                                            variant="secondary"
                                            className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] border-0 backdrop-blur-sm"
                                        >
                                            {video.status}
                                        </Badge>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex flex-1 flex-col space-y-3">
                                        <h3 className="font-bold text-sm text-foreground line-clamp-2">
                                            {video.title}
                                        </h3>
                                        {video.content && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {video.content}
                                            </p>
                                        )}

                                        {/* Products Tagged */}
                                        <div className="mt-auto pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium">
                                                <ShoppingBag className="size-3.5 text-primary" />
                                                {video.productTags.length} sản phẩm gắn
                                            </span>

                                            <div className="flex items-center gap-2.5">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="size-3" />
                                                    {video.viewCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Heart className="size-3 text-red-500 fill-red-500" />
                                                    {video.likeCount}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePreview(video.id)}
                                                className="h-8 text-xs rounded-xl"
                                            >
                                                Xem thử
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isDeleting}
                                                onClick={() => handleDelete(video.id)}
                                                className="h-8 text-xs rounded-xl"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Đăng video mới */}
                <TabsContent value="create" className="mt-6">
                    <SellerVideoForm onSuccess={() => setActiveTab('list')} />
                </TabsContent>
            </Tabs>

            {/* Preview Modal */}
            <ShoppableVideoModal
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                initialPostId={previewVideoId ?? undefined}
                videos={videos}
            />
        </div>
    )
}
