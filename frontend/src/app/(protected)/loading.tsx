import { useTranslations } from 'next-intl'

import { Spinner } from '@/components'

// Spinner thay skeleton — NavLayout (layout) giữ nguyên, chỉ vùng nội dung hiện spinner.
export default function ProtectedLoading() {
    // ===== Hooks =====
    const t = useTranslations('common')

    return (
        <div role="status" aria-busy className="flex flex-1 items-center justify-center p-4">
            <span className="sr-only">{t('loading')}</span>
            <Spinner className="size-8" />
        </div>
    )
}
