'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    CalendarDaysIcon,
    ClockIcon,
    InfoIcon,
    Loader2Icon,
    SaveIcon,
    SparklesIcon,
    TicketPercentIcon,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type {
    CreateVoucherInput,
    UpdateVoucherInput,
    VoucherDetail,
    VoucherItem,
    VoucherTypeValue,
} from '@timmyhub/contracts'
import { CreateVoucherInputSchema, UpdateVoucherInputSchema, VOUCHER_TYPE } from '@timmyhub/contracts'
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
} from '@/components'
import { VOUCHER_TAB } from '@/constants'
import {
    formatCurrencyVND,
    formatDisplayDate,
    parseDisplayDate,
    parseDisplayDateTime,
    toFieldErrorMessage,
} from '@/utils'

import { listAdminCampaignsAction } from '@/features/campaigns'

import {
    createSellerVoucherAction,
    createVoucherAction,
    updateSellerVoucherAction,
    updateVoucherAction,
} from '../actions'
import { buildVoucherTabsHref } from '../voucher-tab-query'

interface VoucherFormPanelProps {
    initialData?: VoucherDetail | VoucherItem | null
    campaignOptions?: { value: string; label: string }[]
    onSuccess?: (saved: VoucherItem) => void
    isSeller?: boolean
}

