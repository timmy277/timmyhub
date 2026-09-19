// @ts-check
// Cấu hình ESLint dùng chung cho mọi package backend (apps/api, apps/worker, libs/prisma).
// backend/libs/modules có thêm eslint.config.mjs riêng (import mảng này rồi bổ sung rule boundaries)
// vì đó là package duy nhất cần chặn import chéo giữa các module domain.
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

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
                tsconfigRootDir: import.meta.dirname,
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
)
