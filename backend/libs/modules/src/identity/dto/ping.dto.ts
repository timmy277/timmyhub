import { z } from 'zod'

// Ví dụ tối giản — nghiệp vụ thật sẽ dùng nestjs-zod theo coding-standards.md §3.
export const PingResponseSchema = z.object({
    module: z.literal('identity'),
    status: z.literal('ok'),
})

export type PingResponse = z.infer<typeof PingResponseSchema>
