// Danh mục permission chuẩn tắc — nguồn sự thật là docs/00-overview/roles-and-permissions.md §4.
// Đây là nơi DUY NHẤT liệt kê permission dạng `module:resource:action[:any]` (CLAUDE.md luật #15, ADR-0010):
// - Backend: @Permissions(...) chỉ nhận PermissionName (literal union) — gõ sai/permission chưa khai báo là lỗi biên dịch.
// - `prisma/seed.ts` của @timmyhub/prisma seed thẳng từ PERMISSION_DEFINITIONS, không tự chép tay danh sách riêng.
// - `check-permissions-consistency` (RbacConsistencyChecker) đối chiếu metadata @Permissions với PERMISSION_NAMES lúc khởi động.
//
// Vai trò hệ thống seed sẵn trong repo này (khác enum UserRole của FE hiển thị "USER" → ở đây là CUSTOMER):
// SUPER_ADMIN, ADMIN, MODERATOR, SELLER, BRAND, CUSTOMER, SHIPPER.
export type SystemRoleName = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SELLER' | 'BRAND' | 'CUSTOMER' | 'SHIPPER'

export type PermissionDefinition = {
    name: string
    displayName: string
    module: string
    resource: string
    action: string
    // role mặc định được seed permission này qua RolePermission (SUPER_ADMIN luôn bypass, không cần liệt kê).
    defaultRoles: SystemRoleName[]
}

function perm(
    module: string,
    resource: string,
    action: string,
    displayName: string,
    defaultRoles: SystemRoleName[],
): PermissionDefinition {
    const name = [module, resource, action].join(':')
    return { name, displayName, module, resource, action, defaultRoles }
}

// §4.1 identity
const IDENTITY = [
    perm('identity', 'users', 'list', 'Xem danh sách người dùng', ['ADMIN']),
    perm('identity', 'users', 'read', 'Xem chi tiết người dùng', ['ADMIN']),
    perm('identity', 'users', 'create', 'Tạo người dùng', ['ADMIN']),
    perm('identity', 'users', 'update', 'Cập nhật người dùng', ['ADMIN']),
    perm('identity', 'users', 'delete', 'Xoá người dùng', ['SUPER_ADMIN']),
    perm('identity', 'users', 'lock', 'Khoá / mở khoá tài khoản', ['ADMIN']),
    perm('identity', 'users', 'assign-role', 'Gán vai trò cho người dùng', ['SUPER_ADMIN']),
    perm('identity', 'devices', 'list:any', 'Xem thiết bị của người dùng khác', ['ADMIN']),
    perm('identity', 'devices', 'revoke:any', 'Thu hồi phiên của người dùng khác', ['ADMIN']),
    perm('identity', 'sessions', 'stats', 'Xem thống kê phiên/token', ['ADMIN']),
]

// §4.2 rbac
const RBAC = [
    perm('rbac', 'roles', 'list', 'Xem danh sách vai trò', ['ADMIN']),
    perm('rbac', 'roles', 'read', 'Xem chi tiết vai trò', ['ADMIN']),
    perm('rbac', 'roles', 'create', 'Tạo vai trò', ['SUPER_ADMIN']),
    perm('rbac', 'roles', 'update', 'Sửa vai trò', ['SUPER_ADMIN']),
    perm('rbac', 'roles', 'delete', 'Xoá vai trò', ['SUPER_ADMIN']),
    perm('rbac', 'permissions', 'list', 'Xem danh sách quyền', ['ADMIN']),
    perm('rbac', 'permissions', 'read', 'Xem chi tiết quyền', ['ADMIN']),
    perm('rbac', 'permissions', 'create', 'Tạo quyền', ['SUPER_ADMIN']),
    perm('rbac', 'permissions', 'update', 'Sửa quyền', ['SUPER_ADMIN']),
    perm('rbac', 'permissions', 'delete', 'Xoá quyền', ['SUPER_ADMIN']),
    perm('rbac', 'role-permissions', 'assign', 'Gán quyền cho vai trò', ['SUPER_ADMIN']),
    perm('rbac', 'user-permissions', 'assign', 'Gán / khước từ quyền trực tiếp cho người dùng', ['SUPER_ADMIN']),
]

