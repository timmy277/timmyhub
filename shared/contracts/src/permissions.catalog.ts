// Danh mục permission chuẩn tắc — nguồn sự thật là docs/00-overview/roles-and-permissions.md §4.
// Đây là nơi DUY NHẤT liệt kê permission dạng `module:resource:action[:any]` (CLAUDE.md luật #15, ADR-0010):
// - Backend: @Permissions(...) chỉ nhận PermissionName (literal union) — gõ sai/permission chưa khai báo là lỗi biên dịch.
// - `prisma/seed.ts` của @timmyhub/prisma seed thẳng từ PERMISSION_DEFINITIONS, không tự chép tay danh sách riêng.
// - `check-permissions-consistency` (RbacConsistencyChecker) đối chiếu metadata @Permissions với PERMISSION_NAMES lúc khởi động.
// Vai trò lấy từ `UserRole` (roles.ts) — không gõ chuỗi role trần.
import { UserRole } from './roles'

export type PermissionDefinition<TName extends string = string> = {
    name: TName
    displayName: string
    module: string
    resource: string
    // action có thể kèm hậu tố phạm vi, ví dụ `list:any` → name `identity:devices:list:any`.
    action: string
    // role mặc định được seed permission này qua RolePermission (SUPER_ADMIN luôn bypass, không cần liệt kê).
    defaultRoles: readonly UserRole[]
}

// Tham số `const` giữ literal để `name` có kiểu `${module}:${resource}:${action}` thay vì `string`.
function perm<const M extends string, const R extends string, const A extends string>(
    module: M,
    resource: R,
    action: A,
    displayName: string,
    defaultRoles: readonly UserRole[],
): PermissionDefinition<`${M}:${R}:${A}`> {
    const name = `${module}:${resource}:${action}` as const
    return { name, displayName, module, resource, action, defaultRoles }
}

// §4.1 identity
const IDENTITY = [
    perm('identity', 'users', 'list', 'Xem danh sách người dùng', [UserRole.ADMIN]),
    perm('identity', 'users', 'read', 'Xem chi tiết người dùng', [UserRole.ADMIN]),
    perm('identity', 'users', 'create', 'Tạo người dùng', [UserRole.ADMIN]),
    perm('identity', 'users', 'update', 'Cập nhật người dùng', [UserRole.ADMIN]),
    perm('identity', 'users', 'delete', 'Xoá người dùng', [UserRole.SUPER_ADMIN]),
    perm('identity', 'users', 'lock', 'Khoá / mở khoá tài khoản', [UserRole.ADMIN]),
    perm('identity', 'users', 'assign-role', 'Gán vai trò cho người dùng', [UserRole.SUPER_ADMIN]),
    perm('identity', 'devices', 'list:any', 'Xem thiết bị của người dùng khác', [UserRole.ADMIN]),
    perm('identity', 'devices', 'revoke:any', 'Thu hồi phiên của người dùng khác', [UserRole.ADMIN]),
    perm('identity', 'sessions', 'stats', 'Xem thống kê phiên/token', [UserRole.ADMIN]),
]

// §4.2 rbac
const RBAC = [
    perm('rbac', 'roles', 'list', 'Xem danh sách vai trò', [UserRole.ADMIN]),
    perm('rbac', 'roles', 'read', 'Xem chi tiết vai trò', [UserRole.ADMIN]),
    perm('rbac', 'roles', 'create', 'Tạo vai trò', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'roles', 'update', 'Sửa vai trò', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'roles', 'delete', 'Xoá vai trò', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'permissions', 'list', 'Xem danh sách quyền', [UserRole.ADMIN]),
    perm('rbac', 'permissions', 'read', 'Xem chi tiết quyền', [UserRole.ADMIN]),
    perm('rbac', 'permissions', 'create', 'Tạo quyền', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'permissions', 'update', 'Sửa quyền', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'permissions', 'delete', 'Xoá quyền', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'role-permissions', 'assign', 'Gán quyền cho vai trò', [UserRole.SUPER_ADMIN]),
    perm('rbac', 'user-permissions', 'assign', 'Gán / khước từ quyền trực tiếp cho người dùng', [UserRole.SUPER_ADMIN]),
]

