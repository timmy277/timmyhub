import { NavLayout } from '@/components/layout'

// Một khung sidebar + header cho mọi trang trong nhóm — Next giữ layout này qua các lần điều hướng nội bộ (PERF-001).
export default function ProtectedLayout({ children }: LayoutProps<'/'>) {
    return <NavLayout>{children}</NavLayout>
}
