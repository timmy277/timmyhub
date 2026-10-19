'use client'

import { useEffect, useRef, useState } from 'react'
import type Hls from 'hls.js'
import { useTranslations } from 'next-intl'
import type { QualityLevel } from '../components/hls-quality-menu'

const HLS_REGEX = /\.m3u8($|\?)/i

interface UseHlsSourceOptions {
    src: string
    videoRef: React.RefObject<HTMLVideoElement | null>
    autoPlay: boolean
    isActive: boolean
    selectedQuality: number
}

export function useHlsSource({ src, videoRef, autoPlay, isActive, selectedQuality }: UseHlsSourceOptions) {
    const t = useTranslations('content.player')
    const [qualities, setQualities] = useState<QualityLevel[]>([])
    const [activeQualityLabel, setActiveQualityLabel] = useState<string>('Auto')
    const hlsRef = useRef<Hls | null>(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !src) return

        if (hlsRef.current) {
            hlsRef.current.destroy()
            hlsRef.current = null
        }

        if (HLS_REGEX.test(src)) {
            let isCancelled = false
            void import('hls.js').then(({ default: HlsConstructor }) => {
                if (isCancelled || !videoRef.current) return
                if (HlsConstructor.isSupported()) {
                    const hls = new HlsConstructor({ enableWorker: true, lowLatencyMode: true })
                    hlsRef.current = hls
                    hls.loadSource(src)
                    hls.attachMedia(video)
                    hls.on(HlsConstructor.Events.MANIFEST_PARSED, (_ev, data) => {
                        const lvls = data.levels
                            .map((lvl, idx) => ({
                                index: idx,
                                height: lvl.height,
                                bitrate: lvl.bitrate,
                                label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
                            }))
                            .sort((a, b) => b.height - a.height)
                        setQualities(lvls)
                        if (autoPlay && isActive) {
                            void video.play().catch(() => {})
                        }
                    })
                    hls.on(HlsConstructor.Events.LEVEL_SWITCHED, (_ev, data) => {
                        const lvl = hls.levels[data.level]
                        if (lvl) {
                            setActiveQualityLabel(
                                selectedQuality === -1
                                    ? t('autoQualityBadge', { res: `${lvl.height}p` })
                                    : `${lvl.height}p`,
                            )
                        }
                    })
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = src
                    if (autoPlay && isActive) {
                        void video.play().catch(() => {})
                    }
                }
            })
            return () => {
                isCancelled = true
                hlsRef.current?.destroy()
                hlsRef.current = null
            }
        }

        video.src = src.replace(/#t=[^&]*/, '')
        if (autoPlay && isActive) {
            void video.play().catch(() => {})
        }
    }, [src, autoPlay, isActive, selectedQuality, t, videoRef])

    return {
        hlsRef,
        qualities,
        activeQualityLabel,
        setActiveQualityLabel,
    }
}
