'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Building2, CheckCircle2, Clock, Image as ImageIcon, MapPin, RotateCcw, Save, Settings } from 'lucide-react'
import { toast } from 'sonner'

import type { SellerProfileDetail, UpdateSellerProfileInput } from '@timmyhub/contracts'
import { UpdateSellerProfileSchema } from '@timmyhub/contracts'

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FloatInput,
    FloatTextarea,
} from '@/components'
import { QUERY_KEY } from '@/constants'

import { getMyShopAction, updateMyShopAction } from '../actions'

interface SellerSettingsViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerSettingsView({ initialShop }: SellerSettingsViewProps = {}) {
    const t = useTranslations('seller.portal')
    const queryClient = useQueryClient()

    // ===== Query =====
    const { data: shop = initialShop } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        initialData: initialShop,
    })

    // ===== Mutation =====
    const updateMutation = useMutation({
        mutationFn: updateMyShopAction,
        onSuccess: (res) => {
            if (res.ok) {
                toast.success(t('settingsSuccess'))
                void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.MY_SHOP })
            } else {
                toast.error(t('settingsFailed', { error: res.message || 'Lỗi cập nhật' }))
            }
        },
        onError: () => {
            toast.error('Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại.')
        },
    })

    // ===== Form =====
    const form = useForm<UpdateSellerProfileInput>({
        resolver: zodResolver(UpdateSellerProfileSchema),
        defaultValues: {
            shopName: shop?.shopName || '',
            description: shop?.description || '',
            shopLogo: shop?.shopLogo || '',
            shopBanner: shop?.shopBanner || '',
            warehouseAddressLine: shop?.warehouseAddressLine || '',
            returnPolicyDays: shop?.returnPolicyDays ?? 7,
            prepTimeHours: shop?.prepTimeHours ?? 24,
        },
    })

    // Khi dữ liệu shop thay đổi (load xong từ query), cập nhật lại form values
    useEffect(() => {
        if (shop) {
            form.reset({
                shopName: shop.shopName || '',
                description: shop.description || '',
                shopLogo: shop.shopLogo || '',
                shopBanner: shop.shopBanner || '',
                warehouseAddressLine: shop.warehouseAddressLine || '',
                returnPolicyDays: shop.returnPolicyDays ?? 7,
                prepTimeHours: shop.prepTimeHours ?? 24,
            })
        }
    }, [shop, form])

    const onUpdateProfile = (values: UpdateSellerProfileInput) => {
        updateMutation.mutate(values)
    }

    const watchedLogo = useWatch({ control: form.control, name: 'shopLogo' })
    const watchedBanner = useWatch({ control: form.control, name: 'shopBanner' })
    const watchedShopName = useWatch({ control: form.control, name: 'shopName' })
    const watchedDescription = useWatch({ control: form.control, name: 'description' })

    return (
        <div className="space-y-8 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * HEADER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                        <Settings className="size-7 text-primary" />
                        <span>Cài đặt gian hàng</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Cập nhật nhận diện thương hiệu, địa chỉ kho lấy hàng và cam kết dịch vụ cho người mua.
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * LIVE SHOP PREVIEW CARD
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                {/* Banner background if provided */}
                {watchedBanner && (
                    <div className="absolute inset-0 z-0 opacity-15 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={watchedBanner} alt="Shop Banner" className="size-full object-cover" />
                    </div>
                )}

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Logo */}
                    <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 overflow-hidden">
                        {watchedLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={watchedLogo}
                                alt="Shop Logo"
                                className="size-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        ) : (
                            (watchedShopName || 'S').charAt(0).toUpperCase()
                        )}
                        <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 text-white rounded-tl-lg shadow">
                            <CheckCircle2 className="size-3.5" />
                        </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                                {watchedShopName || 'Tên gian hàng chưa đặt'}
                            </h2>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                                Xem trước nhận diện Shop
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {watchedDescription || 'Chưa có lời giới thiệu gian hàng.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * SETTINGS FORM
             * ═══════════════════════════════════════════════════════════════════ */}
            <form onSubmit={form.handleSubmit(onUpdateProfile)} className="space-y-6">
                {/* 1. Basic Info */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/60">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <Building2 className="size-4 text-primary" />
                            <span>Thông tin cơ bản</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Tên hiển thị và giới thiệu ngắn về gian hàng của bạn trên sàn TimmyHub.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <FloatInput
                            label="Tên cửa hàng *"
                            error={form.formState.errors.shopName?.message}
                            {...form.register('shopName')}
                        />

                        <FloatTextarea
                            label="Mô tả gian hàng"
                            rows={3}
                            error={form.formState.errors.description?.message}
                            {...form.register('description')}
                        />
                    </CardContent>
                </Card>

                {/* 2. Branding Images */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/60">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <ImageIcon className="size-4 text-primary" />
                            <span>Hình ảnh nhận diện</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Đường dẫn URL trực tiếp hình ảnh Logo và Banner đại diện gian hàng.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FloatInput
                                label="URL Logo cửa hàng (khuyên dùng tỉ lệ 1:1)"
                                error={form.formState.errors.shopLogo?.message}
                                {...form.register('shopLogo')}
                            />

                            <FloatInput
                                label="URL Ảnh bìa gian hàng (khuyên dùng tỉ lệ 16:9)"
                                error={form.formState.errors.shopBanner?.message}
                                {...form.register('shopBanner')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Logistics & Warehouse */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/60">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <MapPin className="size-4 text-primary" />
                            <span>Địa chỉ kho &amp; Vận hành</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Địa điểm shipper đến lấy hàng và các cam kết về thời gian chuẩn bị hàng hóa.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <FloatInput
                            label="Địa chỉ kho hàng lấy hàng (Đầy đủ số nhà, đường, phường, quận/huyện, tỉnh/thành)"
                            error={form.formState.errors.warehouseAddressLine?.message}
                            {...form.register('warehouseAddressLine')}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <FloatInput
                                    type="number"
                                    label="Chính sách đổi trả (ngày)"
                                    error={form.formState.errors.returnPolicyDays?.message}
                                    {...form.register('returnPolicyDays', { valueAsNumber: true })}
                                />
                                <p className="text-[11px] text-muted-foreground pl-1 flex items-center gap-1">
                                    <RotateCcw className="size-3 text-muted-foreground" />
                                    <span>Thời gian cho phép người mua yêu cầu đổi trả sau khi nhận hàng.</span>
                                </p>
                            </div>

                            <div className="space-y-1">
                                <FloatInput
                                    type="number"
                                    label="Thời gian chuẩn bị hàng (giờ)"
                                    error={form.formState.errors.prepTimeHours?.message}
                                    {...form.register('prepTimeHours', { valueAsNumber: true })}
                                />
                                <p className="text-[11px] text-muted-foreground pl-1 flex items-center gap-1">
                                    <Clock className="size-3 text-muted-foreground" />
                                    <span>Thời gian dự kiến kể từ khi đơn phát sinh tới khi đóng gói xong.</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action submit */}
                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={updateMutation.isPending}
                        className="rounded-xl px-8 font-bold gap-2 shadow-lg bg-primary text-white hover:bg-primary/90"
                    >
                        <Save className="size-4" />
                        <span>{updateMutation.isPending ? t('savingBtn') : t('saveSettingsBtn')}</span>
                    </Button>
                </div>
            </form>
        </div>
    )
}
