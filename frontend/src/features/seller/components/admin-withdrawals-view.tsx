'use client'

import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { AdminWithdrawalRow } from '@/config'
import { WITHDRAWAL_TAB } from '@/constants'
import { approveWithdrawalAction, rejectWithdrawalAction } from '../actions'
import { buildWithdrawalTabsHref, type WithdrawalTabState, type WithdrawalTabsState } from '../withdrawal-tab-query'
import { AdminWithdrawalsTable } from './admin-withdrawals-table'
import { WithdrawalApproveDialog } from './withdrawal-approve-dialog'
import { WithdrawalDetailPanel } from './withdrawal-detail-panel'
import { WithdrawalRejectDialog } from './withdrawal-reject-dialog'
import { WithdrawalTabs } from './withdrawal-tabs'

interface AdminWithdrawalsViewProps {
    rows: AdminWithdrawalRow[]
    totalItems: number
    page: number
    pageSize: number
    status?: string
    search?: string
    tabs: WithdrawalTabsState
    currentUserId: string
    initialDetail?: AdminWithdrawalRow | null
}

export function AdminWithdrawalsView({
    rows,
    totalItems,
    page,
    pageSize,
    status,
    search,
    tabs,
    currentUserId,
    initialDetail,
}: AdminWithdrawalsViewProps) {
    // ===== State =====
    const [approveItem, setApproveItem] = useState<AdminWithdrawalRow | null>(null)
    const [rejectItem, setRejectItem] = useState<AdminWithdrawalRow | null>(null)

    // ===== Hooks =====
    const t = useTranslations('adminWithdrawals')
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const { active } = tabs

    const hrefFor = useCallback(
        (target: WithdrawalTabState) => buildWithdrawalTabsHref(pathname, searchParams, target),
        [pathname, searchParams],
    )

    const approveMutation = useMutation({
        mutationFn: async (item: AdminWithdrawalRow) => {
            const res = await approveWithdrawalAction(item.id)
            if (!res.ok) throw new Error(res.code || 'APPROVE_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success(t('approveSuccess'))
            setApproveItem(null)
            router.refresh()
        },
        onError: (err: Error) => {
            toast.error(t('approveError', { error: err.message }))
        },
    })

    const rejectMutation = useMutation({
        mutationFn: async ({ item, reason }: { item: AdminWithdrawalRow; reason: string }) => {
            const res = await rejectWithdrawalAction(item.id, reason)
            if (!res.ok) throw new Error(res.code || 'REJECT_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success(t('rejectSuccess'))
            setRejectItem(null)
            router.refresh()
        },
        onError: (err: Error) => {
            toast.error(t('rejectError', { error: err.message }))
        },
    })

    // Active detail item
    const currentDetail =
        active.tab === WITHDRAWAL_TAB.DETAIL
            ? initialDetail?.id === active.id
                ? initialDetail
                : (rows.find((r) => r.id === active.id) ?? null)
            : null

    const activeLabel = currentDetail ? currentDetail.shopName || currentDetail.bankAccountName : undefined

    return (
        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
            {/* Folder Tab Strip */}
            <WithdrawalTabs active={active} userId={currentUserId} activeLabel={activeLabel} />

            {/* Active Tab Panel */}
            <div className="mt-4">
                {active.tab === WITHDRAWAL_TAB.DETAIL ? (
                    currentDetail ? (
                        <WithdrawalDetailPanel
                            withdrawal={currentDetail}
                            onApprove={(item) => setApproveItem(item)}
                            onReject={(item) => setRejectItem(item)}
                        />
                    ) : (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            Không tìm thấy dữ liệu yêu cầu rút tiền.
                        </div>
                    )
                ) : (
                    <AdminWithdrawalsTable
                        rows={rows}
                        totalItems={totalItems}
                        page={page}
                        pageSize={pageSize}
                        status={status}
                        search={search}
                        onDetailClick={(item) =>
                            router.push(
                                hrefFor({
                                    tab: WITHDRAWAL_TAB.DETAIL,
                                    id: item.id,
                                    label: item.shopName || item.bankAccountName,
                                }),
                            )
                        }
                        onApproveClick={(item) => setApproveItem(item)}
                        onRejectClick={(item) => setRejectItem(item)}
                    />
                )}
            </div>

            <WithdrawalApproveDialog
                item={approveItem}
                isOpen={Boolean(approveItem)}
                isSubmitting={approveMutation.isPending}
                onClose={() => setApproveItem(null)}
                onConfirm={(item) => approveMutation.mutate(item)}
            />

            <WithdrawalRejectDialog
                item={rejectItem}
                isOpen={Boolean(rejectItem)}
                isSubmitting={rejectMutation.isPending}
                onClose={() => setRejectItem(null)}
                onConfirm={(item, reason) => rejectMutation.mutate({ item, reason })}
            />
        </section>
    )
}
