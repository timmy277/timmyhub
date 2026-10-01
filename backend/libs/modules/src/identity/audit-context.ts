import { AsyncLocalStorage } from 'node:async_hooks'

// Ngữ cảnh request cho audit trail. ADR-0011 chốt dùng `nestjs-cls` (AsyncLocalStorage) để mang `actorId`/`requestId`
// xuyên suốt request; đây là bản tối giản của cùng ý tưởng, chỉ giữ đúng hai trường mà bảng AuditLog cần ghi
// (`actorIp`, `userAgent`) — không thêm dependency khi chưa cần `traceId`/`requestId` xuyên service.
//
// Vì sao phải là ALS chứ không truyền tham số: `writeAuditLog` nằm sâu trong repository, gọi trong transaction
// nghiệp vụ ở nhiều chỗ (rbac, users). Luồn thêm `context` qua từng chữ ký hàm sẽ đụng ~15 call site và cả
// controller → service → repository, trong khi thông tin này chỉ có ở tầng HTTP. ALS để tầng dưới đọc thẳng.
export type AuditRequestContext = {
    actorIp: string | null
    userAgent: string | null
}

const storage = new AsyncLocalStorage<AuditRequestContext>()

// Chạy `callback` trong ngữ cảnh request. Interceptor gọi hàm này để mọi thao tác ghi bên trong đều đọc được IP/UA.
export function runWithAuditContext<T>(context: AuditRequestContext, callback: () => T): T {
    return storage.run(context, callback)
}

// Đọc ngữ cảnh hiện tại. Trả `null` khi chạy ngoài request (worker, seed, cron) — khi đó audit entry không có IP/UA,
// đúng như thiết kế: bảng cho phép null cho hành động không đến từ HTTP.
export function getAuditContext(): AuditRequestContext | null {
    return storage.getStore() ?? null
}
