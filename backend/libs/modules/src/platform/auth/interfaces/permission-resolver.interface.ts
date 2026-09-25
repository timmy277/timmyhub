// Cổng để platform/auth (guard, checker) hỏi quyền mà không phụ thuộc code của domain identity. Platform khai báo
// interface + token, identity cung cấp bản hiện thực (RbacService) qua DI — chiều phụ thuộc mã nguồn chỉ còn
// identity → platform/auth, không còn platform/auth → identity.
export interface PermissionResolver {
    // Tập permission hiệu lực của user (role ∪ grant − deny), đã cache.
    getEffectivePermissions(userId: string): Promise<ReadonlySet<string>>
    // Danh sách permission đã seed trong DB — RbacConsistencyChecker đối chiếu lúc khởi động.
    listPermissions(): Promise<ReadonlyArray<{ name: string }>>
}
