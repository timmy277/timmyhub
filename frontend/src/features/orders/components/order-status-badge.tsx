import React from 'react'
import {
    CheckCircle2Icon,
    ClockIcon,
    PackageCheckIcon,
    TruckIcon,
    XCircleIcon,
    AlertCircleIcon,
    RotateCcwIcon,
    CreditCardIcon,
    CheckIcon,
} from 'lucide-react'
import type { OrderStatusType, PaymentMethodType } from '@timmyhub/contracts'
import { Badge } from '@/components'

interface OrderStatusBadgeProps {
    status: OrderStatusType | string
    className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
    switch (status) {
        case 'PENDING':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <ClockIcon className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    <span>Chờ xác nhận</span>
                </Badge>
            )
        case 'CONFIRMED':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-blue-300/80 bg-blue-50 text-blue-700 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-blue-500" />
                    <span>Đã xác nhận</span>
                </Badge>
            )
        case 'PROCESSING':
        case 'PACKED':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-indigo-300/80 bg-indigo-50 text-indigo-700 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <PackageCheckIcon className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Đang đóng gói</span>
                </Badge>
            )
        case 'SHIPPING':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-cyan-300/80 bg-cyan-50 text-cyan-700 dark:border-cyan-700/60 dark:bg-cyan-950/40 dark:text-cyan-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <TruckIcon className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Đang giao hàng</span>
                </Badge>
            )
        case 'DELIVERED':
        case 'COMPLETED':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Giao thành công</span>
                </Badge>
            )
        case 'CANCELLED':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <XCircleIcon className="h-3.5 w-3.5 text-rose-500" />
                    <span>Đã huỷ</span>
                </Badge>
            )
        case 'RETURN_REQUESTED':
        case 'RETURNED':
        case 'REFUNDED':
            return (
                <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1.5 border-purple-300/80 bg-purple-50 text-purple-700 dark:border-purple-700/60 dark:bg-purple-950/40 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}
                >
                    <RotateCcwIcon className="h-3.5 w-3.5 text-purple-500" />
                    <span>Trả hàng / Hoàn tiền</span>
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className={`font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}>
                    <AlertCircleIcon className="h-3.5 w-3.5" />
                    <span>{status}</span>
                </Badge>
            )
    }
}

interface PaymentStatusBadgeProps {
    status: string
    method: PaymentMethodType | string
    className?: string
}

export function PaymentStatusBadge({ status, method, className }: PaymentStatusBadgeProps) {
    const isCompleted = status === 'COMPLETED'
    const isPending = status === 'PENDING'
    const isFailed = status === 'FAILED'

    if (isCompleted) {
        return (
            <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full ${className || ''}`}
            >
                <CheckIcon className="h-3 w-3 text-emerald-600" />
                <span>Đã thanh toán ({method})</span>
            </Badge>
        )
    }

    if (isPending) {
        return (
            <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full ${className || ''}`}
            >
                <ClockIcon className="h-3 w-3 text-amber-600" />
                <span>Chưa thanh toán ({method})</span>
            </Badge>
        )
    }

    if (isFailed) {
        return (
            <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-medium px-2 py-0.5 rounded-full ${className || ''}`}
            >
                <XCircleIcon className="h-3 w-3 text-rose-600" />
                <span>Thanh toán thất bại ({method})</span>
            </Badge>
        )
    }

    return (
        <Badge
            variant="outline"
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${className || ''}`}
        >
            <CreditCardIcon className="h-3 w-3" />
            <span>
                {status} ({method})
            </span>
        </Badge>
    )
}
