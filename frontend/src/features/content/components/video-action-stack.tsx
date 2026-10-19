'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react'
import type { VideoPostDto } from '@timmyhub/contracts'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { cn } from '@/utils'
import type { QualityLevel } from './hls-quality-menu'
import { VideoQualityButton } from './video-quality-button'

// ===== 1. Types & Interfaces =====

interface VideoActionStackProps {
    video: VideoPostDto
    isMuted: boolean
    onToggleMute: () => void
    qualities: QualityLevel[]
    selectedQuality: number
    onSelectQuality: (qualityIndex: number) => void
    onLike: () => void
    onOpenComments: () => void
    onShare: () => void
    onNext: () => void
    onPrev: () => void
    hasPrev: boolean
    hasNext: boolean
    style?: React.CSSProperties
}

interface ActionItemProps {
    label: string
    onClick: () => void
    icon: React.ReactNode
    count?: string | number
    subLabel?: string
    isActive?: boolean
}

// ===== 2. Sub-components =====

function ActionItem({ label, onClick, icon, count, subLabel, isActive }: ActionItemProps) {
    return (
        <div className="flex flex-col items-center gap-1 group">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation()
                            onClick()
                        }}
                        aria-label={label}
                        className={cn(
                            'size-12 rounded-full backdrop-blur-xl border border-primary/25 shadow-2xl transition-all duration-200',
                            'bg-black/45 hover:bg-black/65 hover:border-primary/60 hover:scale-110 active:scale-90',
                            isActive &&
                                'bg-primary/20 border-primary text-primary shadow-[0_0_24px_rgba(16,185,129,0.5)] hover:bg-primary/30',
                        )}
                    >
                        {icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{label}</TooltipContent>
            </Tooltip>
            {count !== undefined && (
                <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-mono tabular-nums">
                    {count}
                </span>
            )}
            {subLabel && (
                <span className="text-[11px] font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                    {subLabel}
                </span>
            )}
        </div>
    )
}

function NavBtn({
    label,
    icon,
    disabled,
    onClick,
}: {
    label: string
    icon: React.ReactNode
    disabled: boolean
    onClick: () => void
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick()
                    }}
                    disabled={disabled}
                    className="size-8 rounded-full text-primary hover:bg-primary/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
                    aria-label={label}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
        </Tooltip>
    )
}

// ===== 3. Main Component =====

export function VideoActionStack({
    video,
    isMuted,
    onToggleMute,
    qualities,
    selectedQuality,
    onSelectQuality,
    onLike,
    onOpenComments,
    onShare,
    onNext,
    onPrev,
    hasPrev,
    hasNext,
    style,
}: VideoActionStackProps) {
    // ===== 4. Hooks & Translations =====
    const t = useTranslations('content')

    // ===== 5. Render =====
    return (
        <aside
            aria-label="Tương tác video"
            className="absolute right-3 sm:right-6 md:right-8 lg:right-12 bottom-16 sm:bottom-24 z-30 flex flex-col items-center gap-3 pointer-events-auto transition-all duration-300"
            // Runtime dynamic style: vị trí docking toạ độ X khi ở màn hình rộng widescreen đo từ video canvas
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 1. Nút Like (Yêu thích) */}
            <ActionItem
                label={t('like')}
                onClick={onLike}
                isActive={video.isLiked}
                count={video.likeCount.toLocaleString('vi-VN')}
                icon={
                    <Heart
                        className={cn(
                            'size-6 text-primary transition-transform duration-200',
                            video.isLiked ? 'fill-primary scale-110 animate-scale-in' : 'group-hover:scale-110',
                        )}
                    />
                }
            />

            {/* 2. Nút Bình luận */}
            <ActionItem
                label={t('comments')}
                onClick={onOpenComments}
                count={video.commentCount.toLocaleString('vi-VN')}
                icon={<MessageCircle className="size-6 text-primary transition-transform group-hover:scale-105" />}
            />

            {/* 3. Nút Chia sẻ */}
            <ActionItem
                label={t('share')}
                onClick={onShare}
                subLabel={t('share')}
                icon={<Share2 className="size-6 text-primary transition-transform group-hover:rotate-12" />}
            />

            {/* 4. Nút Âm thanh (Mute/Unmute) */}
            <ActionItem
                label={isMuted ? t('unmute') : t('mute')}
                onClick={onToggleMute}
                subLabel={isMuted ? t('unmute') : t('mute')}
                icon={
                    isMuted ? (
                        <VolumeX className="size-6 text-primary transition-transform group-hover:scale-105" />
                    ) : (
                        <Volume2 className="size-6 text-primary transition-transform group-hover:scale-105" />
                    )
                }
            />

            {/* 5. Nút Chỉnh chất lượng (Setting Quality) */}
            <VideoQualityButton
                qualities={qualities}
                selectedQuality={selectedQuality}
                onSelectQuality={onSelectQuality}
            />

            {/* 6. Pill lượt xem thời gian thực */}
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
                <div className="flex size-9 items-center justify-center rounded-full bg-black/40 text-primary backdrop-blur-lg border border-primary/20 shadow-md">
                    <Eye className="size-4 text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-white/85 font-mono tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {video.viewCount.toLocaleString('vi-VN')}
                </span>
            </div>

            {/* 7. Capsule điều hướng lên/xuống desktop */}
            <div className="hidden sm:flex flex-col items-center rounded-full bg-black/45 backdrop-blur-xl border border-primary/25 p-1 shadow-2xl mt-0.5 divide-y divide-primary/15">
                <NavBtn
                    label={t('prevVideo')}
                    icon={<ChevronUp className="size-4 text-primary" />}
                    disabled={!hasPrev}
                    onClick={onPrev}
                />
                <NavBtn
                    label={t('nextVideo')}
                    icon={<ChevronDown className="size-4 text-primary" />}
                    disabled={!hasNext}
                    onClick={onNext}
                />
            </div>
        </aside>
    )
}
