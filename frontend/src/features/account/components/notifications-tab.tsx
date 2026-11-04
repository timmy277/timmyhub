'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { BellIcon, SaveIcon, ShieldAlertIcon, ShieldCheckIcon, ShoppingBagIcon, StoreIcon, TagIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Label,
    Skeleton,
    Switch,
} from '@/components/ui'
import { DASHBOARD_PERMISSION, SELLER_SHOP_ANY_PERMISSION, SELLER_SHOP_PERMISSION } from '@/constants'
import { useNotificationPreferences, usePermissions, useUpdateNotificationPreferences } from '@/hooks'
import { NotificationPreferencesSchema, type NotificationPreferencesValues } from '@/schemas'

interface NotificationsTabProps {
    mode?: 'all' | 'user' | 'seller' | 'admin'
    showCardWrapper?: boolean
}

export function NotificationsTab({ mode = 'all', showCardWrapper = true }: NotificationsTabProps) {
    const t = useTranslations('account.notifications')
    const { data: session } = useSession()
    const { hasPermission } = usePermissions()
    const { data: preferences, isLoading } = useNotificationPreferences()
    const updateMutation = useUpdateNotificationPreferences()

    const canAccessDashboard = hasPermission(DASHBOARD_PERMISSION)
    const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? []
    const isAdmin = canAccessDashboard || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')
    const isSeller =
        hasPermission(SELLER_SHOP_PERMISSION) || hasPermission(SELLER_SHOP_ANY_PERMISSION) || roles.includes('SELLER')

    const shouldShowSellerSection = mode === 'seller' || (mode === 'all' && isSeller)
    const shouldShowAdminSection = mode === 'admin' || (mode === 'all' && isAdmin)

    const { control, handleSubmit, reset } = useForm<NotificationPreferencesValues>({
        resolver: zodResolver(NotificationPreferencesSchema),
        mode: 'onChange',
        defaultValues: {
            orderInApp: true,
            orderEmail: true,
            promoInApp: true,
            promoEmail: false,
            securityEmail: true,
            chatInApp: true,
            sellerInApp: true,
            systemInApp: true,
        },
    })

    useEffect(() => {
        if (preferences) {
            reset({
                orderInApp: preferences.orderInApp ?? true,
                orderEmail: preferences.orderEmail ?? true,
                promoInApp: preferences.promoInApp ?? true,
                promoEmail: preferences.promoEmail ?? false,
                securityEmail: preferences.securityEmail ?? true,
                chatInApp: preferences.chatInApp ?? true,
                sellerInApp: preferences.sellerInApp ?? true,
                systemInApp: preferences.systemInApp ?? true,
            })
        }
    }, [preferences, reset])

    const onSubmit = (data: NotificationPreferencesValues) => {
        updateMutation.mutate(data, {
            onSuccess: () => {
                toast.success(t('saveSuccess'))
            },
            onError: () => {
                toast.error(t('saveError'))
            },
        })
    }

    if (isLoading) {
        return (
            <Card className="border border-border/80 shadow-xs">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </CardContent>
            </Card>
        )
    }

    const FormBody = (
        <div className="space-y-6">
            {/* Nhóm Quản trị viên (chỉ hiện khi user là Admin hoặc mode admin) */}
            {shouldShowAdminSection && (
                <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 dark:border-destructive/30">
                    <div className="flex items-center justify-between pb-1 border-b border-destructive/20">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="h-4 w-4 text-destructive" />
                            <h4 className="text-sm font-semibold text-foreground">{t('system')}</h4>
                        </div>
                        <Badge
                            variant="outline"
                            className="text-[10px] bg-background text-destructive border-destructive/30 font-semibold"
                        >
                            {t('roleAdminBadge')}
                        </Badge>
                    </div>
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5 pr-4">
                                <Label htmlFor="system-inapp" className="text-xs font-medium cursor-pointer">
                                    {t('inApp')}
                                </Label>
                                <p className="text-[11px] text-muted-foreground">{t('systemDesc')}</p>
                            </div>
                            <Controller
                                name="systemInApp"
                                control={control}
                                render={({ field }) => (
                                    <Switch id="system-inapp" checked={field.value} onCheckedChange={field.onChange} />
                                )}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Nhóm Kênh Người Bán (chỉ hiện khi user là Seller hoặc mode seller) */}
            {shouldShowSellerSection && (
                <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-50/50 p-4 dark:border-blue-500/30 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between pb-1 border-b border-blue-500/20">
                        <div className="flex items-center gap-2">
                            <StoreIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <h4 className="text-sm font-semibold text-foreground">{t('seller')}</h4>
                        </div>
                        <Badge
                            variant="outline"
                            className="text-[10px] bg-background text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold"
                        >
                            {t('roleSellerBadge')}
                        </Badge>
                    </div>
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5 pr-4">
                                <Label htmlFor="seller-inapp" className="text-xs font-medium cursor-pointer">
                                    {t('inApp')}
                                </Label>
                                <p className="text-[11px] text-muted-foreground">{t('sellerDesc')}</p>
                            </div>
                            <Controller
                                name="sellerInApp"
                                control={control}
                                render={({ field }) => (
                                    <Switch id="seller-inapp" checked={field.value} onCheckedChange={field.onChange} />
                                )}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Nhóm 1: Đơn hàng */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <ShoppingBagIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{t('orders')}</h4>
                </div>
                <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="order-inapp" className="text-xs font-medium cursor-pointer">
                                {t('inApp')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('ordersDesc')}</p>
                        </div>
                        <Controller
                            name="orderInApp"
                            control={control}
                            render={({ field }) => (
                                <Switch id="order-inapp" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="order-email" className="text-xs font-medium cursor-pointer">
                                {t('email')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('ordersDesc')}</p>
                        </div>
                        <Controller
                            name="orderEmail"
                            control={control}
                            render={({ field }) => (
                                <Switch id="order-email" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Nhóm 2: Khuyến mãi */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <TagIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{t('promotions')}</h4>
                </div>
                <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="promo-inapp" className="text-xs font-medium cursor-pointer">
                                {t('inApp')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('promotionsDesc')}</p>
                        </div>
                        <Controller
                            name="promoInApp"
                            control={control}
                            render={({ field }) => (
                                <Switch id="promo-inapp" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="promo-email" className="text-xs font-medium cursor-pointer">
                                {t('email')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('promotionsDesc')}</p>
                        </div>
                        <Controller
                            name="promoEmail"
                            control={control}
                            render={({ field }) => (
                                <Switch id="promo-email" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Nhóm 3: Bảo mật & Tin nhắn */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <ShieldAlertIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">{t('security')}</h4>
                </div>
                <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="security-email" className="text-xs font-medium cursor-pointer">
                                {t('email')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('securityDesc')}</p>
                        </div>
                        <Controller
                            name="securityEmail"
                            control={control}
                            render={({ field }) => (
                                <Switch id="security-email" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="chat-inapp" className="text-xs font-medium cursor-pointer">
                                {t('inApp')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">{t('chatDesc')}</p>
                        </div>
                        <Controller
                            name="chatInApp"
                            control={control}
                            render={({ field }) => (
                                <Switch id="chat-inapp" checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    )

    if (!showCardWrapper) {
        return (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {FormBody}
                <div className="flex justify-end pt-3">
                    <Button type="submit" size="sm" disabled={updateMutation.isPending} className="gap-1.5">
                        <SaveIcon className="h-4 w-4" />
                        {t('save')}
                    </Button>
                </div>
            </form>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-border/80 shadow-xs">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{t('title')}</CardTitle>
                    </div>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">{FormBody}</CardContent>

                <CardFooter className="flex justify-end border-t border-border/50 bg-muted/20 px-6 py-4">
                    <Button type="submit" size="sm" disabled={updateMutation.isPending} className="gap-1.5">
                        <SaveIcon className="h-4 w-4" />
                        {t('save')}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
