'use client'

import React, { useMemo } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    CalendarDaysIcon,
    ClockIcon,
    ImageIcon,
    Loader2Icon,
    MegaphoneIcon,
    SaveIcon,
    ShieldCheckIcon,
    SparklesIcon,
} from 'lucide-react'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type {
    CampaignTypeValue,
    CreatePromotionCampaignInput,
    PromotionCampaignDetail,
    PromotionCampaignItem,
    UpdatePromotionCampaignInput,
} from '@timmyhub/contracts'
import {
    CAMPAIGN_TYPE,
    CreatePromotionCampaignInputSchema,
    UpdatePromotionCampaignInputSchema,
} from '@timmyhub/contracts'
import {
    Badge,
    Button,
    FloatDatePicker,
    FloatInput,
    FloatSelect,
    FloatTextarea,
    ON_CARD_LABEL_CLASS,
    SelectItem,
    Switch,
    UploadSection,
} from '@/components'
import { CAMPAIGN_TAB } from '@/constants'
import { formatDisplayDate, parseDisplayDate, parseDisplayDateTime, toFieldErrorMessage } from '@/utils'

import { createCampaignAction, updateCampaignAction } from '../actions'
import { buildCampaignTabsHref } from '../campaign-tab-query'

interface CampaignFormPanelProps {
    initialData?: PromotionCampaignDetail | PromotionCampaignItem | null
    onSuccess?: (saved: PromotionCampaignItem) => void
}

interface CampaignFormValues {
    name: string
    type: CampaignTypeValue
    badgeText: string
    banner: string | null
    startDate: string
    endDate: string
    description: string
    requiresApproval: boolean
    isActive: boolean
}

