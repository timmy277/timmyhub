'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRightIcon } from 'lucide-react'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    useSidebar,
} from '@/components/ui'
import { NAV_GROUPS, ROUTE } from '@/constants'

function isRouteActive(pathname: string, url: string): boolean {
    return pathname === url || (url !== ROUTE.HOME && pathname.startsWith(`${url}/`))
}

// Cần 'use client': dữ liệu nav mang icon là component (hàm), không truyền được qua ranh giới RSC,
// và trạng thái active phụ thuộc `usePathname`.
export function AppSidebar() {
    const pathname = usePathname()
    const { isMobile, setOpenMobile } = useSidebar()
    const t = useTranslations('nav')

    const closeMobileSidebar = () => {
        if (isMobile) setOpenMobile(false)
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="h-16 justify-center border-b border-sidebar-border/70">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg" tooltip={t('brand')}>
                            <Link href={ROUTE.HOME} onClick={closeMobileSidebar}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                                    T
                                </div>
                                <span className="truncate font-semibold">{t('brand')}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="overflow-x-hidden">
                {NAV_GROUPS.map((group) => (
                    <SidebarGroup key={group.labelKey ?? 'ungrouped'}>
                        {group.labelKey && <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>}
                        <SidebarMenu>
                            {group.items.map((item) => {
                                const label = t(item.titleKey)

                                if (item.items?.length) {
                                    return (
                                        <Collapsible
                                            key={item.titleKey}
                                            asChild
                                            defaultOpen={item.isActive}
                                            className="group/collapsible"
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={label}
                                                        isActive={isRouteActive(pathname, item.url)}
                                                    >
                                                        <item.icon />
                                                        <span>{label}</span>
                                                        <ChevronRightIcon
                                                            aria-hidden
                                                            className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 motion-reduce:transition-none"
                                                        />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        {item.items.map((subItem) => (
                                                            <SidebarMenuSubItem key={subItem.titleKey}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={pathname === subItem.url}
                                                                >
                                                                    <Link
                                                                        href={subItem.url}
                                                                        onClick={closeMobileSidebar}
                                                                    >
                                                                        <span>{t(subItem.titleKey)}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ))}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    )
                                }

                                return (
                                    <SidebarMenuItem key={item.titleKey}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={label}
                                            isActive={isRouteActive(pathname, item.url)}
                                        >
                                            <Link href={item.url} onClick={closeMobileSidebar}>
                                                <item.icon />
                                                <span>{label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarRail aria-label={t('toggleSidebar')} title={t('toggleSidebar')} />
        </Sidebar>
    )
}
