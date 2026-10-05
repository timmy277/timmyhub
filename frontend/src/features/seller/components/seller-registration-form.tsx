'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    AlertCircle,
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    Send,
    ShieldCheck,
    Sparkles,
    Store,
    Truck,
    Users,
} from 'lucide-react'
import { toast } from 'sonner'

import type { CreateSellerApplicationInput, SellerApplicationDetail } from '@timmyhub/contracts'
import { CreateSellerApplicationSchema, ResourceStatus } from '@timmyhub/contracts'

import { QUERY_KEY, ROUTE } from '@/constants'
import {
    Alert,
    AlertDescription,
    AlertTitle,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FloatInput,
    FloatTextarea,
} from '@/components'
import { IconPath } from '@/components/icons'

import { getMyApplicationsAction, submitSellerApplicationAction } from '../actions'

interface SellerRegistrationFormProps {
    initialApplications?: SellerApplicationDetail[]
    isAlreadySeller?: boolean
}

export function SellerRegistrationForm({
    initialApplications = [],
    isAlreadySeller = false,
}: SellerRegistrationFormProps) {
    const t = useTranslations('seller.register')
    const router = useRouter()
    const queryClient = useQueryClient()
    const [selectedDocPreset, setSelectedDocPreset] = useState<'cccd' | 'gpkd' | 'custom'>('cccd')

    useEffect(() => {
        if (isAlreadySeller) {
            router.replace(ROUTE.SELLER_PORTAL)
        }
    }, [isAlreadySeller, router])

    // ===== Query =====
    const { data: applications = initialApplications } = useQuery({
        queryKey: QUERY_KEY.SELLER.APPLICATIONS,
        queryFn: async () => {
            const res = await getMyApplicationsAction()
            return res.ok && res.data ? res.data : []
        },
        initialData: initialApplications,
    })

    // ===== Mutation =====
    const submitMutation = useMutation({
        mutationFn: submitSellerApplicationAction,
        onSuccess: (res) => {
            if (res.ok) {
                toast.success(t('pendingTitle'))
                void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.APPLICATIONS })
                form.reset()
            } else {
                toast.error(res.message || 'Không thể gửi đơn đăng ký. Vui lòng kiểm tra lại thông tin.')
            }
        },
        onError: () => {
            toast.error('Đã xảy ra lỗi khi gửi đơn đăng ký. Vui lòng thử lại sau.')
        },
    })

    // ===== Form =====
    const form = useForm<CreateSellerApplicationInput>({
        resolver: zodResolver(CreateSellerApplicationSchema),
        defaultValues: {
            shopName: '',
            shopDescription: '',
            idDocumentUrl: '',
            taxCode: '',
            warehouseAddressLine: '',
        },
    })

    const watchedShopName = form.watch('shopName')
    const watchedDescription = form.watch('shopDescription')
    const watchedIdDocUrl = form.watch('idDocumentUrl')

    // ===== Derived =====
    const pendingApp = applications.find((app) => app.status === ResourceStatus.PENDING)
    const latestApp = applications[0]

    const onSubmit = (values: CreateSellerApplicationInput) => {
        submitMutation.mutate(values)
    }

    // Preset sample demo images for quick testing
    const handleSelectDocPreset = (type: 'cccd' | 'gpkd') => {
        setSelectedDocPreset(type)
        if (type === 'cccd') {
            form.setValue(
                'idDocumentUrl',
                'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
                { shouldValidate: true },
            )
        } else {
            form.setValue(
                'idDocumentUrl',
                'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
                { shouldValidate: true },
            )
        }
    }

    // ===== 1. User is already seller =====
    if (isAlreadySeller) {
        return (
            <div className="max-w-3xl mx-auto py-8">
                <Card className="overflow-hidden border border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/10 shadow-2xl backdrop-blur-xl">
                    <CardHeader className="p-8 sm:p-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="size-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                <CheckCircle2 className="size-8" />
                            </div>
                            <div>
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold mb-1">
                                    {t('verifiedBadge')}
                                </Badge>
                                <CardTitle className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                                    {t('alreadySellerTitle')}
                                </CardTitle>
                            </div>
                        </div>
                        <CardDescription className="text-base text-muted-foreground leading-relaxed">
                            {t('alreadySellerDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10 pt-0">
                        <Button asChild size="lg" className="rounded-xl px-6 gap-2 shadow-lg font-bold">
                            <Link href={ROUTE.SELLER_PORTAL}>
                                <span>{t('goToPortal')}</span>
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-12 pb-16">
            {/* ═══════════════════════════════════════════════════════════════════
             * HERO HEADER & VALUE PROPOSITION
             * ═══════════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-card p-8 sm:p-12 shadow-xl backdrop-blur-xl">
                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3.5 py-1 text-xs font-bold text-primary shadow-sm">
                        <IconPath name="gemini-star" className="size-3.5 text-primary animate-pulse" />
                        <span>{t('badge')}</span>
                    </div>

                    <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
                        {t('heroTitle')}
                    </h1>

                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">{t('heroSubtitle')}</p>
                </div>

                {/* Ambient glowing highlights */}
                <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/20 blur-[100px]" />
                <div className="pointer-events-none absolute bottom-0 right-1/4 size-64 rounded-full bg-amber-400/10 blur-[90px]" />

                {/* 4 Value Pillars */}
                <div className="relative z-10 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-border/60">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-card/60 border border-border/50">
                        <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                            <Sparkles className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">{t('benefit1Title')}</p>
                            <p className="text-[11px] text-muted-foreground">{t('benefit1Desc')}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-card/60 border border-border/50">
                        <div className="size-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                            <Users className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">{t('benefit2Title')}</p>
                            <p className="text-[11px] text-muted-foreground">{t('benefit2Desc')}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-card/60 border border-border/50">
                        <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                            <Truck className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">{t('benefit3Title')}</p>
                            <p className="text-[11px] text-muted-foreground">{t('benefit3Desc')}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-card/60 border border-border/50">
                        <div className="size-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                            <CreditCard className="size-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">{t('benefit4Title')}</p>
                            <p className="text-[11px] text-muted-foreground">{t('benefit4Desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
             * PENDING REVIEW TIMELINE STATUS (If has pending application)
             * ═══════════════════════════════════════════════════════════════════ */}
            {pendingApp && (
                <Card className="overflow-hidden border border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/10 shadow-xl backdrop-blur-xl">
                    <CardHeader className="p-6 sm:p-8 border-b border-border/60">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                    <Clock className="size-6 animate-pulse" />
                                </div>
                                <div>
                                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold mb-1">
                                        {t('statusPending')}
                                    </Badge>
                                    <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                                        {t('pendingTitle')}
                                    </CardTitle>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/60">
                                Nộp ngày: {new Date(pendingApp.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground pt-2">
                            {t('pendingDesc', { shopName: pendingApp.shopName })}
                        </CardDescription>
                    </CardHeader>

                    {/* Timeline steps */}
                    <CardContent className="p-6 sm:p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
                            {/* Step 1 */}
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                                    <CheckCircle2 className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">{t('pendingStepReceived')}</p>
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        Hoàn tất tiếp nhận
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 animate-pulse">
                                    2
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">{t('pendingStepReview')}</p>
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                        Đang thẩm định hồ sơ
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-center gap-3 opacity-60">
                                <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border">
                                    3
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">{t('pendingStepDone')}</p>
                                    <p className="text-[11px] text-muted-foreground">Chờ phê duyệt</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-4">
                            <div>
                                <span className="font-semibold text-foreground">Gian hàng:</span> {pendingApp.shopName}
                                {pendingApp.taxCode && (
                                    <span className="ml-3">
                                        <span className="font-semibold text-foreground">MST:</span> {pendingApp.taxCode}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                Thời gian xét duyệt tiêu chuẩn: <strong>24 – 48 giờ làm việc</strong>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Rejection Alert */}
            {latestApp && latestApp.status === ResourceStatus.REJECTED && !pendingApp && (
                <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/10 p-5 rounded-2xl shadow-md">
                    <AlertCircle className="size-5 text-rose-500 shrink-0" />
                    <div className="ml-2 space-y-1">
                        <AlertTitle className="text-rose-500 font-bold text-base">{t('rejectedTitle')}</AlertTitle>
                        <AlertDescription className="text-sm text-foreground/90">
                            {t('rejectedDesc', { reason: latestApp.reviewNote || 'Chưa cung cấp lý do cụ thể' })}
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * REGISTRATION FORM & LIVE STORE PREVIEW GRID
             * ═══════════════════════════════════════════════════════════════════ */}
            {!pendingApp && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Form Column */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="border border-border/70 shadow-2xl bg-card/85 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <CardHeader className="p-6 sm:p-8 border-b border-border/60 space-y-2 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                    <Store className="size-4" />
                                    <span>
                                        {t('step1')} &bull; {t('step2')} &bull; {t('step3')}
                                    </span>
                                </div>
                                <CardTitle className="text-2xl font-black text-foreground">
                                    {t('formCardTitle')}
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground">
                                    {t('formCardDesc')}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-6 sm:p-8">
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    {/* 1. Shop Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                                1
                                            </span>
                                            <span>{t('step1')}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <FloatInput
                                                label={t('shopNameLabel')}
                                                error={form.formState.errors.shopName?.message}
                                                {...form.register('shopName')}
                                            />
                                            <p className="text-[11px] text-muted-foreground px-1">
                                                {t('shopNameHint')}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <FloatTextarea
                                                label={t('shopDescLabel')}
                                                rows={3}
                                                error={form.formState.errors.shopDescription?.message}
                                                {...form.register('shopDescription')}
                                            />
                                            <p className="text-[11px] text-muted-foreground px-1">
                                                {t('shopDescHint')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Legal & Tax */}
                                    <div className="space-y-4 pt-4 border-t border-border/60">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                                2
                                            </span>
                                            <span>{t('step2')}</span>
                                        </div>

                                        {/* Document Presets for Quick Testing */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-foreground">{t('idDocLabel')}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground text-[10px]">Mẫu thử:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectDocPreset('cccd')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                                            selectedDocPreset === 'cccd'
                                                                ? 'bg-primary text-white'
                                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                    >
                                                        CCCD
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectDocPreset('gpkd')}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                                            selectedDocPreset === 'gpkd'
                                                                ? 'bg-primary text-white'
                                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                    >
                                                        GPKD
                                                    </button>
                                                </div>
                                            </div>

                                            <FloatInput
                                                label="URL Giấy tờ xác thực *"
                                                error={form.formState.errors.idDocumentUrl?.message}
                                                {...form.register('idDocumentUrl')}
                                            />
                                            <p className="text-[11px] text-muted-foreground px-1">{t('idDocHint')}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <FloatInput
                                                label={t('taxCodeLabel')}
                                                error={form.formState.errors.taxCode?.message}
                                                {...form.register('taxCode')}
                                            />
                                            <p className="text-[11px] text-muted-foreground px-1">{t('taxCodeHint')}</p>
                                        </div>
                                    </div>

                                    {/* 3. Warehouse & Fulfillment */}
                                    <div className="space-y-4 pt-4 border-t border-border/60">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                                3
                                            </span>
                                            <span>{t('step3')}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <FloatInput
                                                label={t('warehouseLabel')}
                                                error={form.formState.errors.warehouseAddressLine?.message}
                                                {...form.register('warehouseAddressLine')}
                                            />
                                            <p className="text-[11px] text-muted-foreground px-1">
                                                {t('warehouseHint')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Submit action */}
                                    <div className="pt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <ShieldCheck className="size-4 text-primary" />
                                            <span>Bảo mật dữ liệu 100%</span>
                                        </div>

                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={submitMutation.isPending}
                                            className="rounded-xl px-8 font-bold gap-2 shadow-lg bg-primary text-white hover:bg-primary/90 transition-all hover:scale-[1.02]"
                                        >
                                            <Send className="size-4" />
                                            <span>
                                                {submitMutation.isPending ? t('submittingBtn') : t('submitBtn')}
                                            </span>
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Live Preview Column */}
                    <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                        <Card className="border border-border/70 shadow-2xl bg-card/90 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <CardHeader className="p-6 border-b border-border/60 bg-muted/30 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                        <IconPath name="gemini-star" className="size-3 text-primary animate-pulse" />
                                        {t('livePreviewTitle')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                                        Live
                                    </span>
                                </div>
                                <CardTitle className="text-base font-bold text-foreground">
                                    {t('livePreviewSubtitle')}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-6 space-y-6">
                                {/* Simulated Shop Storefront Header Card */}
                                <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="size-14 rounded-2xl bg-gradient-to-tr from-primary to-primary/70 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                                            {watchedShopName ? watchedShopName.charAt(0).toUpperCase() : 'T'}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="font-bold text-base text-foreground truncate">
                                                    {watchedShopName || 'Tên Gian Hàng Mẫu'}
                                                </h4>
                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                                    <CheckCircle2 className="size-2.5" />
                                                    {t('officialShop')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {watchedDescription ||
                                                    'Chuyên cung cấp các mặt hàng chính hãng chất lượng cao.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Shop Trust Indicators */}
                                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-amber-400 font-bold">★</span>
                                            <span>{t('ratingPreview')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Truck className="size-3 text-emerald-500" />
                                            <span>{t('fastShipping')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Document URL Preview Thumbnail */}
                                {watchedIdDocUrl && (
                                    <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2">
                                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                            <FileText className="size-3.5 text-primary" />
                                            <span>Giấy tờ định danh đã đính kèm:</span>
                                        </p>
                                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/60 bg-muted">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={watchedIdDocUrl}
                                                alt="Preview giấy tờ"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    // fallback if url fails
                                                    e.currentTarget.style.display = 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Help & Support Card */}
                                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                                    <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                        <Building2 className="size-4" />
                                        <span>Cần hỗ trợ đăng ký doanh nghiệp?</span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Đội ngũ chuyên viên tư vấn gian hàng TimmyHub luôn sẵn sàng hỗ trợ bạn qua
                                        hotline <strong>1900 8888</strong> (Nhánh 2).
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
             * APPLICATION HISTORY LIST
             * ═══════════════════════════════════════════════════════════════════ */}
            {applications.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span>{t('historyTitle')}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {applications.map((app) => (
                            <div
                                key={app.id}
                                className="flex flex-col justify-between p-5 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-bold text-base text-foreground">{app.shopName}</div>
                                    <Badge
                                        variant={
                                            app.status === ResourceStatus.APPROVED
                                                ? 'default'
                                                : app.status === ResourceStatus.REJECTED
                                                  ? 'destructive'
                                                  : 'secondary'
                                        }
                                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                    >
                                        {app.status === ResourceStatus.APPROVED
                                            ? t('statusApproved')
                                            : app.status === ResourceStatus.REJECTED
                                              ? t('statusRejected')
                                              : t('statusPending')}
                                    </Badge>
                                </div>

                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>Nộp ngày: {new Date(app.createdAt).toLocaleString('vi-VN')}</p>
                                    {app.taxCode && <p>Mã số thuế: {app.taxCode}</p>}
                                    {app.shopDescription && <p className="truncate">Mô tả: {app.shopDescription}</p>}
                                </div>

                                {app.reviewNote && (
                                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                                        <strong>{t('noteLabel')}</strong> {app.reviewNote}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
