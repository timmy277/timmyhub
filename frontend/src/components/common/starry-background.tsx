'use client'

import { memo, useEffect, useState } from 'react'
import { IconPath } from '@/components/icons'

/* Deterministic PRNG algorithm (Mulberry32) ensuring 100% identical SSR & Client hydration */
function createSeededPRNG(seed: number) {
    let s = seed
    return function rand() {
        let t = (s += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

interface BackgroundStar {
    id: number
    top: string
    left: string
    size: string
    color: string
    glow: string
    rot: number
    duration: string
    delay: string
    isExtraNightStar: boolean
}

interface MicroStar {
    id: number
    top: string
    left: string
    size: string
    duration: string
    delay: string
}

const { BACKGROUND_STARS, MICRO_STARS } = (() => {
    const rand = createSeededPRNG(20261005)

    const sizes = ['size-2.5', 'size-3', 'size-3.5', 'size-4', 'size-5', 'size-5.5']
    const colorPalettes = [
        {
            color: 'text-amber-400/70 dark:text-amber-300/80',
            glow: 'drop-shadow-[0_0_16px_rgba(251,191,36,0.95)]',
        },
        {
            color: 'text-primary/60 dark:text-primary/80',
            glow: 'drop-shadow-[0_0_18px_var(--color-primary)]',
        },
        {
            color: 'text-emerald-400/60 dark:text-emerald-300/80',
            glow: 'drop-shadow-[0_0_16px_rgba(52,211,153,0.95)]',
        },
        {
            color: 'text-amber-400/60 dark:text-amber-400/70',
            glow: 'drop-shadow-[0_0_14px_rgba(251,191,36,0.95)]',
        },
        {
            color: 'text-primary/55 dark:text-primary/75',
            glow: 'drop-shadow-[0_0_18px_var(--color-primary)]',
        },
        {
            color: 'text-cyan-400/60 dark:text-cyan-300/80',
            glow: 'drop-shadow-[0_0_16px_rgba(34,211,238,0.95)]',
        },
    ]

    // 14 Gemini 4-point star icons spread along side margins and ambient spaces
    // (tối ưu hóa DOM nodes và paint cost trên main thread)
    const geminiList: BackgroundStar[] = []
    const totalGemini = 14
    for (let i = 0; i < totalGemini; i++) {
        const pal = colorPalettes[Math.floor(rand() * colorPalettes.length)]
        const size = sizes[Math.floor(rand() * sizes.length)]
        const topPct = (i / (totalGemini - 1)) * 96 + rand() * 3 - 1.5

        let leftPct: number
        if (i % 2 === 0) {
            leftPct = rand() * 14 + 1 // 1% to 15% (left gutter)
        } else {
            leftPct = rand() * 14 + 85 // 85% to 99% (right gutter)
        }

        const rot = Math.round(rand() * 90 - 45)
        const duration = `${(2.0 + rand() * 2.5).toFixed(1)}s`
        const delay = `${(rand() * 2.5).toFixed(1)}s`
        const isExtraNightStar = i % 3 === 0

        geminiList.push({
            id: i + 1,
            top: `${topPct.toFixed(2)}%`,
            left: `${leftPct.toFixed(2)}%`,
            size,
            color: pal.color,
            glow: pal.glow,
            rot,
            duration,
            delay,
            isExtraNightStar,
        })
    }

    // 28 tiny stardust dots (tối ưu DOM + bỏ animation rác)
    const microList: MicroStar[] = []
    const totalMicro = 28
    for (let i = 0; i < totalMicro; i++) {
        const top = `${(rand() * 99).toFixed(1)}%`
        const left = `${(rand() * 98 + 1).toFixed(1)}%`
        const size = `${(rand() * 1.5 + 1.0).toFixed(1)}px`
        const duration = `${(rand() * 3 + 2).toFixed(1)}s`
        const delay = `${(rand() * 3).toFixed(1)}s`
        microList.push({ id: i + 1, top, left, size, duration, delay })
    }

    return { BACKGROUND_STARS: geminiList, MICRO_STARS: microList }
})()

/**
 * Full-viewport fixed starry background.
 * Strictly positioned at -z-10 so it NEVER overlays any content, cards, tables, or buttons
 * on Dashboard or any other page.
 * Uses passive pointer tracking so stars glow, rotate 45°, and scale up smoothly when hovered!
 */
export const StarryBackground = memo(function StarryBackground() {
    const [hoveredStarId, setHoveredStarId] = useState<number | null>(null)

    useEffect(() => {
        let mouseX = 0
        let mouseY = 0
        let rafId: number | null = null

        const checkHover = () => {
            rafId = null
            const vw = window.innerWidth
            const vh = window.innerHeight

            let foundId: number | null = null
            for (const star of BACKGROUND_STARS) {
                const starX = (parseFloat(star.left) / 100) * vw
                const starY = (parseFloat(star.top) / 100) * vh
                const dist = Math.hypot(mouseX - starX, mouseY - starY)
                if (dist < 34) {
                    foundId = star.id
                    break
                }
            }
            setHoveredStarId(foundId)
        }

        const handlePointerMove = (e: PointerEvent) => {
            mouseX = e.clientX
            mouseY = e.clientY
            // Chạy hit-test tối đa 1 lần mỗi frame — tránh 56 vòng lặp Math.hypot mỗi pixel di chuột.
            if (rafId === null) {
                rafId = requestAnimationFrame(checkHover)
            }
        }

        const handlePointerLeave = () => setHoveredStarId(null)

        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        window.addEventListener('pointerleave', handlePointerLeave)
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId)
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerleave', handlePointerLeave)
        }
    }, [])

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Dot texture */}
            <div className="absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

            {/* Top radiant bloom — blur 80px */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[650px] w-full max-w-7xl rounded-full bg-gradient-to-b from-primary/30 via-primary/15 to-transparent blur-[80px]" />

            {/* Left orb — chỉ hiển thị trên sm trở lên để tránh nghẽn GPU mobile */}
            <div className="hidden sm:block absolute top-[20%] -left-32 size-[500px] rounded-full bg-primary/20 blur-[80px]" />

            {/* Right orb — chỉ hiển thị trên sm trở lên */}
            <div className="hidden sm:block absolute top-[50%] -right-32 size-[550px] rounded-full bg-primary/20 blur-[80px]" />

            {/* Lower aura */}
            <div className="hidden sm:block absolute top-[75%] left-1/4 size-[600px] rounded-full bg-primary/15 blur-[80px]" />

            {/* Bottom aura */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[450px] w-full max-w-6xl rounded-full bg-gradient-to-t from-primary/25 to-transparent blur-[80px]" />

            {/* Dark mode nebula */}
            <div className="absolute inset-0 bg-transparent dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.22),transparent)]" />

            {/* Micro-stars (stardust) - tĩnh nhẹ nhàng, không dùng animate-pulse để bảo toàn FPS */}
            {MICRO_STARS.map((s) => (
                <span
                    key={s.id}
                    aria-hidden
                    style={{
                        top: s.top,
                        left: s.left,
                        width: s.size,
                        height: s.size,
                    }}
                    className="absolute rounded-full bg-foreground/20 dark:bg-white/50"
                />
            ))}

            {/* Gemini Stars Constellation — strictly at -z-10 so it NEVER covers dashboard elements */}
            {BACKGROUND_STARS.map((star) => {
                const isHovered = hoveredStarId === star.id
                return (
                    <div
                        key={star.id}
                        style={{
                            top: star.top,
                            left: star.left,
                            transform: isHovered
                                ? `scale(1.75) rotate(${star.rot + 45}deg)`
                                : `scale(1) rotate(${star.rot}deg)`,
                        }}
                        className={`absolute select-none transition-all duration-300 ease-out ${star.color} ${
                            isHovered
                                ? '!opacity-100'
                                : star.isExtraNightStar
                                  ? 'opacity-40 dark:opacity-70'
                                  : 'opacity-60 dark:opacity-85'
                        }`}
                    >
                        <IconPath
                            name="gemini-star"
                            style={{
                                animationDuration: star.duration,
                                animationDelay: star.delay,
                            }}
                            className={`${star.size} transition-all duration-300 animate-pulse ${
                                isHovered ? `${star.glow} [animation-play-state:paused]` : ''
                            }`}
                        />
                    </div>
                )
            })}
        </div>
    )
})
