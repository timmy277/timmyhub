import Link from 'next/link'
import { SearchXIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button, EmptyState } from '@/components'
import { ROUTE } from '@/constants'

// `notFound()` gọi trong trang protected (vd tài nguyên ngoài phạm vi — luật 8 trả 404) hiện trong NavLayout.
export default function ProtectedNotFound() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div className="flex flex-1 flex-col p-4">
            <EmptyState
                className="flex-1"
                icon={<SearchXIcon />}
                title={t('notFoundTitle')}
                description={t('notFoundDescription')}
                action={
                    <Button asChild variant="outline">
                        <Link href={ROUTE.HOME}>{t('backHome')}</Link>
                    </Button>
                }
            />
        </div>
    )
}