interface VoucherFormValues {
    code: string
    type: VoucherTypeValue
    value: number
    minOrderValue: number | null
    maxDiscount: number | null
    usageLimit: number | null
    perUserLimit: number
    startDate: string
    endDate: string
    description: string
    isActive: boolean
    campaignId: string | null
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

export function VoucherFormPanel({ initialData, campaignOptions, onSuccess, isSeller = false }: VoucherFormPanelProps) {
    const t = useTranslations('vouchers')
    const tApi = useTranslations('api')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const isEdit = Boolean(initialData)

    const resolver = useMemo(
        () =>
            zodResolver(
                isEdit ? UpdateVoucherInputSchema : CreateVoucherInputSchema,
            ) as unknown as Resolver<VoucherFormValues>,
        [isEdit],
    )

    const defaultValues: VoucherFormValues = useMemo(
        () => ({
            code: initialData?.code ?? '',
            type: (initialData?.type as VoucherTypeValue) ?? VOUCHER_TYPE.PERCENTAGE,
            value: initialData?.value != null ? Number(initialData.value) : 10,
            minOrderValue: initialData?.minOrderValue != null ? Number(initialData.minOrderValue) : null,
            maxDiscount: initialData?.maxDiscount != null ? Number(initialData.maxDiscount) : null,
            usageLimit: initialData?.usageLimit != null ? Number(initialData.usageLimit) : null,
            perUserLimit: initialData?.perUserLimit != null ? Number(initialData.perUserLimit) : 1,
            startDate: initialData?.startDate ?? '',
            endDate: initialData?.endDate ?? '',
            description: initialData?.description ?? '',
            isActive: initialData?.isActive ?? true,
            campaignId: initialData?.campaignId ?? searchParams.get('campaignId') ?? null,
        }),
        [initialData, searchParams],
    )

    const [dynamicCampaigns, setDynamicCampaigns] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        if (isSeller || (campaignOptions && campaignOptions.length > 0)) return
        let isMounted = true
        void listAdminCampaignsAction({ page: 1, pageSize: 100 }).then((res) => {
            if (isMounted && res.ok) {
                setDynamicCampaigns(res.data.items.map((c) => ({ value: c.id, label: c.name })))
            }
        })
        return () => {
            isMounted = false
        }
    }, [campaignOptions, isSeller])

    const campaignList = campaignOptions && campaignOptions.length > 0 ? campaignOptions : dynamicCampaigns

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<VoucherFormValues>({
        resolver,
        mode: 'onChange',
        defaultValues,
    })

    const watchedCode = useWatch({ control, name: 'code' })
    const watchedType = useWatch({ control, name: 'type' })
    const watchedValue = useWatch({ control, name: 'value' })
    const watchedMinOrder = useWatch({ control, name: 'minOrderValue' })
    const watchedMaxDiscount = useWatch({ control, name: 'maxDiscount' })
    const watchedUsageLimit = useWatch({ control, name: 'usageLimit' })
    const watchedPerUserLimit = useWatch({ control, name: 'perUserLimit' })
    const watchedStartDate = useWatch({ control, name: 'startDate' })
    const watchedEndDate = useWatch({ control, name: 'endDate' })
    const watchedIsActive = useWatch({ control, name: 'isActive' })
    const watchedCampaignId = useWatch({ control, name: 'campaignId' })

    const selectedCampaignName = useMemo(() => {
        if (!watchedCampaignId) return null
        return campaignList.find((c) => c.value === watchedCampaignId)?.label ?? null
    }, [watchedCampaignId, campaignList])

    const handleCancel = () => {
        router.push(buildVoucherTabsHref(pathname, searchParams, { tab: VOUCHER_TAB.LIST }))
    }

    const onSubmit = async (values: VoucherFormValues) => {
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
                const updatePayload: UpdateVoucherInput = {
                    code: values.code.trim().toUpperCase(),
                    type: values.type,
                    value: values.value,
                    minOrderValue: values.minOrderValue,
                    maxDiscount: values.maxDiscount,
                    usageLimit: values.usageLimit,
                    perUserLimit: values.perUserLimit,
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString(),
                    description: values.description.trim() || null,
                    campaignId: isSeller ? null : values.campaignId?.trim() || null,
                    isActive: values.isActive,
                }
                const res = isSeller
                    ? await updateSellerVoucherAction(initialData.id, updatePayload)
                    : await updateVoucherAction(initialData.id, updatePayload)
                if (!res.ok) {
                    toast.error(res.message || t('updateFailed'))
                    return
                }
                toast.success(t('updateSuccess', { code: res.data.code }))
                if (onSuccess) onSuccess(res.data)
                router.refresh()
            } else {
                const createPayload: CreateVoucherInput = {
                    code: values.code.trim().toUpperCase(),
                    type: values.type,
                    value: values.value,
                    minOrderValue: values.minOrderValue,
                    maxDiscount: values.maxDiscount,
                    usageLimit: values.usageLimit,
                    perUserLimit: values.perUserLimit,
                    startDate: startDateObj.toISOString(),
                    endDate: endDateObj.toISOString(),
                    description: values.description.trim() || null,
                    campaignId: isSeller ? null : values.campaignId?.trim() || null,
                    isActive: values.isActive,
                    categoryIds: [],
                    productIds: [],
                    paymentMethods: [],
                }
                const res = isSeller
                    ? await createSellerVoucherAction(createPayload)
                    : await createVoucherAction(createPayload)
                if (!res.ok) {
                    toast.error(res.message || t('createFailed'))
                    return
                }
                toast.success(t('createSuccess', { code: res.data.code }))
                if (onSuccess) onSuccess(res.data)
                router.push(buildVoucherTabsHref(pathname, searchParams, { tab: VOUCHER_TAB.LIST }))
                router.refresh()
            }
        } catch (err) {
            console.error('Voucher save error:', err)
            toast.error(t('submitError'))
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <TicketPercentIcon className="size-5 text-primary" />
                        <span>{isEdit ? t('formTitleEdit') : t('formTitleCreate')}</span>
                        {isEdit && initialData?.code && (
                            <Badge variant="secondary" className="font-mono text-xs font-semibold px-2">
                                {initialData.code}
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

            {/* Layout Grid: Main form content on Left, Live Preview & Quick Actions on Right */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Main Content Column */}
                <div className="flex min-w-0 flex-col gap-6">
                    {/* Section 1: Thông tin cơ bản */}
                    <FormCard title={t('sectionBasicInfo')} description={t('sectionBasicInfoDesc')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput
                                label={t('formCodeLabel')}
                                error={toFieldErrorMessage(errors.code?.message, tApi)}
                                helperText={t('formCodeHelp')}
                                reserveErrorSpace
                                maxLength={30}
                                disabled={isSubmitting}
                                className="font-mono uppercase tracking-wider font-semibold text-primary"
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('code')}
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
                                        <SelectItem value={VOUCHER_TYPE.PERCENTAGE}>{t('typePercentage')}</SelectItem>
                                        <SelectItem value={VOUCHER_TYPE.FIXED_AMOUNT}>
                                            {t('typeFixedAmount')}
                                        </SelectItem>
                                        {!isSeller && (
                                            <SelectItem value={VOUCHER_TYPE.FREE_SHIPPING}>
                                                {t('typeFreeShipping')}
                                            </SelectItem>
                                        )}
                                    </FloatSelect>
                                )}
                            />

                            {!isSeller && (
                                <div className="sm:col-span-2">
                                    <Controller
                                        control={control}
                                        name="campaignId"
                                        render={({ field }) => (
                                            <FloatSelect
                                                label={t('formCampaignLabel')}
                                                value={field.value ?? '__none__'}
                                                onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
                                                error={toFieldErrorMessage(errors.campaignId?.message, tApi)}
                                                helperText={t('formCampaignHelp')}
                                                disabled={isSubmitting}
                                                labelClassName={ON_CARD_LABEL_CLASS}
                                            >
                                                <SelectItem value="__none__">{t('campaignNone')}</SelectItem>
                                                {campaignList.map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </FloatSelect>
                                        )}
                                    />
                                </div>
                            )}
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

                    {/* Section 2: Giá trị ưu đãi & Điều kiện */}
                    <FormCard title={t('sectionDiscountLimits')} description={t('sectionDiscountLimitsDesc')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput
                                type="number"
                                label={
                                    watchedType === VOUCHER_TYPE.PERCENTAGE
                                        ? t('formValuePercentLabel')
                                        : t('formValueAmountLabel')
                                }
                                error={toFieldErrorMessage(errors.value?.message, tApi)}
                                reserveErrorSpace
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('value', {
                                    valueAsNumber: true,
                                })}
                            />

                            <FloatInput
                                type="number"
                                label={t('formMinOrderLabel')}
                                error={toFieldErrorMessage(errors.minOrderValue?.message, tApi)}
                                reserveErrorSpace
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('minOrderValue', {
                                    setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
                                })}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {watchedType === VOUCHER_TYPE.PERCENTAGE ? (
                                <FloatInput
                                    type="number"
                                    label={t('formMaxDiscountLabel')}
                                    error={toFieldErrorMessage(errors.maxDiscount?.message, tApi)}
                                    reserveErrorSpace
                                    disabled={isSubmitting}
                                    labelClassName={ON_CARD_LABEL_CLASS}
                                    {...register('maxDiscount', {
                                        setValueAs: (v) =>
                                            v === '' || v === null || v === undefined ? null : Number(v),
                                    })}
                                />
                            ) : null}

                            <FloatInput
                                type="number"
                                label={t('formUsageLimitLabel')}
                                error={toFieldErrorMessage(errors.usageLimit?.message, tApi)}
                                helperText={t('formUsageLimitHelp')}
                                reserveErrorSpace
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('usageLimit', {
                                    setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
                                })}
                            />

                            <FloatInput
                                type="number"
                                label={t('formPerUserLimitLabel')}
                                error={toFieldErrorMessage(errors.perUserLimit?.message, tApi)}
                                helperText={t('formPerUserLimitHelp')}
                                reserveErrorSpace
                                disabled={isSubmitting}
                                labelClassName={ON_CARD_LABEL_CLASS}
                                {...register('perUserLimit', {
                                    valueAsNumber: true,
                                })}
                            />
                        </div>
                    </FormCard>

                    {/* Section 3: Thời gian hiệu lực bằng FloatDatePicker */}
                    <FormCard title={t('sectionValidityPeriod')} description={t('sectionValidityPeriodDesc')}>
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

                {/* Sidebar Column: Live Voucher Card Preview & Settings */}
                <aside className="flex flex-col gap-6">
                    {/* Real-time Voucher Card Preview */}
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

                        {/* Interactive Coupon Ticket */}
                        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 transition-all duration-200">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        TimmyHub Voucher
                                    </p>
                                    <h3 className="text-lg font-black tracking-tight text-primary mt-0.5">
                                        {watchedType === VOUCHER_TYPE.PERCENTAGE
                                            ? t('previewDiscountPercent', { percent: watchedValue || 0 })
                                            : watchedType === VOUCHER_TYPE.FIXED_AMOUNT
                                              ? t('previewDiscountAmount', {
                                                    amount: formatCurrencyVND(watchedValue || 0),
                                                })
                                              : t('previewFreeShipping')}
                                    </h3>
                                </div>
                                <div className="rounded-lg bg-primary/15 p-2 text-primary">
                                    <TicketPercentIcon className="size-6" />
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <span className="inline-block rounded-md bg-foreground px-2 py-1 font-mono text-xs font-bold text-background tracking-wider">
                                    {watchedCode ? watchedCode.toUpperCase() : 'CODEHERE'}
                                </span>
                                {selectedCampaignName && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] text-primary border-primary/30 max-w-[130px] truncate"
                                    >
                                        {selectedCampaignName}
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-3 space-y-1 border-t border-dashed border-primary/20 pt-2 text-[11px] text-muted-foreground">
                                <p className="flex items-center gap-1">
                                    <InfoIcon className="size-3 text-muted-foreground" />
                                    <span>
                                        {watchedMinOrder
                                            ? t('minOrderRequired', { amount: formatCurrencyVND(watchedMinOrder) })
                                            : t('noMinOrder')}
                                    </span>
                                </p>
                                {watchedType === VOUCHER_TYPE.PERCENTAGE && watchedMaxDiscount ? (
                                    <p className="flex items-center gap-1">
                                        <InfoIcon className="size-3 text-muted-foreground" />
                                        <span>
                                            {t('maxDiscountCap', {
                                                amount: formatCurrencyVND(watchedMaxDiscount),
                                            })}
                                        </span>
                                    </p>
                                ) : null}
                                <p className="flex items-center gap-1">
                                    <CalendarDaysIcon className="size-3 text-muted-foreground" />
                                    <span>
                                        {watchedStartDate && watchedEndDate
                                            ? t('validFromTo', {
                                                  start: formatDisplayDate(safeParseDate(watchedStartDate)),
                                                  end: formatDisplayDate(safeParseDate(watchedEndDate)),
                                              })
                                            : t('noTimeConfigured')}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center">{t('previewHint')}</p>
                    </div>

                    {/* Quick Settings & Status Card */}
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
                                            htmlFor="voucher_is_active"
                                            className="text-sm font-medium text-foreground cursor-pointer block"
                                        >
                                            {t('formActiveCheckbox')}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('formActiveCheckboxDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        id="voucher_is_active"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        />

                        {/* Summary checklist */}
                        <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-2">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{t('totalUsageLimit')}</span>
                                <span className="font-semibold text-foreground">
                                    {watchedUsageLimit ? t('usesUnit', { count: watchedUsageLimit }) : t('unlimited')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{t('perCustomerLimit')}</span>
                                <span className="font-semibold text-foreground">
                                    {t('usesUnit', {
                                        count:
                                            watchedPerUserLimit != null &&
                                            !isNaN(Number(watchedPerUserLimit)) &&
                                            Number(watchedPerUserLimit) > 0
                                                ? Number(watchedPerUserLimit)
                                                : defaultValues.perUserLimit || 1,
                                    })}
                                </span>
                            </div>
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
