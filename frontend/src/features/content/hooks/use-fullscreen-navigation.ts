'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { VideoPostDto } from '@timmyhub/contracts'
import { ROUTE } from '@/constants'

interface UseFullscreenNavigationOptions {
    videos: VideoPostDto[]
    containerRef: React.RefObject<HTMLDivElement | null>
    recordView: (id: string) => void
}

export function useFullscreenNavigation({ videos, containerRef, recordView }: UseFullscreenNavigationOptions) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)

    const router = useRouter()
    const searchParams = useSearchParams()
    const initialIdFromUrl = searchParams.get('id')

    const recordedVideoIdsRef = useRef<Set<string>>(new Set())
    const scrolledToTargetRef = useRef(false)

    const handleBack = useCallback(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(ROUTE.HOME)
        }
    }, [router])

    const scrollToIndex = useCallback(
        (idx: number) => {
            const container = containerRef.current
            if (!container) return
            const item = container.querySelector(`[data-post-index="${idx}"]`) as HTMLElement
            item?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
        [containerRef],
    )

    // Window resize tracking
    useEffect(() => {
        let rId: number | null = null
        const handleResize = () => {
            if (rId) cancelAnimationFrame(rId)
            rId = requestAnimationFrame(() => {
                setWindowWidth(window.innerWidth)
            })
        }
        window.addEventListener('resize', handleResize, { passive: true })
        return () => {
            if (rId) cancelAnimationFrame(rId)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    // IntersectionObserver để theo dõi video nào đang hiển thị
    useEffect(() => {
        const container = containerRef.current
        if (!container || videos.length === 0) return

        const items = container.querySelectorAll('[data-post-item]')
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = Number((entry.target as HTMLElement).dataset.postIndex)
                        if (!Number.isNaN(idx)) {
                            setActiveIndex(idx)
                        }
                    }
                })
            },
            { root: container, threshold: 0.6 },
        )

        items.forEach((item) => observer.observe(item))
        return () => observer.disconnect()
    }, [containerRef, videos.length])

    // Scroll ban đầu đến video ?id=
    useEffect(() => {
        if (!initialIdFromUrl || scrolledToTargetRef.current || videos.length === 0) return
        const idx = videos.findIndex((v) => v.id === initialIdFromUrl)
        if (idx !== -1) {
            scrolledToTargetRef.current = true
            const container = containerRef.current
            const item = container?.querySelector(`[data-post-index="${idx}"]`) as HTMLElement
            item?.scrollIntoView({ behavior: 'auto', block: 'start' })
        }
    }, [containerRef, initialIdFromUrl, videos])

    // Đồng bộ URL mà không kích hoạt RSC re-fetch
    useEffect(() => {
        const currentVideo = videos[activeIndex]
        if (currentVideo && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('id') !== currentVideo.id) {
                params.set('id', currentVideo.id)
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            }
        }
    }, [activeIndex, videos])

    // Ghi nhận lượt xem video một lần duy nhất cho mỗi video active
    useEffect(() => {
        const currentVideo = videos[activeIndex]
        if (currentVideo && !recordedVideoIdsRef.current.has(currentVideo.id)) {
            recordedVideoIdsRef.current.add(currentVideo.id)
            recordView(currentVideo.id)
        }
    }, [activeIndex, videos, recordView])

    // Lắng nghe Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                scrollToIndex(Math.min(activeIndex + 1, videos.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                scrollToIndex(Math.max(activeIndex - 1, 0))
            } else if (e.key === 'Escape') {
                e.preventDefault()
                handleBack()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeIndex, videos.length, scrollToIndex, handleBack])

    return {
        activeIndex,
        windowWidth,
        handleBack,
        scrollToIndex,
    }
}
