-- Đổi tên vai trò người mua CUSTOMER → USER và thêm MODERATOR để enum Prisma khớp `UserRole` của @timmyhub/contracts.
-- Viết tay: `prisma migrate dev` sẽ sinh DROP/CREATE TYPE (mất dữ liệu cột users.roles) thay vì RENAME VALUE.

-- RENAME VALUE giữ nguyên OID của giá trị enum, nên mọi dòng users.roles đang chứa CUSTOMER tự thành USER.
ALTER TYPE "UserRole" RENAME VALUE 'CUSTOMER' TO 'USER';

-- Giá trị mới thêm không được dùng trong cùng transaction — migration này không dùng MODERATOR ở câu nào bên dưới.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';

-- Default vốn tham chiếu theo OID nên đã tự đổi, đặt lại tường minh để khớp @default([USER]) trong schema.
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['USER']::"UserRole"[];

-- SystemRole (lớp 2) lưu tên role dạng TEXT, không đi theo enum — đổi tay.
-- Trường hợp 1: chưa có dòng USER → đổi tên dòng CUSTOMER, giữ nguyên id nên mọi gán quyền/gán người dùng còn nguyên.
UPDATE "system_roles"
SET "name" = 'USER', "displayName" = 'Người dùng', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'CUSTOMER'
    AND NOT EXISTS (SELECT 1 FROM "system_roles" WHERE "name" = 'USER');

-- Trường hợp 2: đã có cả USER lẫn CUSTOMER (seed mới chạy trước migration) → chuyển người dùng sang USER rồi xoá
-- CUSTOMER. Quyền của USER do seed tính lại từ PERMISSION_DEFINITIONS nên không cần chép role_permissions.
INSERT INTO "user_system_roles" ("userId", "roleId")
SELECT assigned."userId", target."id"
FROM "user_system_roles" AS assigned
JOIN "system_roles" AS legacy ON legacy."id" = assigned."roleId" AND legacy."name" = 'CUSTOMER'
CROSS JOIN "system_roles" AS target
WHERE target."name" = 'USER'
ON CONFLICT DO NOTHING;

DELETE FROM "system_roles"
WHERE "name" = 'CUSTOMER'
    AND EXISTS (SELECT 1 FROM "system_roles" WHERE "name" = 'USER');
