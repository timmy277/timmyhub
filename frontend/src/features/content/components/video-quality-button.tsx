'use client'

import React from 'react'
import { Check, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/utils'
import type { QualityLevel } from './hls-quality-menu'

// ===== 1. Types & Interfaces =====

export interface VideoQualityButtonProps {
    qualities: QualityLevel[]
    selectedQuality: number
    onSelectQuality: (qualityIndex: number) => void
}

// ===== 2. Component =====

export function VideoQualityButton({ qualities, selectedQuality, onSelectQuality }: VideoQualityButtonProps) {
    // ===== 3. Hooks & Translations =====
    const t = useTranslations('content.player')

    // ===== 4. Derived State =====
    const currentLabel =
        selectedQuality === -1 ? 'Auto' : (qualities.find((q) => q.index === selectedQuality)?.label ?? 'HD')

    // ===== 5. Render =====
    return (
        <div className="flex flex-col items-center gap-1 group">
            <Tooltip>
                <DropdownMenu>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                    'size-12 rounded-full backdrop-blur-xl border border-primary/25 shadow-2xl transition-all duration-200',
                                    'bg-black/45 hover:bg-black/65 hover:border-primary/60 hover:scale-110 active:scale-90',
                                )}
                                aria-label={t('qualityTitle')}
                            >
                                <Settings className="size-6 text-primary transition-transform group-hover:rotate-45" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">{t('qualityTitle')}</TooltipContent>
                    <DropdownMenuContent
                        align="end"
                        side="left"
                        className="w-52 bg-neutral-950/95 backdrop-blur-xl text-white border-primary/20 shadow-2xl rounded-2xl p-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenuLabel className="text-xs text-neutral-400 font-semibold px-2 py-1">
                            {t('qualityTitle')}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Lựa chọn Tự động */}
                        <DropdownMenuItem
                            onClick={() => onSelectQuality(-1)}
                            className={cn(
                                'flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2 transition-colors',
                                'focus:bg-primary/20 focus:text-white hover:bg-primary/15',
                                selectedQuality === -1 && 'font-bold text-primary bg-primary/10',
                            )}
                        >
                            <span>{t('autoQuality')}</span>
                            {selectedQuality === -1 && <Check className="size-3.5 text-primary stroke-[3]" />}
                        </DropdownMenuItem>

                        {/* Danh sách các mức phân giải từ luồng HLS */}
                        {qualities.map((q) => (
                            <DropdownMenuItem
                                key={q.index}
                                onClick={() => onSelectQuality(q.index)}
                                className={cn(
                                    'flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 py-2 transition-colors',
                                    'focus:bg-primary/20 focus:text-white hover:bg-primary/15',
                                    selectedQuality === q.index && 'font-bold text-primary bg-primary/10',
                                )}
                            >
                                <span>{q.label}</span>
                                {selectedQuality === q.index && <Check className="size-3.5 text-primary stroke-[3]" />}
                            </DropdownMenuItem>
                        ))}

                        {/* Trường hợp video thường chưa có stream đa luồng */}
                        {qualities.length === 0 && (
                            <DropdownMenuItem
                                disabled
                                className="flex items-center justify-between text-xs text-neutral-400 italic rounded-lg px-2.5 py-2"
                            >
                                <span>{t('originalQuality')}</span>
                                <Check className="size-3.5 text-primary stroke-[3]" />
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </Tooltip>
            <span className="text-[11px] font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                {currentLabel}
            </span>
        </div>
    )
}
