'use client'

import { useState } from 'react'
import {
    BanIcon,
    CheckCircle2Icon,
    EditIcon,
    FlameIcon,
    PackageIcon,
    PlusIcon,
    TicketIcon,
    Trash2Icon,
    XCircleIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { CampaignProductItem, PromotionCampaignDetail } from '@timmyhub/contracts'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, StatusBadge } from '@/components'
import { CAMPAIGN_TAB, StatusTone } from '@/constants'
import { formatCurrencyVND, formatTimestamp } from '@/utils'

import { deleteCampaignAction, reviewCampaignProductAction, toggleCampaignStatusAction } from '../actions'
import { buildCampaignTabsHref } from '../campaign-tab-query'
import { CampaignFormPanel } from './campaign-form-panel'

interface CampaignDetailPanelProps {
    campaign: PromotionCampaignDetail
    onCampaignUpdated?: (updated: PromotionCampaignDetail) => void
}

export function CampaignDetailPanel({ campaign: initialCampaign, onCampaignUpdated }: CampaignDetailPanelProps) {
    const t = useTranslations('campaigns')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [campaign, setCampaign] = useState<PromotionCampaignDetail>(initialCampaign)
    const [now] = useState(() => Date.now())
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [reviewingProductId, setReviewingProductId] = useState<string | null>(null)

    const handleBackToList = () => {
        router.push(buildCampaignTabsHref(pathname, searchParams, { tab: CAMPAIGN_TAB.LIST }))
    }

    const handleToggleStatus = async () => {
        try {
            const nextActive = !campaign.isActive
            const res = await toggleCampaignStatusAction(campaign.id, nextActive)
            if (!res.ok) {
                toast.error(res.message || t('toggleFailed'))
                return
            }
            toast.success(
                nextActive ? t('enableSuccess', { name: campaign.name }) : t('disableSuccess', { name: campaign.name }),
            )
            const updated = { ...campaign, isActive: nextActive }
            setCampaign(updated)
            if (onCampaignUpdated) onCampaignUpdated(updated)
            router.refresh()
        } catch {
            toast.error(t('toggleError'))
        }
    }

    const handleConfirmDelete = async () => {
        try {
            const res = await deleteCampaignAction(campaign.id)
            if (!res.ok) {
                toast.error(res.message || t('deleteFailed'))
                return
            }
            toast.success(t('deleteSuccess', { name: campaign.name }))
            setShowDeleteConfirm(false)
            handleBackToList()
            router.refresh()
        } catch {
            toast.error(t('deleteError'))
        }
    }

    const handleReviewProduct = async (productItemId: string, approvalStatus: 'APPROVED' | 'REJECTED') => {
        setReviewingProductId(productItemId)
        try {
            const res = await reviewCampaignProductAction(campaign.id, productItemId, approvalStatus)
            if (!res.ok) {
                toast.error(res.message || t('reviewFailed'))
                return
            }
            toast.success(approvalStatus === 'APPROVED' ? t('reviewApprovedSuccess') : t('reviewRejectedSuccess'))
            const updatedProducts = campaign.campaignProducts.map((p: CampaignProductItem) =>
                p.id === productItemId ? { ...p, approvalStatus } : p,
            )
            const updatedCampaign = { ...campaign, campaignProducts: updatedProducts }
            setCampaign(updatedCampaign)
            if (onCampaignUpdated) onCampaignUpdated(updatedCampaign)
            router.refresh()
        } catch {
            toast.error(t('reviewError'))
        } finally {
            setReviewingProductId(null)
        }
    }

    if (isEditing) {
        return (
            <CampaignFormPanel
                initialData={campaign}
                onSuccess={(saved) => {
                    const next = { ...campaign, ...saved }
                    setCampaign(next)
                    setIsEditing(false)
                    if (onCampaignUpdated) onCampaignUpdated(next)
                }}
            />
        )
    }

    const isExpired = new Date(campaign.endDate).getTime() < now
    const isUpcoming = new Date(campaign.startDate).getTime() > now

    let statusTone: StatusTone = StatusTone.SUCCESS
    let statusLabel = t('statusActive')
    if (!campaign.isActive) {
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
                    {campaign.isActive ? <BanIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
                    <span>{campaign.isActive ? t('actionDisable') : t('actionEnable')}</span>
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
                            <div className="size-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                                <FlameIcon className="size-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-foreground">{campaign.name}</h3>
                                    {campaign.badgeText && (
                                        <Badge variant="destructive" className="text-xs">
                                            {campaign.badgeText}
                                        </Badge>
                                    )}
                                    <StatusBadge tone={statusTone} label={statusLabel} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {campaign.description || t('noDescription')}
                                </p>
                            </div>
                        </div>

                        {campaign.requiresApproval && (
                            <Badge
                                variant="outline"
                                className="text-xs text-amber-600 dark:text-amber-400 border-amber-300"
                            >
                                {t('requiresApprovalBadge')}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                {/* Banner image if present */}
                {campaign.banner && (
                    <div className="relative w-full h-44 sm:h-56 bg-muted/40 border-b border-border/50 overflow-hidden">
                        <Image src={campaign.banner} alt={campaign.name} fill className="object-cover" />
                    </div>
                )}

                <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Metric 1 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricType')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {campaign.type === 'FLASH_SALE'
                                ? t('typeFlashSale')
                                : campaign.type === 'SEASONAL'
                                  ? t('typeSeasonal')
                                  : t('typeCategoryBoost')}
                        </p>
                        <p className="text-xs text-muted-foreground">{campaign.ownerType}</p>
                    </div>

                    {/* Metric 2 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricProducts')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {campaign.campaignProducts.length} {t('productsUnit')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {
                                campaign.campaignProducts.filter(
                                    (p: CampaignProductItem) => p.approvalStatus === 'APPROVED',
                                ).length
                            }{' '}
                            {t('approvedUnit')}
                        </p>
                    </div>

                    {/* Metric 3 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricVouchers')}
                        </span>
                        <p className="text-xl font-bold text-foreground">
                            {campaign.vouchers.length} {t('vouchersUnit')}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('linkedVouchersHelp')}</p>
                    </div>

                    {/* Metric 4 */}
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/15 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('metricDuration')}
                        </span>
                        <p className="text-sm font-bold text-foreground line-clamp-1">
                            {formatTimestamp(campaign.startDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('toLabel')} {formatTimestamp(campaign.endDate)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Enrolled Products Section */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PackageIcon className="size-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">
                            {t('sectionEnrolledProducts')} ({campaign.campaignProducts.length})
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {campaign.campaignProducts.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">{t('noEnrolledProducts')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">{t('tableProductHeader')}</th>
                                        <th className="px-4 py-3">{t('tablePriceHeader')}</th>
                                        <th className="px-4 py-3">{t('tableCampaignStockHeader')}</th>
                                        <th className="px-4 py-3">{t('tableStatusHeader')}</th>
                                        <th className="px-4 py-3 text-right">{t('tableActionsHeader')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {campaign.campaignProducts.map((item: CampaignProductItem) => (
                                        <tr key={item.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">
                                                    {item.productName || 'Sản phẩm'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    SKU: {item.variantSku || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-rose-600 dark:text-rose-400">
                                                    {item.campaignPrice != null
                                                        ? formatCurrencyVND(item.campaignPrice)
                                                        : item.discountPercent
                                                          ? `-${item.discountPercent}%`
                                                          : '0 ₫'}
                                                </div>
                                                {item.originalPrice != null && (
                                                    <div className="text-xs text-muted-foreground line-through">
                                                        {formatCurrencyVND(item.originalPrice)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    {item.maxQuantity != null ? item.maxQuantity : '∞'} (Đã bán:{' '}
                                                    {item.soldQuantity})
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        item.approvalStatus === 'APPROVED'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            : item.approvalStatus === 'REJECTED'
                                                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                    }`}
                                                >
                                                    {item.approvalStatus === 'APPROVED'
                                                        ? t('approvalApproved')
                                                        : item.approvalStatus === 'REJECTED'
                                                          ? t('approvalRejected')
                                                          : t('approvalPending')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    {item.approvalStatus !== 'APPROVED' && (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                            disabled={reviewingProductId === item.id}
                                                            onClick={() => handleReviewProduct(item.id, 'APPROVED')}
                                                        >
                                                            <CheckCircle2Icon className="size-3.5 mr-1" />
                                                            {t('actionApprove')}
                                                        </Button>
                                                    )}
                                                    {item.approvalStatus !== 'REJECTED' && (
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            disabled={reviewingProductId === item.id}
                                                            onClick={() => handleReviewProduct(item.id, 'REJECTED')}
                                                        >
                                                            <XCircleIcon className="size-3.5 mr-1" />
                                                            {t('actionReject')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Linked Vouchers Section */}
            <Card className="border border-border/80 shadow-2xs">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-4 py-3 sm:px-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TicketIcon className="size-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">
                            {t('sectionLinkedVouchers')} ({campaign.vouchers.length})
                        </CardTitle>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                        <Link href={`/vouchers?tab=create&campaignId=${campaign.id}`}>
                            <PlusIcon className="size-3.5" />
                            {t('createVoucherForCampaign')}
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {campaign.vouchers.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">{t('emptyLinkedVouchers')}</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {campaign.vouchers.map((v) => (
                                <Link
                                    key={v.id}
                                    href={`/vouchers?tab=detail&id=${v.id}`}
                                    className="p-3 rounded-lg border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors flex items-center justify-between group"
                                >
                                    <div>
                                        <span className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                            {v.code}
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                            {v.type === 'PERCENTAGE' ? `Giảm ${v.value}%` : formatCurrencyVND(v.value)}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            v.isActive
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {v.isActive ? t('statusActive') : t('statusDisabled')}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title={t('deleteDialogTitle')}
                description={t('deleteDialogDesc', { name: campaign.name })}
                confirmLabel={t('deleteConfirmBtn')}
                cancelLabel={t('close')}
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}
