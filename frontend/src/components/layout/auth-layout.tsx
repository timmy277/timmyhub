import type { ReactNode } from 'react'

import { AUTH_BACKGROUND_BLOCKS } from '@/constants'

// Khung của các màn auth (login, sau này là register): nền lưới, khối màu, card đặt giữa.
export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="auth-grid relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0">
                {AUTH_BACKGROUND_BLOCKS.map((block) => (
                    <div
                        key={`${block.left}-${block.top}`}
                        className="absolute rounded-lg"
                        style={{
                            left: block.left,
                            top: block.top,
                            width: block.width,
                            height: block.height,
                            background: block.color,
                            opacity: block.opacity,
                        }}
                    />
                ))}
                <div className="auth-scrim absolute inset-0" />
            </div>

            <div className="relative w-full max-w-150">{children}</div>
        </div>
    )
}
