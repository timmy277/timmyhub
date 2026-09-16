/**
 * Quy ước commit: Conventional Commits, tiêu đề tiếng Việt, scope tiếng Anh.
 * Chi tiết và ví dụ: docs/06-quality/git-hooks.md
 */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'revert', 'style'],
        ],
        'scope-empty': [2, 'never'],
        'scope-enum': [
            2,
            'always',
            [
                // service (docs/01-architecture/service-catalog.md)
                'gateway',
                'identity',
                'seller',
                'catalog',
                'cart',
                'order',
                'payment',
                'promotion',
                'content',
                'engagement',
                'chat',
                'notification',
                'search',
                'media',
                'media-worker',
                'analytics',
                'audit',
                'masterdata',
                // package dùng chung
                'contracts',
                'common',
                'rmq',
                // khác
                'frontend',
                'docs',
                'infra',
                'ci',
                'deps',
            ],
        ],
        'subject-case': [0], // tiêu đề tiếng Việt, không ép kiểu chữ
        'subject-max-length': [2, 'always', 72],
        'body-max-line-length': [2, 'always', 100],
    },
}
