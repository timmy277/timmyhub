const path = require('node:path')

// Test của tầng nghiệp vụ nằm cạnh mã nguồn trong `backend/libs/modules` (assets co-located), không nằm ở apps/api —
// `roots` trỏ sang đó để `pnpm -C backend/apps/api test` chạy được cả hai. Jest + ts-jest đã có trong devDependencies
// của apps/api, không thêm phụ thuộc mới.
/** @type {import('jest').Config} */
module.exports = {
    rootDir: __dirname,
    testEnvironment: 'node',
    roots: ['<rootDir>/src', path.join(__dirname, '..', '..', 'libs', 'modules', 'src')],
    testMatch: ['**/*.spec.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: path.join(__dirname, 'tsconfig.spec.json') }],
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
}
