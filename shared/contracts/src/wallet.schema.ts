import { z } from 'zod'

export const TransactionTypeSchema = z.enum([
    'DEPOSIT',
    'WITHDRAWAL',
    'PAYMENT',
    'REFUND',
    'SALE_INCOME',
    'COMMISSION',
    'REWARD',
    'FEE',
])

export type TransactionType = z.infer<typeof TransactionTypeSchema>

export const WalletTransactionDetailSchema = z.object({
    id: z.string(),
    type: TransactionTypeSchema,
    amount: z.string(),
    balanceAfter: z.string(),
    description: z.string().nullable().optional(),
    referenceKey: z.string(),
    createdAt: z.string(),
})

export type WalletTransactionDetail = z.infer<typeof WalletTransactionDetailSchema>

export const WalletDetailSchema = z.object({
    id: z.string(),
    sellerId: z.string().nullable().optional(),
    buyerId: z.string().nullable().optional(),
    availableBalance: z.string(),
    holdBalance: z.string(),
    currency: z.string().default('VND'),
    createdAt: z.string(),
    updatedAt: z.string(),
    recentTransactions: z.array(WalletTransactionDetailSchema).default([]),
})

export type WalletDetail = z.infer<typeof WalletDetailSchema>

export const CreateWithdrawalInputSchema = z.object({
    amount: z.number().min(50000, 'Số tiền rút tối thiểu là 50.000₫'),
    bankName: z.string().min(2, 'Vui lòng nhập tên ngân hàng'),
    bankAccountNumber: z.string().min(6, 'Số tài khoản không hợp lệ'),
    bankAccountName: z.string().min(2, 'Tên chủ tài khoản không hợp lệ'),
})

export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalInputSchema>

export const WithdrawalDetailSchema = z.object({
    id: z.string(),
    walletId: z.string(),
    amount: z.string(),
    bankName: z.string(),
    bankAccountNumber: z.string(),
    bankAccountName: z.string(),
    status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'PAID']),
    rejectReason: z.string().nullable().optional(),
    shopName: z.string().optional(),
    processedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export type WithdrawalDetail = z.infer<typeof WithdrawalDetailSchema>
