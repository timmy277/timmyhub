import React from 'react'
import { CheckCircle2Icon, ClockIcon, PackageIcon, TruckIcon, CheckCheckIcon, XCircleIcon } from 'lucide-react'
import type { OrderDetail } from '@timmyhub/contracts'

interface OrderTimelineProps {
    order: OrderDetail
}

interface StepItem {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    isCompleted: boolean
    isCurrent: boolean
}

export function OrderTimeline({ order }: OrderTimelineProps) {
    if (order.status === 'CANCELLED') {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5 dark:border-rose-900/50 dark:bg-rose-950/20">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
                        <XCircleIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-semibold text-rose-800 dark:text-rose-300">Đơn hàng đã bị huỷ</h4>
                        <p className="text-sm text-rose-700/90 dark:text-rose-400/90">
                            Lý do: <span className="font-medium">{order.cancelReason || 'Không có lý do cụ thể'}</span>
                        </p>
                        <p className="text-xs text-rose-600/80 dark:text-rose-400/70">
                            Cập nhật: {new Date(order.updatedAt).toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const statusWeight: Record<string, number> = {
        PENDING: 1,
        CONFIRMED: 2,
        PROCESSING: 3,
        PACKED: 3,
        SHIPPING: 4,
        DELIVERED: 5,
        COMPLETED: 5,
    }

    const currentWeight = statusWeight[order.status] ?? 1

    const steps: StepItem[] = [
        {
            id: 'PENDING',
            title: 'Đặt hàng thành công',
            description: new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
            }),
            icon: ClockIcon,
            isCompleted: currentWeight >= 1,
            isCurrent: currentWeight === 1,
        },
        {
            id: 'CONFIRMED',
            title: 'Người bán xác nhận',
            description: currentWeight >= 2 ? 'Đã xác nhận đơn' : 'Đang chờ xử lý',
            icon: CheckCircle2Icon,
            isCompleted: currentWeight >= 2,
            isCurrent: currentWeight === 2,
        },
        {
            id: 'PROCESSING',
            title: 'Đang đóng gói',
            description: currentWeight >= 3 ? 'Đang chuẩn bị kiện hàng' : 'Chờ chuẩn bị',
            icon: PackageIcon,
            isCompleted: currentWeight >= 3,
            isCurrent: currentWeight === 3,
        },
        {
            id: 'SHIPPING',
            title: 'Đang giao hàng',
            description: currentWeight >= 4 ? 'Đang trên đường giao' : 'Chờ giao hàng',
            icon: TruckIcon,
            isCompleted: currentWeight >= 4,
            isCurrent: currentWeight === 4,
        },
        {
            id: 'DELIVERED',
            title: 'Giao hàng thành công',
            description: currentWeight >= 5 ? 'Đã nhận kiện hàng' : 'Chờ hoàn tất',
            icon: CheckCheckIcon,
            isCompleted: currentWeight >= 5,
            isCurrent: currentWeight === 5,
        },
    ]

    return (
        <div className="w-full py-4 sm:py-6">
            <div className="relative">
                {/* Horizontal Progress Bar for Tablet & Desktop */}
                <div className="hidden sm:grid sm:grid-cols-5 relative gap-2">
                    {/* Connecting Line */}
                    <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-muted -z-0">
                        <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{
                                width: `${Math.min(100, Math.max(0, ((currentWeight - 1) / (steps.length - 1)) * 100))}%`,
                            }}
                        />
                    </div>

                    {steps.map((step) => {
                        const Icon = step.icon
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                                        step.isCurrent
                                            ? 'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 scale-110'
                                            : step.isCompleted
                                              ? 'border-primary bg-primary text-primary-foreground'
                                              : 'border-muted-foreground/30 bg-background text-muted-foreground'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h4
                                    className={`mt-3 text-xs sm:text-sm font-medium ${
                                        step.isCompleted || step.isCurrent ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                                >
                                    {step.title}
                                </h4>
                                <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight line-clamp-1">
                                    {step.description}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {/* Vertical Timeline for Mobile */}
                <div className="sm:hidden space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                    {steps.map((step) => {
                        const Icon = step.icon
                        return (
                            <div key={step.id} className="relative flex items-start gap-3">
                                <div
                                    className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                        step.isCurrent
                                            ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/20'
                                            : step.isCompleted
                                              ? 'border-primary bg-primary text-primary-foreground'
                                              : 'border-muted-foreground/30 bg-background text-muted-foreground'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <p
                                        className={`text-sm font-medium ${
                                            step.isCompleted || step.isCurrent
                                                ? 'text-foreground'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
