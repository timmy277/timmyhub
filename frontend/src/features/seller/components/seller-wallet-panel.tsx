'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Building2, CreditCard, DollarSign, Lock, RefreshCw, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { WalletDetail, WalletTransactionDetail, WithdrawalDetail } from '@timmyhub/contracts'
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Skeleton,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components'
import { QUERY_KEY } from '@/constants'
import { formatCurrencyVND } from '@/utils'
import { getSellerWalletAction, getSellerWithdrawalsAction } from '../actions'
import { SellerWithdrawDialog } from './seller-withdraw-dialog'

export function SellerWalletPanel() {
    // ===== State =====
    const t = useTranslations('sellerWallet')
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

    // ===== Hooks =====
    const {
        data: wallet,
        isLoading,
        isRefetching,
        refetch,
    } = useQuery<WalletDetail | null>({
        queryKey: QUERY_KEY.SELLER.WALLET,
        queryFn: async () => {
            const res = await getSellerWalletAction()
            if (!res.ok || !res.data) return null
            return res.data
        },
    })

    const { data: withdrawals = [], isLoading: isWithdrawalsLoading } = useQuery<WithdrawalDetail[]>({
        queryKey: QUERY_KEY.SELLER.WITHDRAWALS,
        queryFn: async () => {
            const res = await getSellerWithdrawalsAction()
            if (!res.ok || !res.data) return []
            return res.data
        },
    })

    // ===== Derived =====
    const available = Number(wallet?.availableBalance || 0)
    const hold = Number(wallet?.holdBalance || 0)
    const transactions = wallet?.recentTransactions || []

    const defaultBank = withdrawals[0]
        ? {
              name: withdrawals[0].bankName,
              accountNumber: withdrawals[0].bankAccountNumber,
              accountName: withdrawals[0].bankAccountName,
          }
        : undefined

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                </div>
                <Skeleton className="h-96 rounded-2xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('pageDescription')}</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="rounded-xl gap-1.5"
                >
                    <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Làm mới</span>
                </Button>
            </div>

            {/* 3 Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available Balance */}
                <Card className="border border-primary/30 bg-gradient-to-br from-card to-primary/10 shadow-sm relative overflow-hidden">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{t('availableBalance')}</span>
                            <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                                <DollarSign className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                            {formatCurrencyVND(available)}
                        </p>
                        <div className="pt-1">
                            <Button
                                type="button"
                                size="sm"
                                disabled={available < 50000}
                                onClick={() => setIsWithdrawOpen(true)}
                                className="w-full rounded-xl font-bold bg-primary text-white shadow-md hover:bg-primary/90 gap-1.5"
                            >
                                <CreditCard className="size-4" />
                                <span>{t('withdrawAction')}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Balance */}
                <Card className="border border-amber-500/20 bg-gradient-to-br from-card to-amber-500/10 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{t('holdBalance')}</span>
                            <div className="size-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                                <Lock className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{formatCurrencyVND(hold)}</p>
                        <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{t('holdBalanceDesc')}</p>
                    </CardContent>
                </Card>

                {/* Bank Account */}
                <Card className="border border-border/80 bg-card shadow-sm">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{t('bankAccount')}</span>
                            <div className="size-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                                <Building2 className="size-4" />
                            </div>
                        </div>
                        {defaultBank ? (
                            <div className="space-y-1">
                                <p className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span>{defaultBank.name}</span>
                                    <Badge variant="outline" className="text-[10px] font-mono py-0">
                                        {defaultBank.accountNumber}
                                    </Badge>
                                </p>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">
                                    {defaultBank.accountName}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground pt-1 italic">
                                Chưa có tài khoản ngân hàng nhận tiền
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Transactions & Withdrawals */}
            <Tabs defaultValue="transactions" className="w-full">
                <div className="flex items-center justify-between pb-2">
                    <TabsList className="bg-muted/60 p-1 rounded-xl">
                        <TabsTrigger value="transactions" className="rounded-lg text-xs font-semibold px-4 py-1.5">
                            {t('tabTransactions', { count: transactions.length })}
                        </TabsTrigger>
                        <TabsTrigger value="withdrawals" className="rounded-lg text-xs font-semibold px-4 py-1.5">
                            {t('tabWithdrawals', { count: withdrawals.length })}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="transactions" className="mt-2">
                    <Card className="border border-border/70 bg-card/80 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 border-b border-border/60">
                            <CardTitle className="text-base font-bold text-foreground">{t('txTitle')}</CardTitle>
                            <CardDescription className="text-xs">{t('txDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {transactions.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <Wallet className="size-10 mx-auto text-muted-foreground/40" />
                                    <p className="text-sm font-semibold text-foreground">{t('txEmptyTitle')}</p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('txEmptyDesc')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {transactions.map((tx: WalletTransactionDetail) => {
                                        const isIncome = tx.type === 'SALE_INCOME'
                                        const formattedDate = new Date(tx.createdAt).toLocaleString('vi-VN')
                                        const txAmount = Number(tx.amount)

                                        return (
                                            <div
                                                key={tx.id}
                                                className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div
                                                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isIncome
                                                                ? 'bg-emerald-500/15 text-emerald-500'
                                                                : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        {isIncome ? (
                                                            <ArrowDownRight className="size-5" />
                                                        ) : (
                                                            <ArrowUpRight className="size-5" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">
                                                            {tx.description ||
                                                                (isIncome ? t('txTypeIncome') : t('txTypeWithdrawal'))}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                                                    </div>
                                                </div>
                                                <p
                                                    className={`text-base font-extrabold ${
                                                        isIncome ? 'text-emerald-500' : 'text-foreground'
                                                    }`}
                                                >
                                                    {isIncome ? '+' : '-'}
                                                    {formatCurrencyVND(txAmount)}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawals" className="mt-2">
                    <Card className="border border-border/70 bg-card/80 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 border-b border-border/60">
                            <CardTitle className="text-base font-bold text-foreground">{t('wTitle')}</CardTitle>
                            <CardDescription className="text-xs">{t('wDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isWithdrawalsLoading ? (
                                <div className="p-5 space-y-3">
                                    <Skeleton className="h-16 w-full rounded-xl" />
                                    <Skeleton className="h-16 w-full rounded-xl" />
                                </div>
                            ) : withdrawals.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <Building2 className="size-10 mx-auto text-muted-foreground/40" />
                                    <p className="text-sm font-semibold text-foreground">{t('wEmptyTitle')}</p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('wEmptyDesc')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {withdrawals.map((w: WithdrawalDetail) => {
                                        const formattedDate = new Date(w.createdAt).toLocaleString('vi-VN')
                                        const wAmount = Number(w.amount)
                                        const isPaid = w.status === 'PAID'
                                        const isRejected = w.status === 'REJECTED'

                                        return (
                                            <div
                                                key={w.id}
                                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div
                                                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isPaid
                                                                ? 'bg-emerald-500/15 text-emerald-500'
                                                                : isRejected
                                                                  ? 'bg-destructive/15 text-destructive'
                                                                  : 'bg-amber-500/15 text-amber-500'
                                                        }`}
                                                    >
                                                        <CreditCard className="size-5" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                                            <span>
                                                                {w.bankName} • {w.bankAccountNumber}
                                                            </span>
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {w.bankAccountName} • {formattedDate}
                                                        </p>
                                                        {w.rejectReason && (
                                                            <p className="text-xs text-destructive font-medium">
                                                                {t('rejectReason', { reason: w.rejectReason })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5">
                                                    <p className="text-base font-extrabold text-foreground">
                                                        {formatCurrencyVND(wAmount)}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs font-bold ${
                                                            isPaid
                                                                ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                                                : isRejected
                                                                  ? 'border-destructive/30 text-destructive bg-destructive/10'
                                                                  : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                                                        }`}
                                                    >
                                                        {isPaid
                                                            ? t('statusPaid')
                                                            : isRejected
                                                              ? t('statusRejected')
                                                              : t('statusRequested')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <SellerWithdrawDialog
                isOpen={isWithdrawOpen}
                availableBalance={available}
                initialBank={defaultBank}
                onClose={() => setIsWithdrawOpen(false)}
            />
        </div>
    )
}
