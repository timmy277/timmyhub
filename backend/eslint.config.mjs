// @ts-check
// Cấu hình ESLint dùng chung cho mọi package backend (apps/api, apps/worker, libs/prisma).
// backend/libs/modules có thêm eslint.config.mjs riêng (import mảng này rồi bổ sung rule boundaries)
// vì đó là package duy nhất cần chặn import chéo giữa các module domain.
import { fileURLToPath } from 'node:url'

import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const configDir = fileURLToPath(new URL('.', import.meta.url))

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/generated/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: configDir,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            'no-console': 'error',
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    {
        // Script seed chạy tay/CI qua tsx, không phải đường xử lý request — log tiến trình ra console là hợp lý.
        files: ['**/prisma/seed.ts', '**/prisma/seeds/**/*.ts'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        // Chính file eslint.config.mjs (và bản của libs/modules import nó) không thuộc include của tsconfig nào
        // — tắt hẳn rule cần type-check cho các file này thay vì gán project mặc định (dễ ra sai "error typed value").
        files: ['**/eslint.config.mjs'],
        ...tseslint.configs.disableTypeChecked,
    },
)
