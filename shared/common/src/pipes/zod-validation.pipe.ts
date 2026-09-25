import type { PipeTransform } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { ZodType } from 'zod'

import { ApiError } from '@timmyhub/contracts'

import { toValidationIssues } from '../utils/index'

// Luật #15 CLAUDE.md: zod là nguồn validation duy nhất. Dùng pipe riêng theo schema thay vì
// nestjs-zod vì repo chưa xác nhận nestjs-zod tương thích zod v4 — tránh gamble phụ thuộc.
// Pipe không biết locale: chỉ gắn khoá thông điệp vào từng issue, ApiExceptionFilter dịch.
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
    // ===== Dependencies =====
    constructor(private readonly schema: ZodType<T>) {}

    // ===== Commands =====
    transform(value: unknown): T {
        const result = this.schema.safeParse(value)
        if (!result.success) {
            throw new ApiError('VALIDATION_FAILED', { details: toValidationIssues(result.error.issues) })
        }
        return result.data
    }
}
