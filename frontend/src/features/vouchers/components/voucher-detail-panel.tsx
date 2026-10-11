'use client'

import { useState } from 'react'
import { BanIcon, CheckCircle2Icon, EditIcon, SparklesIcon, TicketIcon, Trash2Icon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { VoucherDetail } from '@timmyhub/contracts'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, StatusBadge } from '@/components'
import { StatusTone, VOUCHER_TAB } from '@/constants'
import { formatCurrencyVND, formatTimestamp } from '@/utils'

import {
    deleteSellerVoucherAction,
    deleteVoucherAction,
    toggleSellerVoucherStatusAction,
    toggleVoucherStatusAction,
} from '../actions'
import { buildVoucherTabsHref } from '../voucher-tab-query'
import { VoucherFormPanel } from './voucher-form-panel'

interface VoucherDetailPanelProps {
    voucher: VoucherDetail
    onVoucherUpdated?: (updated: VoucherDetail) => void
    isSeller?: boolean
}

export function VoucherDetailPanel({
    voucher: initialVoucher,
    onVoucherUpdated,
    isSeller = false,
}: VoucherDetailPanelProps) {
    const t = useTranslations('vouchers')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [voucher, setVoucher] = useState<VoucherDetail>(initialVoucher)
    const [now] = useState(() => Date.now())
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleBackToList = () => {
        router.push(buildVoucherTabsHref(pathname, searchParams, { tab: VOUCHER_TAB.LIST }))
    }

    const handleToggleStatus = async () => {
        try {
            const nextActive = !voucher.isActive
            const res = isSeller
                ? await toggleSellerVoucherStatusAction(voucher.id, nextActive)
                : await toggleVoucherStatusAction(voucher.id, nextActive)
            if (!res.ok) {
                toast.error(res.message || t('toggleFailed'))
                return
            }
            toast.success(
                nextActive ? t('enableSuccess', { code: voucher.code }) : t('disableSuccess', { code: voucher.code }),
            )
            const updated = { ...voucher, isActive: nextActive }
            setVoucher(updated)
            if (onVoucherUpdated) onVoucherUpdated(updated)
            router.refresh()
        } catch {
            toast.error(t('toggleError'))
        }
    }

    const handleConfirmDelete = async () => {
        try {
            const res = isSeller ? await deleteSellerVoucherAction(voucher.id) : await deleteVoucherAction(voucher.id)
            if (!res.ok) {
                toast.error(res.message || t('deleteFailed'))
                return
            }
            toast.success(t('deleteSuccess', { code: voucher.code }))
            setShowDeleteConfirm(false)
            handleBackToList()
            router.refresh()
        } catch {
            toast.error(t('deleteError'))
        }
    }

    if (isEditing) {
        return (
            <VoucherFormPanel
                initialData={voucher}
                isSeller={isSeller}
                onSuccess={(saved) => {
                    setVoucher({ ...voucher, ...saved })
                    setIsEditing(false)
                    if (onVoucherUpdated) onVoucherUpdated({ ...voucher, ...saved })
                }}
            />
        )
    }

    const isExpired = new Date(voucher.endDate).getTime() < now
    const isUpcoming = new Date(voucher.startDate).getTime() > now

    let statusTone: StatusTone = StatusTone.SUCCESS
    let statusLabel = t('statusActive')
    if (!voucher.isActive) {
        statusTone = StatusTone.DANGER
        statusLabel = t('statusDisabled')
    } else if (isExpired) {
        statusTone = StatusTone.NEUTRAL
        statusLabel = t('statusExpired')
    } else if (isUpcoming) {
        statusTone = StatusTone.NEUTRAL
        statusLabel = t('statusUpcoming')
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleToggleStatus} className="gap-1.5">
                    {voucher.isActive ? <BanIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
                    <span>{voucher.isActive ? t('actionDisable') : t('actionEnable')}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                    <EditIcon className="size-4" />
                    <span>{t('btnEdit')}</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5">
                    <Trash2Icon className="size-4" />
                    <span>{t('actionDelete')}</span>
                </Button>
            </div>

            {/* Header Card */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3.5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                <TicketIcon className="size-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-mono text-lg font-bold text-foreground">{voucher.code}</h3>
                                    <StatusBadge tone={statusTone} label={statusLabel} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {voucher.description || t('noDescription')}
                                </p>
                            </div>
                        </div>

                        {voucher.campaign && (
                            <Link href={`/campaigns?tab=detail&id=${voucher.campaign.id}`}>
                                <Badge
                                    variant="outline"
                                    className="gap-1.5 text-xs py-1 px-2.5 hover:bg-muted/60 transition-colors cursor-pointer"
                                >
                                    <SparklesIcon className="size-3.5 text-primary" />
                                    <span>{voucher.campaign.name}</span>
                                </Badge>
                            </Link>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Metric 1 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricValue')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {voucher.type === 'PERCENTAGE'
                                ? `Giảm ${voucher.value}%`
                                : formatCurrencyVND(voucher.value)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {voucher.type === 'PERCENTAGE'
                                ? voucher.maxDiscount
                                    ? t('maxDiscountCap', { amount: formatCurrencyVND(voucher.maxDiscount) })
                                    : t('noMaxDiscountCap')
                                : voucher.type === 'FREE_SHIPPING'
                                  ? t('typeFreeShipping')
                                  : t('discountDirectCash')}
                        </p>
                    </div>

                    {/* Metric 2 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricMinOrder')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {voucher.minOrderValue ? formatCurrencyVND(voucher.minOrderValue) : '0 ₫'}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('minOrderValueLabel')}</p>
                    </div>

                    {/* Metric 3 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricUsage')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {voucher.usedCount} / {voucher.usageLimit != null ? voucher.usageLimit : '∞'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('perCustomerUnit', { count: voucher.perUserLimit })}
                        </p>
                    </div>

                    {/* Metric 4 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricTotalDiscount')}
                        </span>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {voucher.totalDiscountAmount ? formatCurrencyVND(voucher.totalDiscountAmount) : '0 ₫'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('ordersDiscounted', { count: voucher.totalOrdersDiscounted ?? 0 })}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Timing Card */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6">
                    <CardTitle className="text-sm font-semibold">{t('sectionValidity')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-xs text-muted-foreground block">{t('columnStartDate')}</span>
                        <span className="font-medium text-foreground">{formatTimestamp(voucher.startDate)}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">{t('columnEndDate')}</span>
                        <span className="font-medium text-foreground">{formatTimestamp(voucher.endDate)}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">{t('columnCreatedAt')}</span>
                        <span className="font-medium text-foreground">{formatTimestamp(voucher.createdAt)}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">{t('columnUpdatedAt')}</span>
                        <span className="font-medium text-foreground">{formatTimestamp(voucher.updatedAt)}</span>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title={t('deleteDialogTitle')}
                description={t('deleteDialogDesc', { code: voucher.code })}
                confirmLabel={t('deleteConfirmBtn')}
                cancelLabel={t('close')}
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}
