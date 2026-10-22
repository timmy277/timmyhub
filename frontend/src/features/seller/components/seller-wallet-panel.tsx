'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Lock,
    RefreshCw,
    Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
    CreateWithdrawalInput,
    WalletDetail,
    WalletTransactionDetail,
    WithdrawalDetail,
} from '@timmyhub/contracts'
import { CreateWithdrawalInputSchema } from '@timmyhub/contracts'

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    FloatInput,
    Skeleton,
    Spinner,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components'
import { QUERY_KEY } from '@/constants'
import { formatCurrencyVND } from '@/utils'

import { getSellerWalletAction, getSellerWithdrawalsAction, requestWithdrawalAction } from '../actions'

const POPULAR_BANKS = [
    'Vietcombank',
    'Techcombank',
    'MB Bank',
    'BIDV',
    'VietinBank',
    'ACB',
    'VPBank',
    'TPBank',
    'Sacombank',
    'HDBank',
]

export function SellerWalletPanel() {
    const queryClient = useQueryClient()
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

    // Form state
    const [amount, setAmount] = useState<string>('')
    const [bankName, setBankName] = useState<string>('')
    const [bankAccountNumber, setBankAccountNumber] = useState<string>('')
    const [bankAccountName, setBankAccountName] = useState<string>('')
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

    const withdrawMutation = useMutation({
        mutationFn: async (input: CreateWithdrawalInput) => {
            const res = await requestWithdrawalAction(input)
            if (!res.ok) {
                throw new Error(res.code || 'WITHDRAW_FAILED')
            }
            return res.data
        },
        onSuccess: () => {
            toast.success('Yêu cầu rút tiền đã được gửi thành công, tiền sẽ về tài khoản sau 1-2 ngày làm việc')
            setIsWithdrawOpen(false)
            setAmount('')
            setBankName('')
            setBankAccountNumber('')
            setBankAccountName('')
            setFormErrors({})
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.WALLET })
            queryClient.invalidateQueries({ queryKey: QUERY_KEY.SELLER.WITHDRAWALS })
        },
        onError: (err: Error) => {
            toast.error(
                err.message === 'INSUFFICIENT_BALANCE'
                    ? 'Số dư khả dụng không đủ để rút'
                    : 'Không thể thực hiện yêu cầu rút tiền',
            )
        },
    })

    const available = Number(wallet?.availableBalance ?? 0)
    const hold = Number(wallet?.holdBalance ?? 0)
    const totalBalance = available + hold
    const transactions: WalletTransactionDetail[] = wallet?.recentTransactions ?? []

    const handleSubmitWithdraw = () => {
        const numAmount = Number(amount)
        const input: CreateWithdrawalInput = {
            amount: numAmount,
            bankName: bankName.trim(),
            bankAccountNumber: bankAccountNumber.trim(),
            bankAccountName: bankAccountName.trim().toUpperCase(),
        }

        const parsed = CreateWithdrawalInputSchema.safeParse(input)
        if (!parsed.success) {
            const errors: Record<string, string> = {}
            for (const issue of parsed.error.issues) {
                const path = String(issue.path[0])
                errors[path] = issue.message
            }
            setFormErrors(errors)
            return
        }

        if (numAmount > available) {
            setFormErrors({ amount: 'Số tiền rút không được vượt quá số dư khả dụng' })
            return
        }

        setFormErrors({})
        withdrawMutation.mutate(input)
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header + Refresh Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Wallet className="size-5 text-primary" />
                        <span>Ví Shop &amp; Dòng tiền</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Theo dõi số dư bán hàng, tiền đang giữ đối soát và lịch sử chuyển tiền.
                    </p>
                </div>
                <Button
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
                            <span className="font-semibold text-foreground">Số dư khả dụng</span>
                            <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                                <DollarSign className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                            {formatCurrencyVND(available)}
                        </p>
                        <div className="pt-1">
                            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        disabled={available < 50000}
                                        className="w-full rounded-xl font-bold bg-primary text-white shadow-md hover:bg-primary/90 gap-1.5"
                                    >
                                        <CreditCard className="size-4" />
                                        <span>Rút tiền về ngân hàng</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md rounded-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                            <CreditCard className="size-5 text-primary" />
                                            <span>Rút tiền từ Ví Shop</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-xs">
                                            Số dư khả dụng hiện tại:{' '}
                                            <strong className="text-primary font-bold">
                                                {formatCurrencyVND(available)}
                                            </strong>
                                            . Số tiền rút tối thiểu 50.000₫.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-2">
                                        <div>
                                            <FloatInput
                                                id="withdraw-amount"
                                                label="Số tiền muốn rút (₫)"
                                                type="number"
                                                min={50000}
                                                max={available}
                                                step={10000}
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                            />
                                            {formErrors.amount && (
                                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                                    <AlertCircle className="size-3" />
                                                    {formErrors.amount}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <FloatInput
                                                id="withdraw-bank-name"
                                                label="Tên ngân hàng (vd: Vietcombank, MB Bank)"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                            />
                                            <div className="flex gap-1.5 flex-wrap mt-1.5">
                                                {POPULAR_BANKS.slice(0, 5).map((b) => (
                                                    <Button
                                                        key={b}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setBankName(b)}
                                                        className="text-[11px] h-6 px-2.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors border-border/60"
                                                    >
                                                        {b}
                                                    </Button>
                                                ))}
                                            </div>
                                            {formErrors.bankName && (
                                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                                    <AlertCircle className="size-3" />
                                                    {formErrors.bankName}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <FloatInput
                                                id="withdraw-account-number"
                                                label="Số tài khoản ngân hàng"
                                                value={bankAccountNumber}
                                                onChange={(e) => setBankAccountNumber(e.target.value)}
                                            />
                                            {formErrors.bankAccountNumber && (
                                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                                    <AlertCircle className="size-3" />
                                                    {formErrors.bankAccountNumber}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <FloatInput
                                                id="withdraw-account-name"
                                                label="Tên chủ tài khoản (VIẾT HOA KHÔNG DẤU)"
                                                value={bankAccountName}
                                                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                                            />
                                            {formErrors.bankAccountName && (
                                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                                    <AlertCircle className="size-3" />
                                                    {formErrors.bankAccountName}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <DialogFooter className="gap-2 sm:gap-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-xl"
                                            onClick={() => setIsWithdrawOpen(false)}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="button"
                                            className="rounded-xl bg-primary text-white font-bold"
                                            disabled={withdrawMutation.isPending}
                                            onClick={handleSubmitWithdraw}
                                        >
                                            {withdrawMutation.isPending && <Spinner className="size-4 mr-2" />}
                                            Xác nhận rút tiền
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Hold Balance */}
                <Card className="border border-border/70 bg-gradient-to-br from-card to-amber-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Tiền đang đối soát</span>
                            <div className="size-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                                <Lock className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                            {formatCurrencyVND(hold)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="size-3.5 text-amber-500 shrink-0" />
                            <span>Tự động giải phóng sau 3-7 ngày kể từ khi người mua nhận hàng.</span>
                        </p>
                    </CardContent>
                </Card>

                {/* Total Balance */}
                <Card className="border border-border/70 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Tổng tài sản ví</span>
                            <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                                <Building2 className="size-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                            {formatCurrencyVND(totalBalance)}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" />
                            <span>Bảo vệ quyền lợi người mua và người bán</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Transactions & Withdrawals */}
            <Tabs defaultValue="transactions" className="w-full">
                <div className="flex items-center justify-between pb-2">
                    <TabsList className="bg-muted/60 p-1 rounded-xl">
                        <TabsTrigger value="transactions" className="rounded-lg text-xs font-semibold px-4 py-1.5">
                            Biến động số dư ({transactions.length})
                        </TabsTrigger>
                        <TabsTrigger value="withdrawals" className="rounded-lg text-xs font-semibold px-4 py-1.5">
                            Lịch sử rút tiền ({withdrawals.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="transactions" className="mt-2">
                    <Card className="border border-border/70 bg-card/80 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 border-b border-border/60">
                            <CardTitle className="text-base font-bold text-foreground">Lịch sử giao dịch ví</CardTitle>
                            <CardDescription className="text-xs">
                                Tất cả các dòng tiền kết chuyển từ đơn hàng hoàn thành và các lệnh rút tiền.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {transactions.length === 0 ? (
                                <div className="py-12 text-center space-y-2">
                                    <Wallet className="size-10 mx-auto text-muted-foreground/40" />
                                    <p className="text-sm font-semibold text-foreground">Chưa có giao dịch phát sinh</p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Khi đơn hàng giao thành công hoặc có yêu cầu rút tiền, biến động số dư sẽ được
                                        hiển thị tại đây.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {transactions.map((tx: WalletTransactionDetail) => {
                                        const isIncome = tx.type === 'SALE_INCOME'
                                        const isWithdrawal = tx.type === 'WITHDRAWAL'
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
                                                                : isWithdrawal
                                                                  ? 'bg-amber-500/15 text-amber-500'
                                                                  : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        {isIncome ? (
                                                            <ArrowUpRight className="size-5" />
                                                        ) : (
                                                            <ArrowDownRight className="size-5" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-bold text-foreground">
                                                            {tx.description ||
                                                                (isIncome
                                                                    ? 'Thu nhập đơn hàng'
                                                                    : 'Rút tiền về ngân hàng')}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                                                    </div>
                                                </div>

                                                <div className="text-right space-y-1">
                                                    <p
                                                        className={`text-sm sm:text-base font-extrabold ${
                                                            isIncome
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-amber-600 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        {isIncome ? '+' : '-'}
                                                        {formatCurrencyVND(txAmount)}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-semibold uppercase tracking-wider"
                                                    >
                                                        Thành công
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

                <TabsContent value="withdrawals" className="mt-2">
                    <Card className="border border-border/70 bg-card/80 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 border-b border-border/60">
                            <CardTitle className="text-base font-bold text-foreground">
                                Lịch sử yêu cầu rút tiền
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Theo dõi trạng thái giải ngân các khoản tiền rút về tài khoản ngân hàng.
                            </CardDescription>
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
                                    <p className="text-sm font-semibold text-foreground">Chưa có yêu cầu rút tiền</p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        Khi bạn tạo yêu cầu rút tiền về ngân hàng, tiến trình xử lý sẽ xuất hiện tại
                                        đây.
                                    </p>
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
                                                            Chủ TK: {w.bankAccountName} • {formattedDate}
                                                        </p>
                                                        {w.rejectReason && (
                                                            <p className="text-xs text-destructive font-medium">
                                                                Lý do từ chối: {w.rejectReason}
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
                                                        className={`text-[10px] font-bold uppercase tracking-wider ${
                                                            isPaid
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                : isRejected
                                                                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                        }`}
                                                    >
                                                        {isPaid
                                                            ? 'Đã chuyển tiền'
                                                            : isRejected
                                                              ? 'Bị từ chối'
                                                              : 'Đang xử lý'}
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
        </div>
    )
}
