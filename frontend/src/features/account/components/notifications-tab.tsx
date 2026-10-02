'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { BellIcon, SaveIcon, ShieldAlertIcon, ShoppingBagIcon, TagIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Label,
    Switch,
} from '@/components/ui'
import { NotificationPreferencesSchema, type NotificationPreferencesValues } from '@/schemas'

export function NotificationsTab() {
    const t = useTranslations('account.notifications')

    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<NotificationPreferencesValues>({
        resolver: zodResolver(NotificationPreferencesSchema),
        defaultValues: {
            orderInApp: true,
            orderEmail: true,
            promoInApp: true,
            promoEmail: false,
            securityEmail: true,
            chatInApp: true,
        },
    })

    const onSubmit = async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
        toast.success(t('saveSuccess'))
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

                <CardContent className="space-y-6">
                    {/* Nhóm 1: Đơn hàng */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                            <ShoppingBagIcon className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">{t('orders')}</h4>
                        </div>
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="order-inapp" className="text-xs font-medium cursor-pointer">
                                        {t('inApp')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('ordersDesc')}</p>
                                </div>
                                <Controller
                                    name="orderInApp"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="order-inapp"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="order-email" className="text-xs font-medium cursor-pointer">
                                        {t('email')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('ordersDesc')}</p>
                                </div>
                                <Controller
                                    name="orderEmail"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="order-email"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
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
                                <div className="space-y-0.5">
                                    <Label htmlFor="promo-inapp" className="text-xs font-medium cursor-pointer">
                                        {t('inApp')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('promotionsDesc')}</p>
                                </div>
                                <Controller
                                    name="promoInApp"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="promo-inapp"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="promo-email" className="text-xs font-medium cursor-pointer">
                                        {t('email')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('promotionsDesc')}</p>
                                </div>
                                <Controller
                                    name="promoEmail"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="promo-email"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
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
                                <div className="space-y-0.5">
                                    <Label htmlFor="security-email" className="text-xs font-medium cursor-pointer">
                                        {t('email')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('securityDesc')}</p>
                                </div>
                                <Controller
                                    name="securityEmail"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="security-email"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="chat-inapp" className="text-xs font-medium cursor-pointer">
                                        {t('inApp')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">{t('chatDesc')}</p>
                                </div>
                                <Controller
                                    name="chatInApp"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="chat-inapp"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end border-t border-border/50 bg-muted/20 px-6 py-4">
                    <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                        <SaveIcon className="h-4 w-4" />
                        {t('save')}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}