// §4.3 seller
const SELLER = [
    perm('seller', 'applications', 'list', 'Xem đơn đăng ký bán hàng', [UserRole.ADMIN]),
    perm('seller', 'applications', 'read', 'Xem chi tiết đơn đăng ký', [UserRole.ADMIN]),
    perm('seller', 'applications', 'approve', 'Duyệt đơn đăng ký', [UserRole.ADMIN]),
    perm('seller', 'applications', 'reject', 'Từ chối đơn đăng ký', [UserRole.ADMIN]),
    perm('seller', 'shops', 'update', 'Cập nhật shop của mình', [UserRole.SELLER, UserRole.BRAND]),
    perm('seller', 'shops', 'update:any', 'Cập nhật shop bất kỳ', [UserRole.ADMIN]),
    perm('seller', 'shops', 'suspend', 'Tạm ngưng shop', [UserRole.ADMIN]),
    perm('seller', 'brands', 'create', 'Tạo thương hiệu', [UserRole.BRAND]),
    perm('seller', 'brands', 'update', 'Sửa thương hiệu', [UserRole.BRAND]),
    perm('seller', 'brands', 'delete', 'Xoá thương hiệu', [UserRole.BRAND]),
]

// §4.4 catalog
const CATALOG = [
    perm('catalog', 'categories', 'create', 'Tạo danh mục', [UserRole.ADMIN]),
    perm('catalog', 'categories', 'update', 'Sửa danh mục', [UserRole.ADMIN]),
    perm('catalog', 'categories', 'delete', 'Xoá danh mục', [UserRole.ADMIN]),
    perm('catalog', 'products', 'create', 'Tạo sản phẩm', [UserRole.SELLER, UserRole.BRAND]),
    perm('catalog', 'products', 'update', 'Sửa sản phẩm của mình', [UserRole.SELLER, UserRole.BRAND]),
    perm('catalog', 'products', 'delete', 'Xoá sản phẩm của mình', [UserRole.SELLER, UserRole.BRAND]),
    perm('catalog', 'products', 'update:any', 'Sửa sản phẩm bất kỳ', [UserRole.ADMIN]),
    perm('catalog', 'products', 'delete:any', 'Xoá sản phẩm bất kỳ', [UserRole.ADMIN]),
    perm('catalog', 'products', 'list:any', 'Xem toàn bộ sản phẩm kể cả chưa duyệt', [UserRole.ADMIN]),
    perm('catalog', 'products', 'approve', 'Duyệt sản phẩm', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('catalog', 'products', 'reject', 'Từ chối sản phẩm', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('catalog', 'products', 'import', 'Nhập sản phẩm hàng loạt', [UserRole.SELLER]),
    perm('catalog', 'products', 'export', 'Xuất sản phẩm hàng loạt', [UserRole.SELLER]),
    perm('catalog', 'inventory', 'read', 'Xem tồn kho của mình', [UserRole.SELLER]),
    perm('catalog', 'inventory', 'adjust', 'Điều chỉnh tồn kho của mình', [UserRole.SELLER]),
    perm('catalog', 'inventory', 'read:any', 'Xem tồn kho toàn sàn', [UserRole.ADMIN]),
]

// §4.5 cart · orders
const CART_ORDERS = [
    perm('cart', 'items', 'manage', 'Thao tác giỏ hàng của mình', [UserRole.USER]),
    perm('orders', 'orders', 'create', 'Đặt đơn', [UserRole.USER]),
    perm('orders', 'orders', 'read', 'Xem đơn của mình', [UserRole.USER]),
    perm('orders', 'orders', 'list:any', 'Xem mọi đơn', [UserRole.ADMIN]),
    perm('orders', 'orders', 'read:any', 'Xem chi tiết đơn bất kỳ', [UserRole.ADMIN]),
    perm('orders', 'orders', 'list:shop', 'Xem đơn thuộc shop của mình', [UserRole.SELLER]),
    perm('orders', 'orders', 'process', 'Chuyển trạng thái đơn', [UserRole.ADMIN, UserRole.SELLER]),
    perm('orders', 'orders', 'cancel', 'Huỷ đơn của mình', [UserRole.USER]),
    perm('orders', 'orders', 'cancel:any', 'Huỷ đơn bất kỳ', [UserRole.ADMIN]),
    perm('orders', 'shipping', 'update', 'Cập nhật trạng thái giao đơn được gán', [UserRole.SHIPPER]),
    perm('orders', 'orders', 'export', 'Xuất danh sách đơn', [UserRole.SELLER, UserRole.ADMIN]),
]

// §4.6 payment · wallet
const PAYMENT_WALLET = [
    perm('payment', 'transactions', 'list:any', 'Xem mọi giao dịch', [UserRole.ADMIN]),
    perm('payment', 'refund', 'create', 'Tạo hoàn tiền', [UserRole.ADMIN]),
    perm('payment', 'reconciliation', 'run', 'Chạy đối soát', [UserRole.ADMIN]),
    perm('payment', 'reconciliation', 'read', 'Xem đối soát', [UserRole.ADMIN]),
    perm('wallet', 'balance', 'read', 'Xem ví của mình', [UserRole.SELLER]),
    perm('wallet', 'transactions', 'list', 'Xem sổ giao dịch ví của mình', [UserRole.SELLER]),
    perm('wallet', 'withdrawals', 'create', 'Tạo yêu cầu rút tiền', [UserRole.SELLER]),
    perm('wallet', 'withdrawals', 'approve', 'Duyệt yêu cầu rút tiền', [UserRole.ADMIN]),
    perm('wallet', 'withdrawals', 'reject', 'Từ chối yêu cầu rút tiền', [UserRole.ADMIN]),
    perm('wallet', 'commission', 'configure', 'Cấu hình tỉ lệ hoa hồng', [UserRole.SUPER_ADMIN]),
]

// §4.7 promotion
const PROMOTION = [
    perm('promotion', 'vouchers', 'create', 'Tạo voucher phạm vi shop', [UserRole.SELLER]),
    perm('promotion', 'vouchers', 'update', 'Sửa voucher phạm vi shop', [UserRole.SELLER]),
    perm('promotion', 'vouchers', 'delete', 'Xoá voucher phạm vi shop', [UserRole.SELLER]),
    perm('promotion', 'vouchers', 'create:any', 'Tạo voucher toàn sàn', [UserRole.ADMIN]),
    perm('promotion', 'vouchers', 'update:any', 'Sửa voucher toàn sàn', [UserRole.ADMIN]),
    perm('promotion', 'vouchers', 'delete:any', 'Xoá voucher toàn sàn', [UserRole.ADMIN]),
    perm('promotion', 'vouchers', 'list:any', 'Xem mọi voucher', [UserRole.ADMIN]),
    perm('promotion', 'campaigns', 'create', 'Quản lý chiến dịch', [UserRole.ADMIN]),
    perm('promotion', 'campaigns', 'update', 'Sửa chiến dịch', [UserRole.ADMIN]),
    perm('promotion', 'campaigns', 'delete', 'Xoá chiến dịch', [UserRole.ADMIN]),
    perm('promotion', 'campaigns', 'enroll', 'Đăng ký sản phẩm vào chiến dịch', [UserRole.SELLER]),
    perm('promotion', 'campaigns', 'approve', 'Duyệt sản phẩm tham gia chiến dịch', [UserRole.ADMIN]),
]

// §4.8 content · ads
const CONTENT_ADS = [
    perm('content', 'posts', 'create', 'Tạo bài đăng của mình', [UserRole.SELLER]),
    perm('content', 'posts', 'update', 'Sửa bài đăng của mình', [UserRole.SELLER]),
    perm('content', 'posts', 'delete', 'Xoá bài đăng của mình', [UserRole.SELLER]),
    perm('content', 'posts', 'moderate', 'Duyệt / từ chối / gỡ bài đăng', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('content', 'comments', 'delete:any', 'Xoá bình luận bất kỳ', [UserRole.ADMIN]),
    perm('content', 'reports', 'list', 'Xem báo cáo vi phạm', [UserRole.ADMIN]),
    perm('content', 'reports', 'resolve', 'Xử lý báo cáo vi phạm', [UserRole.ADMIN]),
    perm('ads', 'campaigns', 'create', 'Tạo chiến dịch quảng cáo của mình', [UserRole.SELLER]),
    perm('ads', 'campaigns', 'update', 'Sửa chiến dịch quảng cáo của mình', [UserRole.SELLER]),
    perm('ads', 'campaigns', 'pause', 'Tạm dừng chiến dịch quảng cáo của mình', [UserRole.SELLER]),
    perm('ads', 'campaigns', 'approve', 'Duyệt quảng cáo', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('ads', 'campaigns', 'reject', 'Từ chối quảng cáo', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('ads', 'campaigns', 'list:any', 'Xem mọi chiến dịch quảng cáo', [UserRole.ADMIN]),
]

// §4.9 engagement · chat · notification
const ENGAGEMENT_CHAT_NOTIFICATION = [
    perm('engagement', 'reviews', 'create', 'Viết đánh giá', [UserRole.USER]),
    perm('engagement', 'reviews', 'reply', 'Phản hồi đánh giá trên shop của mình', [UserRole.SELLER]),
    perm('engagement', 'reviews', 'moderate', 'Ẩn / khôi phục đánh giá', [UserRole.ADMIN, UserRole.MODERATOR]),
    perm('chat', 'conversations', 'read:any', 'Xem hội thoại bất kỳ (xử lý tranh chấp)', [UserRole.ADMIN]),
    perm('chat', 'tickets', 'assign', 'Gán ticket hỗ trợ', [UserRole.ADMIN]),
    perm('chat', 'tickets', 'resolve', 'Xử lý ticket hỗ trợ', [UserRole.ADMIN]),
    perm('notification', 'broadcast', 'send', 'Gửi thông báo hàng loạt', [UserRole.ADMIN]),
    perm('notification', 'templates', 'manage', 'Quản lý template thông báo', [UserRole.ADMIN]),
]

// §4.10 search · media · analytics · audit · masterdata
const SEARCH_MEDIA_ANALYTICS_AUDIT_MASTERDATA = [
    perm('search', 'index', 'reindex', 'Chạy reindex', [UserRole.ADMIN]),
    perm('media', 'files', 'upload', 'Tải tệp lên', [UserRole.USER, UserRole.SELLER, UserRole.BRAND]),
    perm('media', 'files', 'confirm', 'Xác nhận upload presigned', [UserRole.USER, UserRole.SELLER, UserRole.BRAND]),
    perm('media', 'files', 'list', 'Xem danh sách tệp đã upload', [UserRole.USER, UserRole.SELLER, UserRole.ADMIN]),
    perm('media', 'files', 'read', 'Xem chi tiết tệp', [UserRole.USER, UserRole.SELLER, UserRole.ADMIN]),
    perm('media', 'files', 'delete:any', 'Xoá tệp bất kỳ', [UserRole.ADMIN]),
    perm('analytics', 'shop', 'read', 'Xem báo cáo shop của mình', [UserRole.SELLER]),
    perm('analytics', 'platform', 'read', 'Xem báo cáo toàn sàn', [UserRole.ADMIN]),
    perm('analytics', 'reports', 'export', 'Xuất báo cáo', [UserRole.SELLER, UserRole.ADMIN]),
    perm('audit', 'logs', 'list', 'Tra cứu audit log', [UserRole.ADMIN]),
    perm('audit', 'logs', 'read', 'Xem chi tiết audit log', [UserRole.ADMIN]),
    perm('audit', 'logs', 'export', 'Xuất audit log', [UserRole.SUPER_ADMIN]),
    perm('masterdata', 'config', 'read', 'Xem cấu hình hệ thống', [UserRole.SUPER_ADMIN]),
    perm('masterdata', 'config', 'update', 'Sửa cấu hình hệ thống', [UserRole.SUPER_ADMIN]),
    perm('masterdata', 'feature-flags', 'update', 'Bật/tắt feature flag', [UserRole.SUPER_ADMIN]),
    perm('masterdata', 'shipping-rates', 'update', 'Cập nhật bảng phí vận chuyển', [UserRole.ADMIN]),
]

// Nguồn duy nhất — mọi nơi khác (guard, seed, RbacConsistencyChecker) đọc từ đây, không tự liệt kê lại.
export const PERMISSION_DEFINITIONS = [
    ...IDENTITY,
    ...RBAC,
    ...SELLER,
    ...CATALOG,
    ...CART_ORDERS,
    ...PAYMENT_WALLET,
    ...PROMOTION,
    ...CONTENT_ADS,
    ...ENGAGEMENT_CHAT_NOTIFICATION,
    ...SEARCH_MEDIA_ANALYTICS_AUDIT_MASTERDATA,
] as const

// Union kiểu literal — @Permissions('identity:users:create') sai chính tả là lỗi biên dịch, không phải lỗi runtime.
export type PermissionName = (typeof PERMISSION_DEFINITIONS)[number]['name']

export const PERMISSION_NAMES = PERMISSION_DEFINITIONS.map((p) => p.name) as [PermissionName, ...PermissionName[]]

export function isPermissionName(value: string): value is PermissionName {
    return (PERMISSION_NAMES as readonly string[]).includes(value)
}
