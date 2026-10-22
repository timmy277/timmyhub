'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, CheckCircle2, Copy, CreditCard, RefreshCw, Search, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import type { WithdrawalDetail } from '@timmyhub/contracts'
import {
    Badge,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    FloatInput,
    Input,
    PageContainer,
    Skeleton,
    Spinner,
} from '@/components'
import { QUERY_KEY } from '@/constants'
import { approveWithdrawalAction, listAdminWithdrawalsAction, rejectWithdrawalAction } from '@/features/seller'
import { formatCurrencyVND } from '@/utils'

export default function AdminWithdrawalsPage() {
    const queryClient = useQueryClient()
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [searchTerm, setSearchTerm] = useState<string>('')

    // Modal states
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<(WithdrawalDetail & { shopName?: string }) | null>(
        null,
    )
    const [isApproveOpen, setIsApproveOpen] = useState(false)
    const [isRejectOpen, setIsRejectOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const { data, isLoading, isRefetching, refetch } = useQuery({
        queryKey: QUERY_KEY.SELLER.ADMIN_WITHDRAWALS({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
        queryFn: async () => {
            const res = await listAdminWithdrawalsAction(statusFilter === 'ALL' ? undefined : statusFilter, 1, 100)
            if (!res.ok || !res.data) {
                return { items: [], total: 0 }
            }
            return res.data
        },
    })

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await approveWithdrawalAction(id)
            if (!res.ok) throw new Error(res.code || 'APPROVE_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã duyệt và đánh dấu chi trả thành công cho người bán!')
            setIsApproveOpen(false)
            setSelectedWithdrawal(null)
            queryClient.invalidateQueries({ queryKey: ['seller', 'admin-withdrawals'] })
        },
        onError: (err: Error) => {
            toast.error(`Duyệt rút tiền thất bại: ${err.message}`)
        },
    })

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const res = await rejectWithdrawalAction(id, reason)
            if (!res.ok) throw new Error(res.code || 'REJECT_FAILED')
            return res.data
        },
        onSuccess: () => {
            toast.success('Đã từ chối lệnh rút tiền và hoàn lại số dư ví cho người bán!')
            setIsRejectOpen(false)
            setRejectReason('')
            setSelectedWithdrawal(null)
            queryClient.invalidateQueries({ queryKey: ['seller', 'admin-withdrawals'] })
        },
        onError: (err: Error) => {
            toast.error(`Từ chối thất bại: ${err.message}`)
        },
    })

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success(`Đã sao chép: ${text}`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const items = data?.items ?? []
    const filteredItems = items.filter((item) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase()
        return (
            (item.shopName && item.shopName.toLowerCase().includes(term)) ||
            item.bankAccountNumber.includes(term) ||
            item.bankAccountName.toLowerCase().includes(term) ||
            item.bankName.toLowerCase().includes(term)
        )
    })

    const pendingCount = items.filter((i) => i.status === 'REQUESTED').length

    return (
        <PageContainer>
            <div className="space-y-6 max-w-7xl mx-auto py-2">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            <span>Duyệt yêu cầu rút tiền người bán</span>
                            {pendingCount > 0 && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 text-xs">
                                    {pendingCount} chờ xử lý
                                </Badge>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Xác thực thông tin chuyển khoản ngân hàng và giải ngân doanh số ví cho người bán trên sàn.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="rounded-xl gap-1.5 self-start sm:self-auto"
                    >
                        <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </Button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto">
                        {[
                            { key: 'ALL', label: 'Tất cả' },
                            { key: 'REQUESTED', label: 'Chờ duyệt' },
                            { key: 'PAID', label: 'Đã chi trả' },
                            { key: 'REJECTED', label: 'Từ chối' },
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
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                        <Input
                            placeholder="Tìm shop, số tài khoản..."
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
                                className="size-6 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Table */}
                <Card className="border border-border/70 bg-card/85 shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="py-16 text-center space-y-3">
                                <CreditCard className="size-12 mx-auto text-muted-foreground/30" />
                                <p className="text-base font-bold text-foreground">Không tìm thấy yêu cầu rút tiền</p>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    {statusFilter === 'REQUESTED'
                                        ? 'Hiện không có lệnh rút tiền nào đang chờ xử lý.'
                                        : 'Chưa có yêu cầu rút tiền phù hợp với điều kiện lọc hiện tại.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                                        <tr>
                                            <th className="py-3.5 px-4">Người bán / Shop</th>
                                            <th className="py-3.5 px-4">Số tiền rút</th>
                                            <th className="py-3.5 px-4">Tài khoản ngân hàng</th>
                                            <th className="py-3.5 px-4">Thời gian</th>
                                            <th className="py-3.5 px-4">Trạng thái</th>
                                            <th className="py-3.5 px-4 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {filteredItems.map((item) => {
                                            const formattedDate = new Date(item.createdAt).toLocaleString('vi-VN')
                                            const isPaid = item.status === 'PAID'
                                            const isRejected = item.status === 'REJECTED'
                                            const isPending = item.status === 'REQUESTED'

                                            return (
                                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-4 px-4 font-bold text-foreground">
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-bold text-foreground">
                                                                {item.shopName || 'Cửa hàng đối tác'}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground font-mono">
                                                                ID: {item.walletId.slice(-8)}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <p className="text-sm font-extrabold text-foreground">
                                                            {formatCurrencyVND(Number(item.amount))}
                                                        </p>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                                                <span>{item.bankName}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        copyToClipboard(item.bankAccountNumber, item.id)
                                                                    }
                                                                    className="h-5 px-1.5 py-0 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-muted/60 rounded text-[11px] font-mono"
                                                                    title="Sao chép số tài khoản"
                                                                >
                                                                    {copiedId === item.id ? (
                                                                        <Check className="size-3 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="size-3" />
                                                                    )}
                                                                    <span>{item.bankAccountNumber}</span>
                                                                </Button>
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                                                                Chủ TK: {item.bankAccountName}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-muted-foreground">{formattedDate}</td>
                                                    <td className="py-4 px-4">
                                                        <div className="space-y-1">
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
                                                                    ? 'Đã chi trả'
                                                                    : isRejected
                                                                      ? 'Đã từ chối'
                                                                      : 'Chờ duyệt'}
                                                            </Badge>
                                                            {item.rejectReason && (
                                                                <p className="text-[11px] text-destructive max-w-xs truncate">
                                                                    Lý do: {item.rejectReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {isPending ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedWithdrawal(item)
                                                                        setIsApproveOpen(true)
                                                                    }}
                                                                    className="h-7 px-2.5 rounded-lg text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 font-semibold gap-1"
                                                                >
                                                                    <CheckCircle2 className="size-3.5" />
                                                                    <span>Duyệt chi</span>
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedWithdrawal(item)
                                                                        setIsRejectOpen(true)
                                                                    }}
                                                                    className="h-7 px-2.5 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold gap-1"
                                                                >
                                                                    <XCircle className="size-3.5" />
                                                                    <span>Từ chối</span>
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-muted-foreground font-medium">
                                                                Đã hoàn tất
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog: Xác nhận duyệt chi */}
                <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                    <DialogContent className="rounded-2xl max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold flex items-center gap-2">
                                <CheckCircle2 className="size-5 text-emerald-500" />
                                <span>Xác nhận đã giải ngân tiền rút</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Hãy đảm bảo rằng bạn đã thực hiện lệnh chuyển khoản ngân hàng thành công đến người nhận
                                trước khi xác nhận.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedWithdrawal && (
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Người bán:</span>
                                    <span className="font-bold text-foreground">
                                        {selectedWithdrawal.shopName || 'Cửa hàng'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số tiền:</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                        {formatCurrencyVND(Number(selectedWithdrawal.amount))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ngân hàng:</span>
                                    <span className="font-semibold text-foreground">{selectedWithdrawal.bankName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số tài khoản:</span>
                                    <span className="font-mono font-bold text-foreground">
                                        {selectedWithdrawal.bankAccountNumber}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Chủ tài khoản:</span>
                                    <span className="font-bold uppercase text-foreground">
                                        {selectedWithdrawal.bankAccountName}
                                    </span>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                className="rounded-xl text-xs"
                                onClick={() => setIsApproveOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                disabled={approveMutation.isPending}
                                onClick={() => {
                                    if (selectedWithdrawal) {
                                        approveMutation.mutate(selectedWithdrawal.id)
                                    }
                                }}
                            >
                                {approveMutation.isPending && <Spinner className="size-3.5 mr-2" />}
                                Xác nhận đã chi trả
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog: Từ chối yêu cầu rút tiền */}
                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                    <DialogContent className="rounded-2xl max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                                <AlertCircle className="size-5" />
                                <span>Từ chối yêu cầu rút tiền</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Khi từ chối, toàn bộ số tiền{' '}
                                {selectedWithdrawal && formatCurrencyVND(Number(selectedWithdrawal.amount))} sẽ được tự
                                động hoàn trả lại số dư khả dụng vào ví của người bán.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-1">
                            <FloatInput
                                id="reject-reason"
                                label="Lý do từ chối (bắt buộc)"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Sai tên chủ tài khoản ngân hàng',
                                    'Số tài khoản không tồn tại',
                                    'Ngân hàng thụ hưởng đang bảo trì',
                                    'Tài khoản shop có dấu hiệu vi phạm',
                                ].map((reason) => (
                                    <Button
                                        key={reason}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRejectReason(reason)}
                                        className="h-6 text-[11px] px-2 py-0 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                                    >
                                        {reason}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                className="rounded-xl text-xs"
                                onClick={() => setIsRejectOpen(false)}
                            >
                                Đóng
                            </Button>
                            <Button
                                variant="destructive"
                                className="rounded-xl text-xs font-bold"
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                onClick={() => {
                                    if (selectedWithdrawal) {
                                        rejectMutation.mutate({
                                            id: selectedWithdrawal.id,
                                            reason: rejectReason.trim(),
                                        })
                                    }
                                }}
                            >
                                {rejectMutation.isPending && <Spinner className="size-3.5 mr-2" />}
                                Xác nhận từ chối & hoàn tiền
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PageContainer>
    )
}