// §4.3 seller
const SELLER = [
    perm('seller', 'applications', 'list', 'Xem đơn đăng ký bán hàng', ['ADMIN']),
    perm('seller', 'applications', 'read', 'Xem chi tiết đơn đăng ký', ['ADMIN']),
    perm('seller', 'applications', 'approve', 'Duyệt đơn đăng ký', ['ADMIN']),
    perm('seller', 'applications', 'reject', 'Từ chối đơn đăng ký', ['ADMIN']),
    perm('seller', 'shops', 'update', 'Cập nhật shop của mình', ['SELLER', 'BRAND']),
    perm('seller', 'shops', 'update:any', 'Cập nhật shop bất kỳ', ['ADMIN']),
    perm('seller', 'shops', 'suspend', 'Tạm ngưng shop', ['ADMIN']),
    perm('seller', 'brands', 'create', 'Tạo thương hiệu', ['BRAND']),
    perm('seller', 'brands', 'update', 'Sửa thương hiệu', ['BRAND']),
    perm('seller', 'brands', 'delete', 'Xoá thương hiệu', ['BRAND']),
]

// §4.4 catalog
const CATALOG = [
    perm('catalog', 'categories', 'create', 'Tạo danh mục', ['ADMIN']),
    perm('catalog', 'categories', 'update', 'Sửa danh mục', ['ADMIN']),
    perm('catalog', 'categories', 'delete', 'Xoá danh mục', ['ADMIN']),
    perm('catalog', 'products', 'create', 'Tạo sản phẩm', ['SELLER', 'BRAND']),
    perm('catalog', 'products', 'update', 'Sửa sản phẩm của mình', ['SELLER', 'BRAND']),
    perm('catalog', 'products', 'delete', 'Xoá sản phẩm của mình', ['SELLER', 'BRAND']),
    perm('catalog', 'products', 'update:any', 'Sửa sản phẩm bất kỳ', ['ADMIN']),
    perm('catalog', 'products', 'delete:any', 'Xoá sản phẩm bất kỳ', ['ADMIN']),
    perm('catalog', 'products', 'list:any', 'Xem toàn bộ sản phẩm kể cả chưa duyệt', ['ADMIN']),
    perm('catalog', 'products', 'approve', 'Duyệt sản phẩm', ['ADMIN', 'MODERATOR']),
    perm('catalog', 'products', 'reject', 'Từ chối sản phẩm', ['ADMIN', 'MODERATOR']),
    perm('catalog', 'products', 'import', 'Nhập sản phẩm hàng loạt', ['SELLER']),
    perm('catalog', 'products', 'export', 'Xuất sản phẩm hàng loạt', ['SELLER']),
    perm('catalog', 'inventory', 'read', 'Xem tồn kho của mình', ['SELLER']),
    perm('catalog', 'inventory', 'adjust', 'Điều chỉnh tồn kho của mình', ['SELLER']),
    perm('catalog', 'inventory', 'read:any', 'Xem tồn kho toàn sàn', ['ADMIN']),
]

// §4.5 cart · orders
const CART_ORDERS = [
    perm('cart', 'items', 'manage', 'Thao tác giỏ hàng của mình', ['CUSTOMER']),
    perm('orders', 'orders', 'create', 'Đặt đơn', ['CUSTOMER']),
    perm('orders', 'orders', 'read', 'Xem đơn của mình', ['CUSTOMER']),
    perm('orders', 'orders', 'list:any', 'Xem mọi đơn', ['ADMIN']),
    perm('orders', 'orders', 'read:any', 'Xem chi tiết đơn bất kỳ', ['ADMIN']),
    perm('orders', 'orders', 'list:shop', 'Xem đơn thuộc shop của mình', ['SELLER']),
    perm('orders', 'orders', 'process', 'Chuyển trạng thái đơn', ['ADMIN', 'SELLER']),
    perm('orders', 'orders', 'cancel', 'Huỷ đơn của mình', ['CUSTOMER']),
    perm('orders', 'orders', 'cancel:any', 'Huỷ đơn bất kỳ', ['ADMIN']),
    perm('orders', 'shipping', 'update', 'Cập nhật trạng thái giao đơn được gán', ['SHIPPER']),
    perm('orders', 'orders', 'export', 'Xuất danh sách đơn', ['SELLER', 'ADMIN']),
]

