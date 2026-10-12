'use client'

import React, { useState } from 'react'
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    FileText,
    Fingerprint,
    Mail,
    Phone,
    RefreshCw,
    ShieldAlert,
    Store,
    User,
    X,
    XCircle,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { SellerApplicationDetail } from '@timmyhub/contracts'
import { ResourceStatus } from '@timmyhub/contracts'

import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ErrorState,
    StatusBadge,
    UserAvatar,
} from '@/components'
import { QUERY_KEY, SELLER_APPLICATION_STATUS_TONE, SELLER_APPLICATION_TAB, StatusTone } from '@/constants'
import { formatTimestamp } from '@/utils'

import { getSellerApplicationDetailAdminAction } from '../actions'
import { buildSellerTabsHref } from '../seller-tab-query'
import { DocumentPreview } from './document-preview'
import { ApproveDialog, RejectDialog } from './seller-application-dialogs'

interface SellerApplicationDetailPanelProps {
    id: string
    initialData?: SellerApplicationDetail | null
}

export function SellerApplicationDetailPanel({ id, initialData }: SellerApplicationDetailPanelProps) {
    const t = useTranslations('sellerApplications')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    // Action dialogs
    const [isApproveOpen, setIsApproveOpen] = useState(false)
    const [isRejectOpen, setIsRejectOpen] = useState(false)

    const {
        data: application,
        isLoading,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY.SELLER.APPLICATION_DETAIL(id),
        queryFn: async () => {
            const res = await getSellerApplicationDetailAdminAction(id)
            if (!res.ok) {
                throw new Error(res.message || t('detailNotFound'))
            }
            return res.data
        },
        initialData: initialData && initialData.id === id ? initialData : undefined,
        staleTime: 30_000,
    })

    const handleBackToList = () => {
        const href = buildSellerTabsHref(pathname, searchParams, { tab: SELLER_APPLICATION_TAB.LIST })
        router.push(href)
    }

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} ${t('copyIdSuccess').toLowerCase()}`)
    }

    if (isLoading && !application) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
                <RefreshCw className="size-6 animate-spin text-primary" />
                <span className="text-sm font-medium">{t('refreshing')}</span>
            </div>
        )
    }

    if (queryError || !application) {
        return (
            <div className="p-6">
                <ErrorState
                    title={t('detailLoadFailed')}
                    description={queryError instanceof Error ? queryError.message : t('detailNotFound')}
                    onRetry={() => refetch()}
                />
                <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={handleBackToList} className="gap-2">
                        <ArrowLeft className="size-4" /> {t('backToList')}
                    </Button>
                </div>
            </div>
        )
    }

    const status = application.status
    const tone = SELLER_APPLICATION_STATUS_TONE[status] ?? StatusTone.NEUTRAL
    const statusLabel =
        status === ResourceStatus.PENDING
            ? t('statusPending')
            : status === ResourceStatus.APPROVED
              ? t('statusApproved')
              : t('statusRejected')
    const isPending = status === ResourceStatus.PENDING

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBackToList}
                        title={t('backToList')}
                        className="rounded-xl size-9 shrink-0"
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Store className="size-5.5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg font-bold text-foreground truncate">{application.shopName}</h2>
                            <StatusBadge tone={tone} label={statusLabel} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                <span>{t('applicationCode')}</span>
                                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                                    {application.id}
                                </code>
                                <Button
                                    type="button"
                                    onClick={() => handleCopy(application.id, t('applicationCode'))}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                    title={t('copyCodeSuccess')}
                                    variant="ghost"
                                >
                                    <Copy className="size-3" />
                                </Button>
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3 text-muted-foreground" />
                                <span>{t('submittedAt', { time: formatTimestamp(application.createdAt) })}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    {isPending ? (
                        <>
                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 rounded-xl text-sm"
                                onClick={() => setIsRejectOpen(true)}
                            >
                                <XCircle className="size-4" />
                                {t('rejectAction')}
                            </Button>
                            <Button
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-sm text-sm"
                                onClick={() => setIsApproveOpen(true)}
                            >
                                <CheckCircle2 className="size-4" />
                                {t('approveAction')}
                            </Button>
                        </>
                    ) : (
                        <div className="text-xs text-muted-foreground">
                            {t('processedAt', { time: formatTimestamp(application.updatedAt) })}
                        </div>
                    )}
                </div>
            </div>

            {/* Rejection Notice Banner if rejected */}
            {status === ResourceStatus.REJECTED && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 flex items-start gap-3">
                    <ShieldAlert className="size-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{t('rejectionBannerTitle')}</h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300">
                            {t('rejectionReasonLabel')}{' '}
                            <strong>{application.reviewNote || t('noSpecificReason')}</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* Balanced 2-Column Grid (6 cols / 6 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Column 1: Shop Information & Applicant Information */}
                <div className="space-y-6">
                    {/* Shop Info Card */}
                    <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Store className="size-4.5 text-primary" />
                                {t('sectionShopInfo')}
                            </CardTitle>
                            <CardDescription>{t('sectionShopInfoDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-muted/20 border">
                                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                                        {t('fieldName')}
                                    </span>
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {application.shopName}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/20 border">
                                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                                        {t('fieldTaxCode')}
                                    </span>
                                    <p className="text-sm font-semibold text-foreground font-mono">
                                        {application.taxCode || `— (${t('notProvided')})`}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-medium text-muted-foreground block mb-1.5">
                                    {t('fieldDescription')}
                                </span>
                                <div className="p-3.5 rounded-xl bg-muted/30 border text-sm text-foreground leading-relaxed min-h-[72px]">
                                    {application.shopDescription || t('noDescription')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Applicant Profile Card */}
                    <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <User className="size-4.5 text-primary" />
                                {t('sectionApplicant')}
                            </CardTitle>
                            <CardDescription>{t('sectionApplicantDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/20 border">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserAvatar
                                        name={application.user?.name ?? application.user?.email ?? 'User'}
                                        className="size-11 rounded-xl text-sm"
                                    />
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-foreground truncate">
                                            {application.user?.name || t('unnamed')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                                            <Mail className="size-3 text-muted-foreground shrink-0" />
                                            {application.user?.email || t('noEmail')}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs rounded-lg shrink-0"
                                    onClick={() => handleCopy(application.userId, t('userIdentifier'))}
                                >
                                    <Copy className="size-3" />
                                    {t('copyId')}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/10 border text-xs">
                                    <Phone className="size-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-muted-foreground block text-[11px]">
                                            {t('userPhone')}
                                        </span>
                                        <span className="font-semibold text-foreground truncate block">
                                            {application.user?.phone || t('noPhone')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/10 border text-xs">
                                    <Fingerprint className="size-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-muted-foreground block text-[11px]">
                                            {t('userIdentifier')}
                                        </span>
                                        <span className="font-mono text-foreground truncate block text-[11px]">
                                            {application.userId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Column 2: Legal Documents & Timeline */}
                <div className="space-y-6">
                    {/* Legal Documents Preview */}
                    <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileText className="size-4.5 text-primary" />
                                {t('sectionDocuments')}
                            </CardTitle>
                            <CardDescription>{t('sectionDocumentsDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <DocumentPreview
                                url={application.idDocumentUrl}
                                shopName={application.shopName}
                                title={t('docModalTitle')}
                            />
                        </CardContent>
                    </Card>

                    {/* Review Status & Application Timeline */}
                    <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Clock className="size-4.5 text-primary" />
                                {t('sectionTimeline')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-start gap-3 text-xs">
                                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                    <FileText className="size-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-foreground block">
                                        {t('timelineSubmitted')}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {formatTimestamp(application.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {status === ResourceStatus.APPROVED && (
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="size-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="size-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-emerald-600 block">
                                            {t('timelineApproved')}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {formatTimestamp(application.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {status === ResourceStatus.REJECTED && (
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="size-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <X className="size-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-rose-600 block">
                                            {t('timelineRejected')}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {formatTimestamp(application.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {status === ResourceStatus.PENDING && (
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="size-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock className="size-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-amber-600 block">
                                            {t('timelinePending')}
                                        </span>
                                        <span className="text-muted-foreground">{t('timelinePendingDesc')}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            <ApproveDialog
                app={application}
                open={isApproveOpen}
                onOpenChange={setIsApproveOpen}
                onSucceeded={() => {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.ALL })
                    refetch()
                    router.refresh()
                }}
            />

            <RejectDialog
                app={application}
                open={isRejectOpen}
                onOpenChange={setIsRejectOpen}
                onSucceeded={() => {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.ALL })
                    refetch()
                    router.refresh()
                }}
            />
        </div>
    )
}
