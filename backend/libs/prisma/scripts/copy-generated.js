/**
 * Copy src/generated/ → dist/generated/ sau `tsc`.
 * Prisma generate tạo ra .js + .d.ts đã compiled sẵn trong src/generated/ — tsc không emit
 * các file này vào dist/ (chỉ compile .ts → .js/.d.ts). Không copy thì @timmyhub/modules
 * resolve @timmyhub/prisma → dist/index.d.ts → ./generated/prisma/client (không tồn tại) → TS2305.
 */
const { cpSync, existsSync, mkdirSync } = require('node:fs')
const path = require('node:path')

const srcDir = path.resolve(__dirname, '..', 'src', 'generated')
const destDir = path.resolve(__dirname, '..', 'dist', 'generated')

if (!existsSync(srcDir)) {
    console.warn('⚠️  src/generated/ không tồn tại — chạy: pnpm --filter @timmyhub/prisma prisma:generate')
    process.exit(0)
}

mkdirSync(path.dirname(destDir), { recursive: true })
cpSync(srcDir, destDir, { recursive: true })
console.log('✅ Copied src/generated/ → dist/generated/')
