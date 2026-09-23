'use client'

import { useTranslations } from 'next-intl'
import { BellIcon } from 'lucide-react'

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui'

// Chưa có service thông báo — menu mới chỉ có trạng thái rỗng. Nối dữ liệu thật khi domain notification có API.
export function NotificationMenu() {
    const t = useTranslations('nav')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('notifications')}>
                    <BellIcon aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-sm text-muted-foreground">
                    <BellIcon aria-hidden className="size-6" />
                    {t('noNotifications')}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
