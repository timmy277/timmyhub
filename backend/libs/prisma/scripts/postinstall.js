/**
 * Chạy sau `prisma generate` (đã sinh qua script `prepare` bên dưới nếu cần).
 * Chỉ áp migration khi có DATABASE_URL (đọc từ backend/apps/api/.env) — CI/máy chưa cấu hình DB thì bỏ qua,
 * không làm fail `pnpm install`. Dùng `prisma migrate deploy` (không phải `db push`), đúng quy ước
 * data-architecture.md §5: chỉ áp migration đã có sẵn trong thư mục migrations/, không tạo/đổi schema ngầm.
 */
const { existsSync } = require('node:fs')
const { execSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const apiEnvPath = path.resolve(root, '../../apps/api/.env')

if (existsSync(apiEnvPath)) {
    require('dotenv').config({ path: apiEnvPath })
}

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '')

if (!hasDb) {
    console.log('⏭️  Không có DATABASE_URL (backend/apps/api/.env) — bỏ qua prisma migrate deploy (OK cho CI).')
    process.exit(0)
}

try {
    console.log('📦 Prisma generate...')
    execSync('pnpm exec prisma generate --schema=./prisma/schema', { cwd: root, stdio: 'inherit' })

    console.log('🚀 Prisma migrate deploy...')
    execSync('pnpm exec prisma migrate deploy --schema=./prisma/schema', { cwd: root, stdio: 'inherit' })

    console.log('✅ Postinstall (db) done.')
} catch {
    console.warn('⚠️  Postinstall migrate deploy thất bại (kiểm tra DATABASE_URL). Chạy tay: pnpm run db:setup')
    process.exit(0) // không làm fail install
}
