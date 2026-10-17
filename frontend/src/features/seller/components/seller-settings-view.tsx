'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import {
    Building2,
    CheckCircle2,
    Clock,
    ExternalLink,
    Image as ImageIcon,
    MapPin,
    RotateCcw,
    Save,
    Settings,
    Trash2,
    Upload,
} from 'lucide-react'
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
    FloatSelect,
    FloatTextarea,
    Input,
    SelectItem,
    Spinner,
} from '@/components'
import {
    getDistrictsByProvinceCode,
    getWardsByDistrictCode,
    PROVINCE_OPTIONS,
    QUERY_KEY,
    ROUTE,
} from '@/constants'
import { useUploadMedia } from '@/hooks'
import { resolveMediaUrl } from '@/utils'

import { getMyShopAction, updateMyShopAction } from '../actions'

interface SellerSettingsViewProps {
    initialShop?: SellerProfileDetail | null
}

export function SellerSettingsView({ initialShop }: SellerSettingsViewProps = {}) {
    const t = useTranslations('seller.portal')
    const queryClient = useQueryClient()
    const logoFileId = useId()
    const bannerFileId = useId()

    // ===== Query =====
    const { data: shop = initialShop } = useQuery({
        queryKey: QUERY_KEY.SELLER.MY_SHOP,
        queryFn: async () => {
            const res = await getMyShopAction()
            return res.ok && res.data ? res.data : null
        },
        initialData: initialShop,
    })

    // ===== Upload Media Integration =====
    const uploadMediaMutation = useUploadMedia()
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const [isUploadingBanner, setIsUploadingBanner] = useState(false)
    const logoInputRef = useRef<HTMLInputElement>(null)
    const bannerInputRef = useRef<HTMLInputElement>(null)

    // ===== Mutation =====
    const updateMutation = useMutation({
        mutationFn: updateMyShopAction,
        onSuccess: (res) => {
            if (res.ok) {
                toast.success(t('settingsSuccess'))
                void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.MY_SHOP })
            } else {
                toast.error(t('settingsFailed', { error: res.message || t('updateError') }))
            }
        },
        onError: () => {
            toast.error(t('settingsError'))
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
            provinceCode: shop?.provinceCode || '',
            districtCode: shop?.districtCode || '',
            wardCode: shop?.wardCode || '',
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
                provinceCode: shop.provinceCode || '',
                districtCode: shop.districtCode || '',
                wardCode: shop.wardCode || '',
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
    const watchedProvince = useWatch({ control: form.control, name: 'provinceCode' })
    const watchedDistrict = useWatch({ control: form.control, name: 'districtCode' })
    const watchedWard = useWatch({ control: form.control, name: 'wardCode' })

    const districtOptions = useMemo(
        () => getDistrictsByProvinceCode(watchedProvince),
        [watchedProvince],
    )
    const wardOptions = useMemo(
        () => getWardsByDistrictCode(watchedProvince, watchedDistrict),
        [watchedProvince, watchedDistrict],
    )

    // Handlers upload ảnh logo
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setIsUploadingLogo(true)
            const uploaded = await uploadMediaMutation.mutateAsync({
                files: [file],
                ownerType: 'SELLER_VERIFICATION',
            })
            const fileUrl = uploaded?.[0]?.originalUrl || uploaded?.[0]?.thumbnailUrl
            if (fileUrl) {
                form.setValue('shopLogo', fileUrl, { shouldValidate: true })
                toast.success(t('uploadLogoSuccess'))
            }
        } catch {
            toast.error(t('uploadLogoFailed'))
        } finally {
            setIsUploadingLogo(false)
            if (logoInputRef.current) logoInputRef.current.value = ''
        }
    }

    // Handlers upload ảnh banner
    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setIsUploadingBanner(true)
            const uploaded = await uploadMediaMutation.mutateAsync({
                files: [file],
                ownerType: 'SELLER_VERIFICATION',
            })
            const fileUrl = uploaded?.[0]?.originalUrl || uploaded?.[0]?.thumbnailUrl
            if (fileUrl) {
                form.setValue('shopBanner', fileUrl, { shouldValidate: true })
                toast.success(t('uploadBannerSuccess'))
            }
        } catch {
            toast.error(t('uploadBannerFailed'))
        } finally {
            setIsUploadingBanner(false)
            if (bannerInputRef.current) bannerInputRef.current.value = ''
        }
    }

    const resolvedLogoUrl = resolveMediaUrl(watchedLogo)
    const resolvedBannerUrl = resolveMediaUrl(watchedBanner)

    return (
        <div className="space-y-8 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * HEADER
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                        <Settings className="size-7 text-primary" />
                        <span>{t('settingsTitle')}</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('settingsDescription')}</p>
                </div>

                {shop && (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-semibold gap-1.5 shadow-sm hover:border-primary/50 self-start sm:self-auto"
                    >
                        <Link
                            href={ROUTE.SHOP_DETAIL(shop.shopSlug || shop.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span>{t('viewPublicShop')}</span>
                            <ExternalLink className="size-3.5" />
                        </Link>
                    </Button>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * LIVE SHOP PREVIEW CARD
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/10 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                {/* Banner background if provided */}
                {resolvedBannerUrl && (
                    <div className="absolute inset-0 z-0 opacity-20 overflow-hidden">
                        <Image
                            src={resolvedBannerUrl}
                            alt={t('shopBannerAlt')}
                            className="size-full object-cover"
                            width={1200}
                            height={800}
                            sizes="100vw"
                            unoptimized
                        />
                    </div>
                )}

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Logo */}
                    <div className="relative size-16 sm:size-20 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 text-white font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0 overflow-hidden">
                        {resolvedLogoUrl ? (
                            <Image
                                src={resolvedLogoUrl}
                                alt={t('shopLogoAlt')}
                                className="size-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                                width={1200}
                                height={800}
                                sizes="100vw"
                                unoptimized
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
                                {watchedShopName || t('previewShopNameEmpty')}
                            </h2>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                                {t('previewBranding')}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {watchedDescription || t('previewDescriptionEmpty')}
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
                            <span>{t('basicInfoTitle')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">{t('basicInfoDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <FloatInput
                            label={t('shopNameLabel')}
                            error={form.formState.errors.shopName?.message}
                            {...form.register('shopName')}
                        />

                        <FloatTextarea
                            label={t('shopDescriptionLabel')}
                            rows={3}
                            error={form.formState.errors.description?.message}
                            {...form.register('description')}
                        />
                    </CardContent>
                </Card>

                {/* 2. Branding Images (Upload & URL) */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/60">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <ImageIcon className="size-4 text-primary" />
                            <span>{t('brandingTitle')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">{t('brandingDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Hidden File Inputs */}
                        <Input
                            id={logoFileId}
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <Input
                            id={bannerFileId}
                            ref={bannerInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleBannerUpload}
                            className="hidden"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Shop Logo Card */}
                            <div className="space-y-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Logo Shop
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">1:1 (min 200x200)</span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative size-20 rounded-2xl bg-muted border border-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                        {resolvedLogoUrl ? (
                                            <Image
                                                src={resolvedLogoUrl}
                                                alt={t('shopLogoAlt')}
                                                className="size-full object-cover"
                                                width={200}
                                                height={200}
                                                sizes="80px"
                                                unoptimized
                                            />
                                        ) : (
                                            <ImageIcon className="size-8 text-muted-foreground/50" />
                                        )}
                                        {isUploadingLogo && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-xs">
                                                <Spinner className="size-5 text-primary" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isUploadingLogo}
                                                onClick={() => logoInputRef.current?.click()}
                                                className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                                            >
                                                {isUploadingLogo ? (
                                                    <Spinner className="size-3.5" />
                                                ) : (
                                                    <Upload className="size-3.5 text-primary" />
                                                )}
                                                <span>{resolvedLogoUrl ? t('changeImage') : t('uploadLogoBtn')}</span>
                                            </Button>
                                            {resolvedLogoUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => form.setValue('shopLogo', '', { shouldValidate: true })}
                                                    className="rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    <span>{t('removeImage')}</span>
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {t('logoHint')}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <FloatInput
                                        label={t('shopLogoLabel')}
                                        error={form.formState.errors.shopLogo?.message}
                                        {...form.register('shopLogo')}
                                    />
                                </div>
                            </div>

                            {/* Shop Banner Card */}
                            <div className="space-y-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Ảnh bìa (Banner)
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">16:9 (1200x400)</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative h-24 w-full rounded-2xl bg-muted border border-border/80 flex items-center justify-center overflow-hidden shadow-sm">
                                        {resolvedBannerUrl ? (
                                            <Image
                                                src={resolvedBannerUrl}
                                                alt={t('shopBannerAlt')}
                                                className="size-full object-cover"
                                                width={600}
                                                height={200}
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                unoptimized
                                            />
                                        ) : (
                                            <ImageIcon className="size-8 text-muted-foreground/50" />
                                        )}
                                        {isUploadingBanner && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-xs">
                                                <Spinner className="size-5 text-primary" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isUploadingBanner}
                                                onClick={() => bannerInputRef.current?.click()}
                                                className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                                            >
                                                {isUploadingBanner ? (
                                                    <Spinner className="size-3.5" />
                                                ) : (
                                                    <Upload className="size-3.5 text-primary" />
                                                )}
                                                <span>{resolvedBannerUrl ? t('changeImage') : t('uploadBannerBtn')}</span>
                                            </Button>
                                            {resolvedBannerUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => form.setValue('shopBanner', '', { shouldValidate: true })}
                                                    className="rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    <span>{t('removeImage')}</span>
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('bannerHint')}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <FloatInput
                                        label={t('shopBannerLabel')}
                                        error={form.formState.errors.shopBanner?.message}
                                        {...form.register('shopBanner')}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Logistics & Warehouse */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/60">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <MapPin className="size-4 text-primary" />
                            <span>{t('logisticsTitle')}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">{t('logisticsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <FloatInput
                            label={t('warehouseAddressLabel')}
                            error={form.formState.errors.warehouseAddressLine?.message}
                            {...form.register('warehouseAddressLine')}
                        />

                        {/* Location Selectors (Province, District, Ward) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <FloatSelect
                                label={t('provinceLabel')}
                                value={watchedProvince || ''}
                                onValueChange={(val) => {
                                    form.setValue('provinceCode', val, { shouldValidate: true })
                                    form.setValue('districtCode', '', { shouldValidate: true })
                                    form.setValue('wardCode', '', { shouldValidate: true })
                                }}
                                placeholder={t('selectProvincePlaceholder')}
                                error={form.formState.errors.provinceCode?.message}
                            >
                                {PROVINCE_OPTIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </FloatSelect>

                            <FloatSelect
                                label={t('districtLabel')}
                                value={watchedDistrict || ''}
                                disabled={!watchedProvince || districtOptions.length === 0}
                                onValueChange={(val) => {
                                    form.setValue('districtCode', val, { shouldValidate: true })
                                    form.setValue('wardCode', '', { shouldValidate: true })
                                }}
                                placeholder={t('selectDistrictPlaceholder')}
                                error={form.formState.errors.districtCode?.message}
                            >
                                {districtOptions.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </FloatSelect>

                            <FloatSelect
                                label={t('wardLabel')}
                                value={watchedWard || ''}
                                disabled={!watchedDistrict || wardOptions.length === 0}
                                onValueChange={(val) => {
                                    form.setValue('wardCode', val, { shouldValidate: true })
                                }}
                                placeholder={t('selectWardPlaceholder')}
                                error={form.formState.errors.wardCode?.message}
                            >
                                {wardOptions.map((w) => (
                                    <SelectItem key={w.value} value={w.value}>
                                        {w.label}
                                    </SelectItem>
                                ))}
                            </FloatSelect>
                        </div>

                        {/* Return Policy & Prep Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                            <div className="space-y-1">
                                <FloatInput
                                    type="number"
                                    label={t('returnPolicyLabel')}
                                    error={form.formState.errors.returnPolicyDays?.message}
                                    {...form.register('returnPolicyDays', { valueAsNumber: true })}
                                />
                                <p className="text-[11px] text-muted-foreground pl-1 flex items-center gap-1">
                                    <RotateCcw className="size-3 text-muted-foreground" />
                                    <span>{t('returnPolicyHelp')}</span>
                                </p>
                            </div>

                            <div className="space-y-1">
                                <FloatInput
                                    type="number"
                                    label={t('prepTimeLabel')}
                                    error={form.formState.errors.prepTimeHours?.message}
                                    {...form.register('prepTimeHours', { valueAsNumber: true })}
                                />
                                <p className="text-[11px] text-muted-foreground pl-1 flex items-center gap-1">
                                    <Clock className="size-3 text-muted-foreground" />
                                    <span>{t('prepTimeHelp')}</span>
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
                        className="rounded-xl px-8 font-bold gap-2 shadow-lg bg-primary text-white hover:bg-primary/90 transition-all hover:scale-[1.01]"
                    >
                        {updateMutation.isPending ? (
                            <Spinner className="size-4" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        <span>{updateMutation.isPending ? t('savingBtn') : t('saveSettingsBtn')}</span>
                    </Button>
                </div>
            </form>
        </div>
    )
}
