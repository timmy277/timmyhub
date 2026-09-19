import { z } from 'zod'

export const PingResponseSchema = z.object({
    module: z.literal('catalog'),
    status: z.literal('ok'),
})

export type PingResponse = z.infer<typeof PingResponseSchema>