// §4.6 payment · wallet
const PAYMENT_WALLET = [
    perm('payment', 'transactions', 'list:any', 'Xem mọi giao dịch', ['ADMIN']),
    perm('payment', 'refund', 'create', 'Tạo hoàn tiền', ['ADMIN']),
    perm('payment', 'reconciliation', 'run', 'Chạy đối soát', ['ADMIN']),
    perm('payment', 'reconciliation', 'read', 'Xem đối soát', ['ADMIN']),
    perm('wallet', 'balance', 'read', 'Xem ví của mình', ['SELLER']),
    perm('wallet', 'transactions', 'list', 'Xem sổ giao dịch ví của mình', ['SELLER']),
    perm('wallet', 'withdrawals', 'create', 'Tạo yêu cầu rút tiền', ['SELLER']),
    perm('wallet', 'withdrawals', 'approve', 'Duyệt yêu cầu rút tiền', ['ADMIN']),
    perm('wallet', 'withdrawals', 'reject', 'Từ chối yêu cầu rút tiền', ['ADMIN']),
    perm('wallet', 'commission', 'configure', 'Cấu hình tỉ lệ hoa hồng', ['SUPER_ADMIN']),
]

// §4.7 promotion
const PROMOTION = [
    perm('promotion', 'vouchers', 'create', 'Tạo voucher phạm vi shop', ['SELLER']),
    perm('promotion', 'vouchers', 'update', 'Sửa voucher phạm vi shop', ['SELLER']),
    perm('promotion', 'vouchers', 'delete', 'Xoá voucher phạm vi shop', ['SELLER']),
    perm('promotion', 'vouchers', 'create:any', 'Tạo voucher toàn sàn', ['ADMIN']),
    perm('promotion', 'vouchers', 'update:any', 'Sửa voucher toàn sàn', ['ADMIN']),
    perm('promotion', 'vouchers', 'delete:any', 'Xoá voucher toàn sàn', ['ADMIN']),
    perm('promotion', 'vouchers', 'list:any', 'Xem mọi voucher', ['ADMIN']),
    perm('promotion', 'campaigns', 'create', 'Quản lý chiến dịch', ['ADMIN']),
    perm('promotion', 'campaigns', 'update', 'Sửa chiến dịch', ['ADMIN']),
    perm('promotion', 'campaigns', 'delete', 'Xoá chiến dịch', ['ADMIN']),
    perm('promotion', 'campaigns', 'enroll', 'Đăng ký sản phẩm vào chiến dịch', ['SELLER']),
    perm('promotion', 'campaigns', 'approve', 'Duyệt sản phẩm tham gia chiến dịch', ['ADMIN']),
]

