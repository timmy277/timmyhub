import Link from 'next/link'
import { SearchXIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, EmptyState } from '@/components'
import { ROUTE } from '@/constants'

// 404 toàn cục cho URL không khớp route nào — nằm ngoài NavLayout nên tự căn giữa màn hình. Không export metadata:
// tài liệu Next chỉ hỗ trợ metadata cho `global-not-found`; Next tự gắn `noindex` cho phản hồi 404.
export default function NotFound() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <main className="flex min-h-svh flex-1 items-center justify-center p-4">
            <EmptyState
                icon={<SearchXIcon />}
                title={t('notFoundTitle')}
                description={t('notFoundDescription')}
                action={
                    <Button asChild>
                        <Link href={ROUTE.HOME}>{t('backHome')}</Link>
                    </Button>
                }
            />
        </main>
    )
}
