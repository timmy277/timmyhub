import { z } from 'zod'

// Luật #1 CLAUDE.md: tiền truyền qua API là chuỗi decimal + currency, không dùng number.
export const MoneySchema = z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'validation.priceInvalid'),
    currency: z.literal('VND').default('VND'),
})

export type Money = z.infer<typeof MoneySchema>
