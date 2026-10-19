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
} from '@/components/ui'
import { cn } from '@/utils'

export interface QualityLevel {
    index: number
    height: number
    bitrate: number
    label: string
}

export interface HlsQualityMenuProps {
    qualities: QualityLevel[]
    selectedQuality: number
    onSelectQuality: (qualityIndex: number) => void
}

export function HlsQualityMenu({ qualities, selectedQuality, onSelectQuality }: HlsQualityMenuProps) {
    const t = useTranslations('content.player')

    if (qualities.length === 0) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-white hover:text-white hover:bg-white/20 rounded-full"
                    title={t('qualityTitle')}
                >
                    <Settings className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48 bg-neutral-900/95 backdrop-blur-md text-white border-neutral-800"
            >
                <DropdownMenuLabel className="text-xs text-neutral-400">{t('qualityTitle')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-800" />

                {/* Tự động Adaptive */}
                <DropdownMenuItem
                    onClick={() => onSelectQuality(-1)}
                    className={cn(
                        'flex items-center justify-between text-xs cursor-pointer focus:bg-white/10 focus:text-white',
                        selectedQuality === -1 && 'font-bold text-primary',
                    )}
                >
                    <span>{t('autoQuality')}</span>
                    {selectedQuality === -1 && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>

                {/* Danh sách các mức phân giải HLS */}
                {qualities.map((q) => (
                    <DropdownMenuItem
                        key={q.index}
                        onClick={() => onSelectQuality(q.index)}
                        className={cn(
                            'flex items-center justify-between text-xs cursor-pointer focus:bg-white/10 focus:text-white',
                            selectedQuality === q.index && 'font-bold text-primary',
                        )}
                    >
                        <span>{q.label}</span>
                        {selectedQuality === q.index && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
