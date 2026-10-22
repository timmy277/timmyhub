'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, RefreshCw, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { WithdrawalDetail } from '@timmyhub/contracts'
import { Button, Card, CardContent, Input, Skeleton } from '@/components'
import { QUERY_KEY } from '@/constants'
import { approveWithdrawalAction, listAdminWithdrawalsAction, rejectWithdrawalAction } from '../actions'
import { AdminWithdrawalsTable } from './admin-withdrawals-table'
import { WithdrawalApproveDialog } from './withdrawal-approve-dialog'
import { WithdrawalRejectDialog } from './withdrawal-reject-dialog'

interface AdminWithdrawalsViewProps {
    initialItems: WithdrawalDetail[]
    initialTotal: number
}

export function AdminWithdrawalsView({ initialItems, initialTotal }: AdminWithdrawalsViewProps) {
    const t = useTranslations('adminWithdrawals')
    const queryClient = useQueryClient()

    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [searchTerm, setSearchTerm] = useState('')
    const [page] = useState(1)

    const [approveItem, setApproveItem] = useState<WithdrawalDetail | null>(null)
    const [rejectItem, setRejectItem] = useState<WithdrawalDetail | null>(null)

    const { data, isLoading, isFetching, refetch } = useQuery<{ items: WithdrawalDetail[]; total: number }>({
        queryKey: QUERY_KEY.SELLER.ADMIN_WITHDRAWALS({ status: statusFilter, page }),
        queryFn: async () => {
            const statusParam = statusFilter === 'ALL' ? undefined : statusFilter
            const res = await listAdminWithdrawalsAction(statusParam, page, 50)
            if (!res.ok || !res.data) return { items: [], total: 0 }
            return res.data
        },
        initialData: statusFilter === 'ALL' && page === 1 ? { items: initialItems, total: initialTotal } : undefined,
    })

    const approveMutation = useMutation({
        mutationFn: async (item: WithdrawalDetail) => {
            const res = await approveWithdrawalAction(item.id)
            if (!res.ok) throw new Error(res.code || 'APPROVE_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success(t('approveSuccess'))
            setApproveItem(null)
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.ADMIN_WITHDRAWALS() })
        },
        onError: (err: Error) => {
            toast.error(t('approveError', { error: err.message }))
        },
    })

    const rejectMutation = useMutation({
        mutationFn: async ({ item, reason }: { item: WithdrawalDetail; reason: string }) => {
            const res = await rejectWithdrawalAction(item.id, reason)
            if (!res.ok) throw new Error(res.code || 'REJECT_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success(t('rejectSuccess'))
            setRejectItem(null)
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.ADMIN_WITHDRAWALS() })
        },
        onError: (err: Error) => {
            toast.error(t('rejectError', { error: err.message }))
        },
    })

    const items = data?.items ?? []
    const filteredItems = items.filter((item) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase()
        const shop = (item.shopName || '').toLowerCase()
        const account = item.bankAccountNumber.toLowerCase()
        const holder = item.bankAccountName.toLowerCase()
        return shop.includes(term) || account.includes(term) || holder.includes(term)
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('pageDescription')}</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="self-start sm:self-auto rounded-xl gap-2 text-xs"
                >
                    <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto">
                    {[
                        { key: 'ALL', label: t('filterAll') },
                        { key: 'REQUESTED', label: t('filterRequested') },
                        { key: 'PAID', label: t('filterPaid') },
                        { key: 'REJECTED', label: t('filterRejected') },
                    ].map((tab) => (
                        <Button
                            key={tab.key}
                            type="button"
                            variant={statusFilter === tab.key ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter(tab.key)}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                                statusFilter === tab.key
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 h-8 text-xs rounded-xl bg-card border-border/70"
                    />
                    {searchTerm && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchTerm('')}
                            className="size-6 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                            <X className="size-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-12 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <CreditCard className="size-12 mx-auto text-muted-foreground/30" />
                            <p className="text-base font-semibold text-foreground">{t('emptyTitle')}</p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('emptyDesc')}</p>
                        </div>
                    ) : (
                        <AdminWithdrawalsTable
                            items={filteredItems}
                            onApproveClick={(item) => setApproveItem(item)}
                            onRejectClick={(item) => setRejectItem(item)}
                        />
                    )}
                </CardContent>
            </Card>

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
        </div>
    )
}
