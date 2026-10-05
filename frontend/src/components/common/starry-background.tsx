'use client'

import { memo } from 'react'
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

    const sizes = ['size-2.5', 'size-3', 'size-3.5', 'size-4', 'size-5', 'size-6']
    const colors = [
        'text-amber-400/60 dark:text-amber-300/70',
        'text-primary/50 dark:text-primary/70',
        'text-emerald-400/50 dark:text-emerald-300/70',
        'text-amber-400/50 dark:text-amber-400/60',
        'text-primary/45 dark:text-primary/65',
        'text-cyan-400/50 dark:text-cyan-300/70',
    ]

    // 75 Gemini 4-point star icons spread across 0–100% of viewport
    const geminiList: BackgroundStar[] = []
    const totalGemini = 75
    for (let i = 0; i < totalGemini; i++) {
        const color = colors[Math.floor(rand() * colors.length)]
        const size = sizes[Math.floor(rand() * sizes.length)]
        const topPct = (i / (totalGemini - 1)) * 97 + rand() * 3 - 1.5

        let leftPct: number
        const side = rand()
        if (side < 0.42) {
            leftPct = rand() * 20 + 1
        } else if (side < 0.84) {
            leftPct = rand() * 21 + 76
        } else {
            leftPct = rand() * 50 + 25
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
            color,
            rot,
            duration,
            delay,
            isExtraNightStar,
        })
    }

    // 140 tiny stardust dots
    const microList: MicroStar[] = []
    const totalMicro = 140
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
 * Sits at -z-10 — purely decorative, never intercepts pointer events.
 */
export const StarryBackground = memo(function StarryBackground() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Dot texture */}
            <div className="absolute inset-0 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

            {/* Top radiant bloom */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[650px] w-full max-w-7xl rounded-full bg-gradient-to-b from-primary/30 via-primary/15 to-transparent blur-[120px]" />

            {/* Left orb */}
            <div className="absolute top-[20%] -left-32 size-[500px] rounded-full bg-primary/20 blur-[140px]" />

            {/* Right orb */}
            <div className="absolute top-[50%] -right-32 size-[550px] rounded-full bg-primary/20 blur-[150px]" />

            {/* Lower aura */}
            <div className="absolute top-[75%] left-1/4 size-[600px] rounded-full bg-primary/15 blur-[160px]" />

            {/* Bottom aura */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[450px] w-full max-w-6xl rounded-full bg-gradient-to-t from-primary/25 to-transparent blur-[130px]" />

            {/* Dark mode nebula */}
            <div className="absolute inset-0 bg-transparent dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.22),transparent)]" />

            {/* Micro-stars (stardust) */}
            {MICRO_STARS.map((s) => (
                <span
                    key={s.id}
                    aria-hidden
                    style={{
                        top: s.top,
                        left: s.left,
                        width: s.size,
                        height: s.size,
                        animationDuration: s.duration,
                        animationDelay: s.delay,
                    }}
                    className="absolute rounded-full bg-foreground/25 dark:bg-white/60 animate-pulse [animation-duration:inherit]"
                />
            ))}

            {/* Gemini Stars — ambient decoration only */}
            {BACKGROUND_STARS.map((star) => (
                <div
                    key={star.id}
                    aria-hidden
                    style={{
                        top: star.top,
                        left: star.left,
                        animationDuration: star.duration,
                        animationDelay: star.delay,
                    }}
                    className={`absolute animate-pulse ${star.color} ${
                        star.isExtraNightStar ? 'opacity-35 dark:opacity-65' : 'opacity-55 dark:opacity-80'
                    }`}
                >
                    <IconPath
                        name="gemini-star"
                        className={star.size}
                        style={{ transform: `rotate(${star.rot}deg)` }}
                    />
                </div>
            ))}
        </div>
    )
})
