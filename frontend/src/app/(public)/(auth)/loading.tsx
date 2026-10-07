import { Skeleton } from '@/components/ui'

// Skeleton thay spinner — AuthLayout vẫn giữ nền lưới phía sau, chỉ vùng auth-card hiện skeleton.
export default function AuthLoading() {
    return (
        <div role="status" aria-busy className="auth-card flex w-full flex-col gap-4 rounded-[28px] p-8 sm:p-10">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-32 self-end" />
            <span className="sr-only">Đang tải…</span>
        </div>
    )
}
