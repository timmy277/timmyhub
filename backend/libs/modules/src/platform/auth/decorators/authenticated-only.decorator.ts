import { SetMetadata } from '@nestjs/common'

export const AUTHENTICATED_ONLY_KEY = 'authenticatedOnly'

// Đánh dấu endpoint chỉ cần phiên hợp lệ, không đòi permission cụ thể — dùng cho thao tác "xem của chính mình"
// (vd. effective-permissions) nơi service tự quyết định phạm vi và trả 404 khi ngoài phạm vi.
//
// Có nhãn này thì PermissionsGuard cho qua. Thiếu CẢ nhãn này lẫn `@Permissions()` là lỗi cấu hình: guard từ chối
// (fail-closed) và RbacConsistencyChecker chặn service khởi động, để một endpoint quên khai quyền không thể lọt ra.
export const AuthenticatedOnly = () => SetMetadata(AUTHENTICATED_ONLY_KEY, true)
