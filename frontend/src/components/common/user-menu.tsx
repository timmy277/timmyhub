'use client'

import { useTranslations } from 'next-intl'
import { BadgeCheckIcon, LogOutIcon } from 'lucide-react'

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui'
import { MOCK_NAV_USER } from '@/constants'
import { getInitials } from '@/utils'

export function UserMenu() {
    const t = useTranslations('nav')
    const user = MOCK_NAV_USER
    const initials = getInitials(user.name)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={t('account')}
                    className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Avatar className="size-8">
                        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8 rounded-lg">
                            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate font-medium">{user.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <BadgeCheckIcon aria-hidden />
                        {t('account')}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LogOutIcon aria-hidden />
                    {t('logOut')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
