import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { Observable } from 'rxjs'

import type { AuditRequestContext } from '../../../identity/audit-context'
import { runWithAuditContext } from '../../../identity/audit-context'

// Nạp IP + User-Agent vào ngữ cảnh audit cho mọi request. Đặt ở platform vì đây là mối quan tâm xuyên suốt hệ thống,
// không riêng identity — mọi service ghi audit đều cần cùng hai trường này.
//
// `runWithAuditContext` bọc cả chuỗi xử lý request (next.handle() trả Observable được subscribe trong ngữ cảnh này),
// nên thao tác ghi audit ở tầng repository sâu bên dưới vẫn đọc được ngữ cảnh.
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<{
            ip?: string
            headers?: Record<string, string | string[] | undefined>
            socket?: { remoteAddress?: string }
        }>()

        const forwardedFor = request.headers?.['x-forwarded-for']
        const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]

        const rawUserAgent = request.headers?.['user-agent']
        const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent

        const auditContext: AuditRequestContext = {
            // Sau reverse proxy, `request.ip` là IP của proxy — ưu tiên `x-forwarded-for` khi có, nếu không lấy
            // `request.ip` rồi tới địa chỉ socket thô. Cắt khoảng trắng vì header có thể là "ip1, ip2".
            actorIp: forwardedIp?.trim() || request.ip || request.socket?.remoteAddress || null,
            userAgent: userAgent ?? null,
        }

        return runWithAuditContext(auditContext, () => next.handle())
    }
}
