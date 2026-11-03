import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ChatWorkspaceView } from '@/components'

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('nav')
    return { title: t('adminChat') }
}

export default function AdminChatPage() {
    return <ChatWorkspaceView mode="admin" />
}
