import { useTranslations } from 'next-intl'

import {
    Breadcrumbs,
    LocaleSwitcher,
    NotificationMenu,
    ThemeMenu,
    ThemeModeToggle,
    UserMenu,
} from '@/components/common'
import { Separator, SidebarTrigger } from '@/components/ui'

// Server Component: chỉ xếp chỗ, phần tương tác nằm trong các component client con.
export function Header() {
    const t = useTranslations('nav')

    return (
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" aria-label={t('toggleSidebar')} />
                <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-center" />
                <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1 px-4">
                <LocaleSwitcher />
                <ThemeMenu />
                <ThemeModeToggle />
                <NotificationMenu />
                <UserMenu />
            </div>
        </header>
    )
}