function safeParseDate(val?: unknown): Date | null {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    if (typeof val !== 'string') return null
    const trimmed = val.trim()
    if (!trimmed) return null
    if (trimmed.includes('/')) {
        const fromDisplay = parseDisplayDateTime(trimmed) ?? parseDisplayDate(trimmed)
        if (fromDisplay) return fromDisplay
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? null : parsed
}

export function CampaignFormPanel({ initialData, onSuccess }: CampaignFormPanelProps) {
    const t = useTranslations('campaigns')
    const tApi = useTranslations('api')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const isEdit = Boolean(initialData)

    const resolver = useMemo(
        () =>
            zodResolver(
                isEdit ? UpdatePromotionCampaignInputSchema : CreatePromotionCampaignInputSchema,
            ) as unknown as Resolver<CampaignFormValues>,
        [isEdit],
    )

    const defaultValues: CampaignFormValues = useMemo(
        () => ({
            name: initialData?.name ?? '',
            type: (initialData?.type as CampaignTypeValue) ?? CAMPAIGN_TYPE.FLASH_SALE,
            badgeText: initialData?.badgeText ?? '',
            banner: initialData?.banner ?? null,
            startDate: initialData?.startDate ?? '',
            endDate: initialData?.endDate ?? '',
            description: initialData?.description ?? '',
            requiresApproval: initialData?.requiresApproval ?? true,
            isActive: initialData?.isActive ?? true,
        }),
        [initialData],
    )

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CampaignFormValues>({
        resolver,
        mode: 'onChange',
        defaultValues,
    })

    const watchedName = useWatch({ control, name: 'name' })
    const watchedType = useWatch({ control, name: 'type' })
    const watchedBadgeText = useWatch({ control, name: 'badgeText' })
    const watchedBanner = useWatch({ control, name: 'banner' })
    const watchedStartDate = useWatch({ control, name: 'startDate' })
    const watchedEndDate = useWatch({ control, name: 'endDate' })
    const watchedIsActive = useWatch({ control, name: 'isActive' })

    const handleCancel = () => {
        router.push(buildCampaignTabsHref(pathname, searchParams, { tab: CAMPAIGN_TAB.LIST }))
    }

    const onSubmit = async (values: CampaignFormValues) => {
        try {
            const startDateObj = safeParseDate(values.startDate)
            const endDateObj = safeParseDate(values.endDate)

            if (!startDateObj || !endDateObj) {
                toast.error(t('errorDatesRequired'))
                return
            }

            if (endDateObj <= startDateObj) {
                toast.error(t('errorStartDateBeforeEndDate'))
                return
            }

            if (isEdit && initialData) {
                const updatePayload: UpdatePromotionCampaignInput = {
                    name: values.name.trim(),
                    type: values.type,
                    description: values.description.trim() || null,
                    banner: values.banner?.trim() || null,
                    badgeText: values.badgeText.trim() || null,
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString(),
                    requiresApproval: values.requiresApproval,
                    isActive: values.isActive,
                }
                const res = await updateCampaignAction(initialData.id, updatePayload)
                if (!res.ok) {
                    toast.error(res.message || t('updateFailed'))
                    return
                }
                toast.success(t('updateSuccess', { name: res.data.name }))
                if (onSuccess) onSuccess(res.data)
                router.refresh()
            } else {
                const createPayload: CreatePromotionCampaignInput = {
                    name: values.name.trim(),
                    type: values.type,
                    ownerType: 'PLATFORM',
                    description: values.description.trim() || null,
                    banner: values.banner?.trim() || null,
                    badgeText: values.badgeText.trim() || null,
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString(),
                    requiresApproval: values.requiresApproval,
                    isActive: values.isActive,
                }
                const res = await createCampaignAction(createPayload)
                if (!res.ok) {
                    toast.error(res.message || t('createFailed'))
                    return
                }
                toast.success(t('createSuccess', { name: res.data.name }))
                if (onSuccess) onSuccess(res.data)
                router.push(buildCampaignTabsHref(pathname, searchParams, { tab: CAMPAIGN_TAB.LIST }))
                router.refresh()
            }
        } catch (err) {
            console.error('Campaign save error:', err)
            toast.error(t('submitError'))
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <MegaphoneIcon className="size-5 text-primary" />
                        <span>{isEdit ? t('formTitleEdit') : t('formTitleCreate')}</span>
                        {isEdit && initialData?.name && (
                            <Badge variant="secondary" className="text-xs font-semibold px-2 truncate max-w-xs">
                                {initialData.name}
                            </Badge>
                        )}
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground">{t('sectionBasicInfoDesc')}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 shadow-xs">
                        {isSubmitting ? (
                            <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                            <SaveIcon className="size-4" />
                        )}
                        <span>{isEdit ? t('btnSave') : t('btnCreate')}</span>
                    </Button>
                </div>
            </header>

            {/* Layout Grid: Main content on Left, Live Preview & Settings on Right */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Main Content Column */}
                <div className="flex min-w-0 flex-col gap-6">
                    {/* Section 1: Thông tin cơ bản */}
                    <FormCard title={t('sectionBasicInfo')} description={t('sectionBasicInfoDesc')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput
                                label={t('formNameLabel')}
                                error={toFieldErrorMessage(errors.name?.message, tApi)}
                                helperText={t('formNameHelp')}
                                reserveErrorSpace
                                maxLength={150}
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('name')}
                            />

                            <Controller
                                control={control}
                                name="type"
                                render={({ field }) => (
                                    <FloatSelect
                                        label={t('formTypeLabel')}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        error={toFieldErrorMessage(errors.type?.message, tApi)}
                                        helperText={t('formTypeHelp')}
                                        disabled={isSubmitting}
                                        labelClassName={ON_CARD_LABEL_CLASS}
                                    >
                                        <SelectItem value={CAMPAIGN_TYPE.FLASH_SALE}>{t('typeFlashSale')}</SelectItem>
                                        <SelectItem value={CAMPAIGN_TYPE.SEASONAL}>{t('typeSeasonal')}</SelectItem>
                                        <SelectItem value={CAMPAIGN_TYPE.CATEGORY_BOOST}>
                                            {t('typeCategoryBoost')}
                                        </SelectItem>
                                    </FloatSelect>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput
                                label={t('formBadgeLabel')}
                                error={toFieldErrorMessage(errors.badgeText?.message, tApi)}
                                helperText={t('formBadgeHelp')}
                                reserveErrorSpace
                                maxLength={30}
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('badgeText')}
                            />
                        </div>

                        <FloatTextarea
                            label={t('formDescriptionLabel')}
                            error={toFieldErrorMessage(errors.description?.message, tApi)}
                            placeholder={t('formDescriptionPlaceholder')}
                            rows={3}
                            disabled={isSubmitting}
                            labelClassName={ON_CARD_LABEL_CLASS}
                            {...register('description')}
                        />
                    </FormCard>

                    {/* Section 2: Banner Kéo thả UploadSection */}
                    <FormCard title={t('sectionBannerAsset')} description={t('sectionBannerAssetDesc')}>
                        <UploadSection
                            variant="dropzone"
                            multiple={false}
                            maxFiles={1}
                            acceptType="image"
                            label={t('formBannerLabel')}
                            helperText={t('formBannerHelp')}
                            error={toFieldErrorMessage(errors.banner?.message, tApi)}
                            value={watchedBanner}
                            onChange={(val) => {
                                const url =
                                    typeof val === 'string'
                                        ? val
                                        : val && typeof val === 'object' && 'originalUrl' in val
                                          ? ((val as { originalUrl?: string }).originalUrl ?? null)
                                          : null
                                setValue('banner', url, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }}
                            ownerType="PROMOTION"
                            disabled={isSubmitting}
                        />
                    </FormCard>

                    {/* Section 3: Thời gian diễn ra bằng FloatDatePicker */}
                    <FormCard title={t('sectionSchedule')} description={t('sectionScheduleDesc')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Controller
                                control={control}
                                name="startDate"
                                render={({ field }) => (
                                    <FloatDatePicker
                                        showTime
                                        label={t('formStartDateLabel')}
                                        value={safeParseDate(field.value)}
                                        onValueChange={(date) => {
                                            field.onChange(date ? date.toISOString() : '')
                                        }}
                                        error={toFieldErrorMessage(errors.startDate?.message, tApi)}
                                        disabled={isSubmitting}
                                        labelClassName={ON_CARD_LABEL_CLASS}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="endDate"
                                render={({ field }) => (
                                    <FloatDatePicker
                                        showTime
                                        label={t('formEndDateLabel')}
                                        value={safeParseDate(field.value)}
                                        onValueChange={(date) => {
                                            field.onChange(date ? date.toISOString() : '')
                                        }}
                                        error={toFieldErrorMessage(errors.endDate?.message, tApi)}
                                        disabled={isSubmitting}
                                        labelClassName={ON_CARD_LABEL_CLASS}
                                    />
                                )}
                            />
                        </div>
                    </FormCard>
                </div>

                {/* Sidebar Column: Live Campaign Card Preview & Settings */}
                <aside className="flex flex-col gap-6">
                    {/* Live Campaign Preview Card */}
                    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <SparklesIcon className="size-3.5 text-primary" />
                                {t('previewTitle')}
                            </span>
                            <Badge variant={watchedIsActive ? 'default' : 'secondary'} className="text-[10px]">
                                {watchedIsActive ? t('statusActive') : t('statusDisabled')}
                            </Badge>
                        </div>

                        {/* Campaign visual card */}
                        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20 shadow-xs transition-all">
                            {/* Banner display */}
                            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-muted flex items-center justify-center">
                                {watchedBanner ? (
                                    <Image
                                        src={watchedBanner}
                                        alt={watchedName || 'Campaign banner'}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60">
                                        <ImageIcon className="size-8" />
                                        <span className="text-[11px] font-medium">Chưa có ảnh banner</span>
                                    </div>
                                )}
                                {watchedBadgeText && (
                                    <span className="absolute top-2 right-2 rounded-md bg-destructive px-2 py-0.5 font-bold text-[10px] text-destructive-foreground shadow-xs uppercase tracking-wide">
                                        {watchedBadgeText}
                                    </span>
                                )}
                            </div>

                            {/* Campaign info block */}
                            <div className="p-3.5 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bold text-sm text-foreground truncate" title={watchedName}>
                                        {watchedName || 'Tên chiến dịch...'}
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                                        {watchedType === CAMPAIGN_TYPE.FLASH_SALE
                                            ? t('typeFlashSale')
                                            : watchedType === CAMPAIGN_TYPE.SEASONAL
                                              ? t('typeSeasonal')
                                              : t('typeCategoryBoost')}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <CalendarDaysIcon className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                        {watchedStartDate && watchedEndDate
                                            ? `${formatDisplayDate(safeParseDate(watchedStartDate))} — ${formatDisplayDate(safeParseDate(watchedEndDate))}`
                                            : 'Chưa cài đặt thời gian'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center">{t('previewHint')}</p>
                    </div>

                    {/* Quick Settings & Approvals Card */}
                    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
                        <div className="border-b border-border/50 pb-3">
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <ClockIcon className="size-4 text-muted-foreground" />
                                {t('quickSettingsTitle')}
                            </h2>
                        </div>

                        <Controller
                            control={control}
                            name="isActive"
                            render={({ field }) => (
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <label
                                            htmlFor="campaign_is_active"
                                            className="text-sm font-medium text-foreground cursor-pointer block"
                                        >
                                            {t('formActiveCheckbox')}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">{t('activeDesc')}</p>
                                    </div>
                                    <Switch
                                        id="campaign_is_active"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        />

                        <div className="border-t border-border/50 pt-3">
                            <Controller
                                control={control}
                                name="requiresApproval"
                                render={({ field }) => (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <label
                                                htmlFor="campaign_requires_approval"
                                                className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1.5"
                                            >
                                                <ShieldCheckIcon className="size-3.5 text-primary" />
                                                <span>{t('formRequiresApprovalCheckbox')}</span>
                                            </label>
                                            <p className="text-[11px] text-muted-foreground">{t('approvalDesc')}</p>
                                        </div>
                                        <Switch
                                            id="campaign_requires_approval"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </form>
    )
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
            <div className="border-b border-border/50 pb-3">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-col gap-4">{children}</div>
        </section>
    )
}
