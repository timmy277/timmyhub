'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { VideoPostDto } from '@timmyhub/contracts'
import {
    ArrowLeft,
    ExternalLink,
    Eye,
    Film,
    Heart,
    Info,
    MessageCircle,
    Play,
    Share2,
    ShoppingBag,
    Sparkles,
    Trash2,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Card,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui'
import { ROUTE } from '@/constants'

import { HlsVideoPlayer } from './hls-video-player'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
export interface SellerVideoDetailPanelProps {
    video: VideoPostDto
    onBackToList: () => void
    onDeleteVideo: (videoId: string) => void
    isDeleting?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function SellerVideoDetailPanel({
    video,
    onBackToList,
    onDeleteVideo,
    isDeleting,
}: SellerVideoDetailPanelProps) {
    // 3.1. State
    const [detailTab, setDetailTab] = useState<'player' | 'products' | 'stats' | 'info'>('player')
    const [isMuted, setIsMuted] = useState(false)

    const taggedProducts = video.productTags || []

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            const shareUrl = `${window.location.origin}${ROUTE.VIDEO_DETAIL(video.id)}`
            navigator.clipboard?.writeText(shareUrl)
            toast.success('Đã sao chép liên kết video!')
        }
    }

    // 3.2. JSX Return
    return (
        <div className="space-y-6">
            {/* Top Bar: Action Buttons & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBackToList}
                        className="rounded-xl text-xs font-semibold gap-1.5 h-9"
                    >
                        <ArrowLeft className="size-4" />
                        Quay lại danh sách
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-foreground truncate max-w-md">{video.title}</h2>
                            {video.status === 'PUBLISHED' ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    Đã xuất bản
                                </Badge>
                            ) : (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                    Bản nháp
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">Mã video: {video.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="rounded-xl text-xs font-semibold gap-1.5 h-9"
                    >
                        <Share2 className="size-3.5" />
                        Sao chép link
                    </Button>

                    <Button
                        size="sm"
                        asChild
                        className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-emerald-500 hover:bg-emerald-600 text-black shadow-sm"
                    >
                        <Link href={ROUTE.VIDEO_DETAIL(video.id)} target="_blank">
                            <ExternalLink className="size-3.5" />
                            Xem trang toàn màn hình
                        </Link>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={isDeleting}
                        onClick={() => onDeleteVideo(video.id)}
                        className="size-9 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        title="Xóa video"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Folder Tabs Detail Strip */}
            <Tabs value={detailTab} onValueChange={(val) => setDetailTab(val as typeof detailTab)}>
                <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/80">
                    <TabsTrigger value="player" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5">
                        <Play className="size-3.5" />
                        Video Player & Phát trực tiếp
                    </TabsTrigger>
                    <TabsTrigger value="products" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5">
                        <ShoppingBag className="size-3.5" />
                        Sản phẩm gắn kèm ({taggedProducts.length})
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5">
                        <Sparkles className="size-3.5" />
                        Thống kê tương tác
                    </TabsTrigger>
                    <TabsTrigger value="info" className="rounded-xl text-xs font-bold px-4 py-2 gap-1.5">
                        <Info className="size-3.5" />
                        Thông tin bài viết & Siêu dữ liệu
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════════════════════════════════════════════════════
                 * TAB 1: VIDEO PLAYER TRỰC TIẾP
                 * ═══════════════════════════════════════════════════════════ */}
                <TabsContent value="player" className="mt-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Khung Player */}
                        <div className="lg:col-span-7 flex justify-center bg-black rounded-3xl p-4 border border-border shadow-xl">
                            <div className="relative aspect-[9/16] w-full max-w-[340px] rounded-2xl overflow-hidden bg-neutral-950 border border-white/10 shadow-2xl">
                                <HlsVideoPlayer
                                    src={video.videoUrl}
                                    poster={video.thumbnailUrl ?? undefined}
                                    muted={isMuted}
                                    autoPlay={false}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsMuted((prev) => !prev)}
                                    className="absolute bottom-3 right-3 size-8 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                                    title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                                >
                                    {isMuted ? (
                                        <VolumeX className="size-4 text-red-400" />
                                    ) : (
                                        <Volume2 className="size-4 text-emerald-400" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Thông số Stream & Quick Product Box */}
                        <div className="lg:col-span-5 space-y-4">
                            <Card className="p-5 rounded-3xl border-border bg-card space-y-4 shadow-xs">
                                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <Film className="size-4 text-emerald-500" />
                                    Thông số kỹ thuật Video & Luồng phát
                                </h3>

                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                        <span className="text-muted-foreground">Định dạng phát:</span>
                                        <Badge
                                            variant="secondary"
                                            className="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        >
                                            {video.videoUrl.endsWith('.m3u8')
                                                ? 'HLS Adaptive (.m3u8)'
                                                : 'MP4 Direct Stream'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                        <span className="text-muted-foreground">Thời lượng:</span>
                                        <span className="font-mono font-bold text-foreground">
                                            {video.videoDuration || 'Tự động thích ứng'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                        <span className="text-muted-foreground">Chất lượng hỗ trợ:</span>
                                        <span className="font-semibold text-foreground">1080p, 720p, 480p, 360p</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Đường dẫn nguồn:</span>
                                        <a
                                            href={video.videoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 truncate max-w-[200px] hover:underline"
                                        >
                                            {video.videoUrl}
                                        </a>
                                    </div>
                                </div>
                            </Card>

                            {/* Card ảnh bìa */}
                            {video.thumbnailUrl && (
                                <Card className="p-5 rounded-3xl border-border bg-card space-y-3 shadow-xs">
                                    <h3 className="font-bold text-sm text-foreground">
                                        Ảnh bìa Thumbnail (Khung hình 0.0001s)
                                    </h3>
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-sm">
                                        <Image
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 30vw"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════
                 * TAB 2: SẢN PHẨM GẮN KÈM (SHOPPABLE PRODUCTS)
                 * ═══════════════════════════════════════════════════════════ */}
                <TabsContent value="products" className="mt-5">
                    <Card className="rounded-3xl border-border/80 bg-card overflow-hidden shadow-xs">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[80px] text-xs font-bold text-foreground">Ảnh</TableHead>
                                    <TableHead className="text-xs font-bold text-foreground">Tên sản phẩm</TableHead>
                                    <TableHead className="text-xs font-bold text-foreground">Giá bán</TableHead>
                                    <TableHead className="text-xs font-bold text-foreground">Giá gốc</TableHead>
                                    <TableHead className="text-xs font-bold text-foreground text-center">
                                        Kho hàng
                                    </TableHead>
                                    <TableHead className="text-xs font-bold text-foreground text-right">
                                        Thao tác
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {taggedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-40 text-center text-muted-foreground text-xs"
                                        >
                                            Video này chưa được gắn sản phẩm nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    taggedProducts.map((tag) => {
                                        const prod = tag.product
                                        return (
                                            <TableRow key={tag.id} className="border-border/60 hover:bg-muted/30">
                                                <TableCell>
                                                    <div className="relative size-12 rounded-xl overflow-hidden bg-muted border border-border">
                                                        {prod.thumbnailUrl ? (
                                                            <Image
                                                                src={prod.thumbnailUrl}
                                                                alt={prod.name}
                                                                fill
                                                                sizes="48px"
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <ShoppingBag className="size-5 m-3.5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-bold text-xs text-foreground line-clamp-1">
                                                        {prod.name}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        ID: {prod.id}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                                    {prod.price.toLocaleString('vi-VN')} đ
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono line-through">
                                                    {prod.originalPrice
                                                        ? `${prod.originalPrice.toLocaleString('vi-VN')} đ`
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {prod.inStock ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                                                            Đang bán
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">
                                                            Hết hàng
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-xl text-xs gap-1 font-semibold"
                                                    >
                                                        <Link
                                                            href={ROUTE.PRODUCT_DETAIL(prod.slug || prod.id)}
                                                            target="_blank"
                                                        >
                                                            Xem sản phẩm
                                                            <ExternalLink className="size-3" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════
                 * TAB 3: THỐNG KÊ TƯƠNG TÁC
                 * ═══════════════════════════════════════════════════════════ */}
                <TabsContent value="stats" className="mt-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <Card className="p-6 rounded-3xl border-border bg-card space-y-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    Lượt xem tích lũy
                                </span>
                                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <Eye className="size-4" />
                                </div>
                            </div>
                            <p className="text-3xl font-extrabold text-foreground font-mono">
                                {video.viewCount.toLocaleString('vi-VN')}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Ghi nhận từ người dùng xem video trên trang chủ và trang toàn màn hình.
                            </p>
                        </Card>

                        <Card className="p-6 rounded-3xl border-border bg-card space-y-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    Lượt thích (Tim)
                                </span>
                                <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                                    <Heart className="size-4" />
                                </div>
                            </div>
                            <p className="text-3xl font-extrabold text-foreground font-mono">
                                {video.likeCount.toLocaleString('vi-VN')}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Tỷ lệ tương tác:{' '}
                                {video.viewCount > 0 ? ((video.likeCount / video.viewCount) * 100).toFixed(1) : 0}%
                            </p>
                        </Card>

                        <Card className="p-6 rounded-3xl border-border bg-card space-y-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    Bình luận & Phản hồi
                                </span>
                                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                                    <MessageCircle className="size-4" />
                                </div>
                            </div>
                            <p className="text-3xl font-extrabold text-foreground font-mono">{video.commentCount}</p>
                            <p className="text-[11px] text-muted-foreground">
                                Phản hồi từ khách hàng quan tâm đến sản phẩm trong video.
                            </p>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══════════════════════════════════════════════════════════
                 * TAB 4: THÔNG TIN BÀI VIẾT & METADATA
                 * ═══════════════════════════════════════════════════════════ */}
                <TabsContent value="info" className="mt-5">
                    <Card className="p-6 rounded-3xl border-border bg-card space-y-4 shadow-xs">
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground">Tiêu đề bài viết</h3>
                            <p className="font-bold text-base text-foreground">{video.title}</p>
                        </div>

                        {video.content && (
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground">Mô tả / Caption</h3>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                    {video.content}
                                </p>
                            </div>
                        )}

                        {video.hashtags && video.hashtags.length > 0 && (
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground">Hashtags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {video.hashtags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                        >
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-xs">
                            <div>
                                <span className="text-muted-foreground">Thời gian tạo: </span>
                                <span className="font-mono font-medium text-foreground">
                                    {new Date(video.createdAt).toLocaleString('vi-VN')}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Cập nhật lần cuối: </span>
                                <span className="font-mono font-medium text-foreground">
                                    {video.updatedAt ? new Date(video.updatedAt).toLocaleString('vi-VN') : '-'}
                                </span>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
