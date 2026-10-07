import { Loader2Icon } from 'lucide-react'

import { cn } from '@/utils'

type SpinnerProps = React.SVGProps<SVGSVGElement>

// Spinner dùng chung — thay skeleton khi chuyển trang để giảm độ trễ首次 hiển thị (1 SVG thay vì nhiều div pulse).
export function Spinner({ className, ...props }: SpinnerProps) {
    return <Loader2Icon className={cn('animate-spin', className)} aria-hidden {...props} />
}
