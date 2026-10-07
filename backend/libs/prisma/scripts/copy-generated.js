/**
 * Copy src/generated/ → dist/generated/ sau `tsc`.
 * Prisma generate tạo ra .js + .d.ts đã compiled sẵn trong src/generated/ — tsc không emit
 * các file này vào dist/ (chỉ compile .ts → .js/.d.ts). Không copy thì @timmyhub/modules
 * resolve @timmyhub/prisma → dist/index.d.ts → ./generated/prisma/client (không tồn tại) → TS2305.
 */
const { cpSync, existsSync, mkdirSync, readdirSync, statSync } = require('node:fs')
const path = require('node:path')

const srcDir = path.resolve(__dirname, '..', 'src', 'generated')
const destDir = path.resolve(__dirname, '..', 'dist', 'generated')

if (!existsSync(srcDir)) {
    console.warn('⚠️  src/generated/ không tồn tại — chạy: pnpm --filter @timmyhub/prisma prisma:generate')
    process.exit(0)
}

mkdirSync(path.dirname(destDir), { recursive: true })

// cpSync có thể fail trên Windows khi copy binary DLL bị lock (EPERM/EPIPE).
// Copy từng file, skip binary .node/.dll — chỉ cần .js + .d.ts cho type-check/build downstream.
function copyDir(src, dest) {
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true })
    for (const entry of readdirSync(src)) {
        const srcPath = path.join(src, entry)
        const destPath = path.join(dest, entry)
        const stat = statSync(srcPath)
        if (stat.isDirectory()) {
            copyDir(srcPath, destPath)
        } else if (entry.endsWith('.node') || entry.endsWith('.dll') || entry.endsWith('.wasm')) {
            // Skip binary — không cần cho tsc/type-check, tránh lock trên Windows.
            continue
        } else {
            try {
                cpSync(srcPath, destPath)
            } catch {
                // Ignore个别文件 lock — không ảnh hưởng type resolution.
            }
        }
    }
}

copyDir(srcDir, destDir)
console.log('✅ Copied src/generated/ → dist/generated/')
