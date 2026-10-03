'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UpdateSellerProfileSchema, type UpdateSellerProfileInput, type SellerProfileDetail } from '@timmyhub/contracts'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    Button,
    Input,
    Textarea,
    Label,
    Badge,
    Alert,
    AlertTitle,
    AlertDescription,
} from '@/components'
import {
    Store,
    MapPin,
    ExternalLink,
    CheckCircle2,
    Save,
    RefreshCw,
    ShieldAlert,
    ArrowRight,
    Clock,
    RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { getMyShopAction, updateMyShopAction } from '../actions'
import { QUERY_KEY, ROUTE } from '@/constants'

interface SellerPortalViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerPortalView({ initialShop }: SellerPortalViewProps = {}) {
    const queryClient = useQueryClient()
    const [submitting, setSubmitting] = useState(false)

    const { data: shop, isLoading } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            if (!res.ok || !res.data) return null
            return res.data
        },
        initialData: initialShop ?? undefined,
        staleTime: 60_000,
    })

    const form = useForm<UpdateSellerProfileInput>({
        resolver: zodResolver(UpdateSellerProfileSchema),
        values: shop
            ? {
                  shopName: shop.shopName,
                  description: shop.description || '',
                  shopLogo: shop.shopLogo || '',
                  shopBanner: shop.shopBanner || '',
                  warehouseAddressLine: shop.warehouseAddressLine || '',
                  returnPolicyDays: shop.returnPolicyDays,
                  prepTimeHours: shop.prepTimeHours,
              }
            : {
                  shopName: '',
                  description: '',
                  shopLogo: '',
                  shopBanner: '',
                  warehouseAddressLine: '',
                  returnPolicyDays: 7,
                  prepTimeHours: 24,
              },
    })

    const onSubmit = async (values: UpdateSellerProfileInput) => {
        setSubmitting(true)
        try {
            const res = await updateMyShopAction({
                shopName: values.shopName || undefined,
                description: values.description || undefined,
                shopLogo: values.shopLogo || undefined,
                shopBanner: values.shopBanner || undefined,
                warehouseAddressLine: values.warehouseAddressLine || undefined,
                returnPolicyDays: values.returnPolicyDays,
                prepTimeHours: values.prepTimeHours,
            })

            if (res.ok) {
                toast.success('Cập nhật hồ sơ cửa hàng thành công!')
                queryClient.setQueryData(QUERY_KEY.SELLER.MY_SHOP, res.data)
            } else {
                toast.error(res.message || 'Cập nhật hồ sơ thất bại.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (isLoading && !shop) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải thông tin cửa hàng...</p>
            </div>
        )
    }

    if (!shop) {
        return (
            <div className="mx-auto max-w-2xl py-12 px-4">
                <Card className="text-center p-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40">
                        <Store className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-xl">Bạn chưa mở cửa hàng trên TimmyHub</CardTitle>
                    <CardDescription className="mt-2 text-sm text-muted-foreground">
                        Để bán hàng trên TimmyHub, bạn cần hoàn tất hồ sơ đăng ký đối tác người bán và được phê duyệt
                        bởi đội ngũ quản trị.
                    </CardDescription>
                    <div className="mt-6 flex justify-center gap-3">
                        <Button asChild>
                            <Link href={ROUTE.SELLER_REGISTER} className="gap-2">
                                Đăng ký trở thành Người Bán
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            {/* Banner & Header Card */}
            <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <div
                    className="relative h-44 w-full bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-cover bg-center"
                    style={shop.shopBanner ? { backgroundImage: `url(${shop.shopBanner})` } : undefined}
                >
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="relative px-6 pb-6 pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                        <div className="flex items-end gap-4">
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-md">
                                {shop.shopLogo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={shop.shopLogo}
                                        alt={shop.shopName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                                        <Store className="h-10 w-10" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight">{shop.shopName}</h1>
                                    <Badge variant={shop.isSuspended ? 'destructive' : 'default'}>
                                        {shop.isSuspended ? 'Tạm dừng hoạt động' : 'Đang hoạt động'}
                                    </Badge>
                                    {shop.isVerified && (
                                        <Badge
                                            variant="secondary"
                                            className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                        >
                                            <CheckCircle2 className="h-3 w-3" />
                                            Đã xác minh
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span>Đường dẫn shop:</span>
                                    <span className="font-mono text-foreground font-medium">
                                        timmyhub.dev/shop/{shop.shopSlug}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href={`/shop/${shop.shopSlug}`} target="_blank" rel="noreferrer" className="gap-1.5">
                                    <ExternalLink className="h-4 w-4" />
                                    Xem trang Shop
                                </a>
                            </Button>
                        </div>
                    </div>

                    {shop.isSuspended && (
                        <Alert variant="destructive" className="mt-4">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Cửa hàng đang bị tạm ngưng hoạt động</AlertTitle>
                            <AlertDescription>
                                {shop.suspendedReason
                                    ? `Lý do: ${shop.suspendedReason}`
                                    : 'Tài khoản người bán của bạn đang bị tạm khóa. Vui lòng liên hệ ban quản trị TimmyHub để biết thêm chi tiết.'}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

            {/* Form Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Cập nhật hồ sơ cửa hàng</CardTitle>
                            <CardDescription>
                                Điều chỉnh thông tin hiển thị với khách hàng và thông tin vận hành kho bãi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shopName">Tên cửa hàng</Label>
                                    <Input
                                        id="shopName"
                                        placeholder="Tên shop đại diện..."
                                        {...form.register('shopName')}
                                    />
                                    {form.formState.errors.shopName && (
                                        <p className="text-xs text-destructive">
                                            {form.formState.errors.shopName.message}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-muted-foreground">
                                        Thay đổi tên shop sẽ tự động cập nhật URL slug nếu tên mới hợp lệ.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="description">Mô tả giới thiệu cửa hàng</Label>
                                    <Textarea
                                        id="description"
                                        rows={3}
                                        placeholder="Mô tả ngành hàng, điểm nổi bật..."
                                        {...form.register('description')}
                                    />
                                    {form.formState.errors.description && (
                                        <p className="text-xs text-destructive">
                                            {form.formState.errors.description.message}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="shopLogo">URL Logo Shop</Label>
                                        <Input
                                            id="shopLogo"
                                            placeholder="https://example.com/logo.png"
                                            {...form.register('shopLogo')}
                                        />
                                        {form.formState.errors.shopLogo && (
                                            <p className="text-xs text-destructive">
                                                {form.formState.errors.shopLogo.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="shopBanner">URL Banner Shop</Label>
                                        <Input
                                            id="shopBanner"
                                            placeholder="https://example.com/banner.png"
                                            {...form.register('shopBanner')}
                                        />
                                        {form.formState.errors.shopBanner && (
                                            <p className="text-xs text-destructive">
                                                {form.formState.errors.shopBanner.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="warehouseAddressLine">Địa chỉ kho hàng (Lấy hàng)</Label>
                                    <Input
                                        id="warehouseAddressLine"
                                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                                        {...form.register('warehouseAddressLine')}
                                    />
                                    {form.formState.errors.warehouseAddressLine && (
                                        <p className="text-xs text-destructive">
                                            {form.formState.errors.warehouseAddressLine.message}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="returnPolicyDays">Thời hạn đổi trả (ngày)</Label>
                                        <Input
                                            id="returnPolicyDays"
                                            type="number"
                                            min={1}
                                            max={30}
                                            placeholder="7"
                                            {...form.register('returnPolicyDays', { valueAsNumber: true })}
                                        />
                                        {form.formState.errors.returnPolicyDays && (
                                            <p className="text-xs text-destructive">
                                                {form.formState.errors.returnPolicyDays.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="prepTimeHours">Thời gian chuẩn bị hàng (giờ)</Label>
                                        <Input
                                            id="prepTimeHours"
                                            type="number"
                                            min={1}
                                            max={72}
                                            placeholder="24"
                                            {...form.register('prepTimeHours', { valueAsNumber: true })}
                                        />
                                        {form.formState.errors.prepTimeHours && (
                                            <p className="text-xs text-destructive">
                                                {form.formState.errors.prepTimeHours.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" disabled={submitting} className="gap-2">
                                        {submitting ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Lưu thay đổi
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Info Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Chỉ số vận hành</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-muted-foreground">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="h-4 w-4 shrink-0 text-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">Kho hàng hiện tại</p>
                                    <p className="mt-0.5">{shop.warehouseAddressLine || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <Clock className="h-4 w-4 shrink-0 text-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">Thời gian chuẩn bị</p>
                                    <p className="mt-0.5">{shop.prepTimeHours} giờ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <RotateCcw className="h-4 w-4 shrink-0 text-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">Chính sách đổi trả</p>
                                    <p className="mt-0.5">{shop.returnPolicyDays} ngày</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-foreground">Ngày gia nhập</p>
                                    <p className="mt-0.5">{new Date(shop.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quy định bán hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-muted-foreground">
                            <p>• Cam kết cung cấp hàng hóa chính hãng, đúng chất lượng mô tả.</p>
                            <p>
                                • Chuẩn bị hàng đúng hạn trong vòng {shop.prepTimeHours}h kể từ khi phát sinh đơn đặt.
                            </p>
                            <p>• Tuân thủ chính sách đổi trả và bảo hành theo cam kết nền tảng TimmyHub.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
