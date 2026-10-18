'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui'
import { ROUTE } from '@/constants'

interface FullscreenHeaderProps {
    isMuted: boolean
    onToggleMute: () => void
    onBack?: () => void
}

export function FullscreenHeader({ isMuted, onToggleMute, onBack }: FullscreenHeaderProps) {
    // ===== Hooks =====
    const router = useRouter()
    const t = useTranslations('content')

    // ===== Handlers =====
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

    return (
        <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none">
            <div className="pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="size-10 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 hover:scale-105 transition-transform"
                    title={t('backAria')}
                >
                    <ArrowLeft className="size-5" />
                </Button>
            </div>

            <div className="pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleMute}
                    className="size-10 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all"
                    title={isMuted ? t('unmute') : t('mute')}
                >
                    {isMuted ? (
                        <VolumeX className="size-5 text-red-400" />
                    ) : (
                        <Volume2 className="size-5 text-emerald-400" />
                    )}
                </Button>
            </div>
        </header>
    )
}
