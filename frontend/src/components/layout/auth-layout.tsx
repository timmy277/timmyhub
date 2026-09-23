import type { ReactNode } from 'react'

// Các khối màu trang trí rải trên nền lưới. Màu lấy từ token chart nên đổi theo theme đang chọn.
const BLOCKS = [
    { left: '9%', top: '20%', width: '14%', height: '6%', color: 'var(--chart-1)', opacity: 0.22 },
    { left: '16%', top: '40%', width: '7%', height: '13%', color: 'var(--chart-2)', opacity: 0.2 },
    { left: '79%', top: '27%', width: '12%', height: '19%', color: 'var(--chart-3)', opacity: 0.18 },
    { left: '72%', top: '66%', width: '19%', height: '6%', color: 'var(--chart-1)', opacity: 0.16 },
    { left: '2%', top: '59%', width: '11%', height: '6%', color: 'var(--chart-2)', opacity: 0.14 },
] as const

// Khung của các màn auth (login, sau này là register): nền lưới, khối màu, card đặt giữa.
export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="auth-grid relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0">
                {BLOCKS.map((block) => (
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

            <div className="relative w-full max-w-md">{children}</div>
        </div>
    )
}
