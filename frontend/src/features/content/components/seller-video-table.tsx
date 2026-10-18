'use client'

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { VideoPostDto } from '@timmyhub/contracts'
import {
    ExternalLink,
    Eye,
    Film,
    Heart,
    MessageCircle,
    MoreHorizontal,
    Play,
    Search,
    ShoppingBag,
    Trash2,
} from 'lucide-react'

import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui'
import { ROUTE } from '@/constants'
import { useDebouncedValue } from '@/hooks'

// ═══════════════════════════════════════════════════════════════════════════
// 2. TYPES / INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
export interface SellerVideoTableProps {
    videos: VideoPostDto[]
    isLoading?: boolean
    onSelectDetail: (video: VideoPostDto) => void
    onDeleteVideo: (videoId: string) => void
    isDeleting?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COMPONENT DEFINITION (Rule 20 Lifecycle Structure)
// ═══════════════════════════════════════════════════════════════════════════
export function SellerVideoTable({ videos, onSelectDetail, onDeleteVideo, isDeleting }: SellerVideoTableProps) {
    // 3.1. Filter State
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSearch = useDebouncedValue(searchTerm, 300)
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

    // 3.2. Filtered Rows
    const filteredVideos = useMemo(() => {
        return videos.filter((video) => {
            const matchesSearch =
                !debouncedSearch ||
                video.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (video.content && video.content.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                video.hashtags?.some((tag) => tag.toLowerCase().includes(debouncedSearch.toLowerCase()))

            const matchesStatus = statusFilter === 'ALL' || video.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [videos, debouncedSearch, statusFilter])

    // 3.3. JSX Return
    return (
        <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm video theo tiêu đề, hashtag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs bg-background border-border/80"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <Button
                        variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('ALL')}
                        className="h-8 rounded-xl text-xs px-3 font-semibold"
                    >
                        Tất cả ({videos.length})
                    </Button>
                    <Button
                        variant={statusFilter === 'PUBLISHED' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('PUBLISHED')}
                        className="h-8 rounded-xl text-xs px-3 font-semibold"
                    >
                        Đã xuất bản ({videos.filter((v) => v.status === 'PUBLISHED').length})
                    </Button>
                    <Button
                        variant={statusFilter === 'DRAFT' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setStatusFilter('DRAFT')}
                        className="h-8 rounded-xl text-xs px-3 font-semibold"
                    >
                        Bản nháp ({videos.filter((v) => v.status === 'DRAFT').length})
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="border-border/80 hover:bg-transparent">
                            <TableHead className="w-[120px] text-xs font-bold text-foreground">Video</TableHead>
                            <TableHead className="min-w-[240px] text-xs font-bold text-foreground">
                                Tiêu đề & Nội dung
                            </TableHead>
                            <TableHead className="w-[180px] text-xs font-bold text-foreground">
                                Sản phẩm gắn kèm
                            </TableHead>
                            <TableHead className="w-[140px] text-xs font-bold text-foreground text-center">
                                Tương tác
                            </TableHead>
                            <TableHead className="w-[110px] text-xs font-bold text-foreground text-center">
                                Trạng thái
                            </TableHead>
                            <TableHead className="w-[120px] text-xs font-bold text-foreground">Ngày đăng</TableHead>
                            <TableHead className="w-[80px] text-xs font-bold text-foreground text-right">
                                Thao tác
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filteredVideos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                            <Film className="size-6" />
                                        </div>
                                        <p className="font-bold text-sm text-foreground">
                                            {searchTerm
                                                ? 'Không tìm thấy video nào phù hợp với từ khóa'
                                                : 'Shop chưa có video bán hàng nào trong mục này'}
                                        </p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            {searchTerm
                                                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'
                                                : 'Hãy tạo video đầu tiên để hiển thị sản phẩm và tiếp cận khách hàng trên TimmyHub.'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredVideos.map((video) => {
                                const primaryProduct = video.productTags?.[0]?.product
                                const productCount = video.productTags?.length || 0
                                const formattedDate = new Date(video.createdAt).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                })

                                return (
                                    <TableRow
                                        key={video.id}
                                        className="border-border/60 hover:bg-muted/30 transition-colors cursor-pointer group"
                                        onClick={() => onSelectDetail(video)}
                                    >
                                        {/* Cột 1: Video Thumbnail */}
                                        <TableCell className="py-3">
                                            <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-border/80 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                {video.thumbnailUrl ? (
                                                    <Image
                                                        src={video.thumbnailUrl}
                                                        alt={video.title}
                                                        fill
                                                        sizes="96px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                ) : !video.videoUrl.includes('.m3u8') ? (
                                                    <video
                                                        src={
                                                            video.videoUrl.includes('#t=')
                                                                ? video.videoUrl
                                                                : `${video.videoUrl}#t=0.001`
                                                        }
                                                        preload="metadata"
                                                        muted
                                                        playsInline
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none'
                                                        }}
                                                        className="size-full object-cover"
                                                    />
                                                ) : null}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow-sm">
                                                        <Play className="size-3 fill-black ml-0.5" />
                                                    </div>
                                                </div>
                                                <Badge className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono px-1 py-0 border-0">
                                                    HLS HD
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        {/* Cột 2: Tiêu đề & Caption & Hashtags */}
                                        <TableCell className="py-3">
                                            <div className="space-y-1 max-w-sm">
                                                <p className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {video.title}
                                                </p>
                                                {video.content && (
                                                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                        {video.content}
                                                    </p>
                                                )}
                                                {video.hashtags && video.hashtags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {video.hashtags.slice(0, 3).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {video.hashtags.length > 3 && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                +{video.hashtags.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Cột 3: Sản phẩm gắn kèm */}
                                        <TableCell className="py-3">
                                            {primaryProduct ? (
                                                <div className="flex items-center gap-2 max-w-[170px]">
                                                    <div className="relative size-8 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                                                        {primaryProduct.thumbnailUrl ? (
                                                            <Image
                                                                src={primaryProduct.thumbnailUrl}
                                                                alt={primaryProduct.name}
                                                                fill
                                                                sizes="32px"
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <ShoppingBag className="size-4 m-2 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[11px] font-semibold text-foreground">
                                                            {primaryProduct.name}
                                                        </p>
                                                        <p className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                                            {primaryProduct.price.toLocaleString('vi-VN')} đ
                                                        </p>
                                                        {productCount > 1 && (
                                                            <span className="text-[9px] text-muted-foreground font-medium">
                                                                +{productCount - 1} sản phẩm khác
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">
                                                    Chưa gắn sản phẩm
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Cột 4: Tương tác */}
                                        <TableCell className="py-3 text-center">
                                            <div className="inline-flex items-center gap-3 text-xs font-mono">
                                                <span
                                                    className="flex items-center gap-1 text-muted-foreground"
                                                    title="Lượt xem"
                                                >
                                                    <Eye className="size-3 text-emerald-500" />
                                                    {video.viewCount}
                                                </span>
                                                <span
                                                    className="flex items-center gap-1 text-muted-foreground"
                                                    title="Lượt thích"
                                                >
                                                    <Heart className="size-3 text-red-500" />
                                                    {video.likeCount}
                                                </span>
                                                <span
                                                    className="flex items-center gap-1 text-muted-foreground"
                                                    title="Bình luận"
                                                >
                                                    <MessageCircle className="size-3 text-blue-500" />
                                                    {video.commentCount}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Cột 5: Trạng thái */}
                                        <TableCell className="py-3 text-center">
                                            {video.status === 'PUBLISHED' ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-lg"
                                                >
                                                    Đã xuất bản
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg"
                                                >
                                                    Bản nháp
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Cột 6: Ngày đăng */}
                                        <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                                            {formattedDate}
                                        </TableCell>

                                        {/* Cột 7: Thao tác */}
                                        <TableCell
                                            className="py-3 text-right"
                                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-48 rounded-2xl bg-card border-border p-1.5 shadow-lg"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() => onSelectDetail(video)}
                                                        className="rounded-xl text-xs font-semibold cursor-pointer py-2"
                                                    >
                                                        <Film className="size-3.5 mr-2 text-emerald-500" />
                                                        Xem chi tiết & Player
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        asChild
                                                        className="rounded-xl text-xs font-semibold cursor-pointer py-2"
                                                    >
                                                        <Link href={ROUTE.VIDEO_DETAIL(video.id)} target="_blank">
                                                            <ExternalLink className="size-3.5 mr-2 text-blue-500" />
                                                            Mở trang xem Video
                                                        </Link>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem
                                                        onClick={() => onDeleteVideo(video.id)}
                                                        disabled={isDeleting}
                                                        className="rounded-xl text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer py-2"
                                                    >
                                                        <Trash2 className="size-3.5 mr-2" />
                                                        Xóa video bài đăng
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
