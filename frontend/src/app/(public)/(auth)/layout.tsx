import type { Metadata } from 'next'

import { AuthLayout } from '@/components/layout'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default function AuthRouteLayout({ children }: LayoutProps<'/'>) {
    return <AuthLayout>{children}</AuthLayout>
}
