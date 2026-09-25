import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Quy ước thư mục FE (coding-standards §6): chỉ import qua barrel gốc (`@/hooks`, `@/stores`…), không
    // import thẳng file con. Chỉ `components/ui` được miễn, vì mọi file trong đó do shadcn CLI sinh (ADR-0006).
    // Component dự án tự viết (field `float-*`, `ag-grid-table`…) nằm ở `components/common` và vẫn bị kiểm.
    // `import()` động (next/dynamic cho thư viện nặng, luật 12) không bị luật này kiểm.
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/*.tsx', 'src/components/ui/index.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@/components/*/*',
                                '@/constants/*',
                                '@/hooks/*',
                                '@/schemas/*',
                                '@/services/*',
                                '@/stores/*',
                                '@/types/*',
                                '@/utils/*',
                                '@/config/*',
                                '@/mocks/*',
                                '@/features/*/*',
                            ],
                            message:
                                'Import qua barrel gốc (vd `@/hooks`, `@/features/<name>`), không import thẳng file con.',
                        },
                    ],
                },
            ],
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
])

export default eslintConfig
