import { z } from 'zod'

// Luật #1 CLAUDE.md: tiền truyền qua API là chuỗi decimal + currency, không dùng number.
export const MoneySchema = z.object({
    amount: z.string().regex(/^\d+\.\d{2}$/, 'amount phải là chuỗi decimal 2 chữ số thập phân'),
    currency: z.literal('VND'),
})

export type Money = z.infer<typeof MoneySchema>
