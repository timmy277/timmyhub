'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { ROUTE } from '@/constants'

// ===== 1. Types & Interfaces =====

interface FullscreenHeaderProps {
    onBack?: () => void
}

// ===== 2. Component =====

export function FullscreenHeader({ onBack }: FullscreenHeaderProps) {
    // ===== 3. Hooks & Translations =====
    const router = useRouter()
    const t = useTranslations('content')

    // ===== 4. Handlers =====
    const handleBack = useCallback(() => {
        if (onBack) {
            onBack()
            return
        }
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(ROUTE.HOME)
        }
    }, [onBack, router])

    // ===== 5. Render =====
    return (
        <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none">
            <div className="pointer-events-auto">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleBack}
                            className="size-11 rounded-full bg-black/45 text-white backdrop-blur-xl border border-white/15 shadow-2xl hover:bg-black/65 hover:border-white/30 hover:scale-105 active:scale-95 transition-all"
                            aria-label={t('backAria')}
                        >
                            <ArrowLeft className="size-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{t('back')}</TooltipContent>
                </Tooltip>
            </div>
        </header>
    )
}