// §4.8 content · ads
const CONTENT_ADS = [
    perm('content', 'posts', 'create', 'Tạo bài đăng của mình', ['SELLER']),
    perm('content', 'posts', 'update', 'Sửa bài đăng của mình', ['SELLER']),
    perm('content', 'posts', 'delete', 'Xoá bài đăng của mình', ['SELLER']),
    perm('content', 'posts', 'moderate', 'Duyệt / từ chối / gỡ bài đăng', ['ADMIN', 'MODERATOR']),
    perm('content', 'comments', 'delete:any', 'Xoá bình luận bất kỳ', ['ADMIN']),
    perm('content', 'reports', 'list', 'Xem báo cáo vi phạm', ['ADMIN']),
    perm('content', 'reports', 'resolve', 'Xử lý báo cáo vi phạm', ['ADMIN']),
    perm('ads', 'campaigns', 'create', 'Tạo chiến dịch quảng cáo của mình', ['SELLER']),
    perm('ads', 'campaigns', 'update', 'Sửa chiến dịch quảng cáo của mình', ['SELLER']),
    perm('ads', 'campaigns', 'pause', 'Tạm dừng chiến dịch quảng cáo của mình', ['SELLER']),
    perm('ads', 'campaigns', 'approve', 'Duyệt quảng cáo', ['ADMIN', 'MODERATOR']),
    perm('ads', 'campaigns', 'reject', 'Từ chối quảng cáo', ['ADMIN', 'MODERATOR']),
    perm('ads', 'campaigns', 'list:any', 'Xem mọi chiến dịch quảng cáo', ['ADMIN']),
]

// §4.9 engagement · chat · notification
const ENGAGEMENT_CHAT_NOTIFICATION = [
    perm('engagement', 'reviews', 'create', 'Viết đánh giá', ['CUSTOMER']),
    perm('engagement', 'reviews', 'reply', 'Phản hồi đánh giá trên shop của mình', ['SELLER']),
    perm('engagement', 'reviews', 'moderate', 'Ẩn / khôi phục đánh giá', ['ADMIN', 'MODERATOR']),
    perm('chat', 'conversations', 'read:any', 'Xem hội thoại bất kỳ (xử lý tranh chấp)', ['ADMIN']),
    perm('chat', 'tickets', 'assign', 'Gán ticket hỗ trợ', ['ADMIN']),
    perm('chat', 'tickets', 'resolve', 'Xử lý ticket hỗ trợ', ['ADMIN']),
    perm('notification', 'broadcast', 'send', 'Gửi thông báo hàng loạt', ['ADMIN']),
    perm('notification', 'templates', 'manage', 'Quản lý template thông báo', ['ADMIN']),
]

// §4.10 search · media · analytics · audit · masterdata
const SEARCH_MEDIA_ANALYTICS_AUDIT_MASTERDATA = [
    perm('search', 'index', 'reindex', 'Chạy reindex', ['ADMIN']),
    perm('media', 'files', 'upload', 'Tải tệp lên', ['CUSTOMER']),
    perm('media', 'files', 'delete:any', 'Xoá tệp bất kỳ', ['ADMIN']),
    perm('analytics', 'shop', 'read', 'Xem báo cáo shop của mình', ['SELLER']),
    perm('analytics', 'platform', 'read', 'Xem báo cáo toàn sàn', ['ADMIN']),
    perm('analytics', 'reports', 'export', 'Xuất báo cáo', ['SELLER', 'ADMIN']),
    perm('audit', 'logs', 'list', 'Tra cứu audit log', ['ADMIN']),
    perm('audit', 'logs', 'read', 'Xem chi tiết audit log', ['ADMIN']),
    perm('audit', 'logs', 'export', 'Xuất audit log', ['SUPER_ADMIN']),
    perm('masterdata', 'config', 'read', 'Xem cấu hình hệ thống', ['SUPER_ADMIN']),
    perm('masterdata', 'config', 'update', 'Sửa cấu hình hệ thống', ['SUPER_ADMIN']),
    perm('masterdata', 'feature-flags', 'update', 'Bật/tắt feature flag', ['SUPER_ADMIN']),
    perm('masterdata', 'shipping-rates', 'update', 'Cập nhật bảng phí vận chuyển', ['ADMIN']),
]

// Nguồn duy nhất — mọi nơi khác (guard, seed, RbacConsistencyChecker) đọc từ đây, không tự liệt kê lại.
export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
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
]

export const PERMISSION_NAMES = PERMISSION_DEFINITIONS.map((p) => p.name) as [string, ...string[]]

// Union kiểu literal — @Permissions('identity:users:create') sai chính tả là lỗi biên dịch, không phải lỗi runtime.
export type PermissionName = (typeof PERMISSION_DEFINITIONS)[number]['name']
