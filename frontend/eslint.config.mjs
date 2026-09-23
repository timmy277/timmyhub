import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Quy ước thư mục FE (coding-standards §6): chỉ import qua barrel gốc (`@/hooks`, `@/stores`…), không
    // import thẳng file con. `components/ui` do shadcn CLI sinh nên được miễn. `import()` động (next/dynamic
    // cho thư viện nặng, luật 12) không bị luật này kiểm.
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/**'],
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
