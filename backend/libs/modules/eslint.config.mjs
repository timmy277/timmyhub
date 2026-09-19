// @ts-check
// Kế thừa cấu hình chung ở backend/eslint.config.mjs, thêm rule chặn import chéo giữa các module domain:
// module domain khác không được import thẳng file nội bộ (controller/service/repository/dto/events)
// của một domain khác, chỉ được import qua index.ts (barrel) của domain đó — theo coding-standards.md §3
// và ADR-0015 §"Ranh giới module".
//
// Ghi chú: đã thử eslint-plugin-boundaries (rule "entry-point"), nhưng rule đó đã deprecated và không
// bắt được vi phạm thử nghiệm (đã kiểm chứng bằng cách cố tình import sai rồi chạy eslint). Dùng thẳng
// "no-restricted-imports" của ESLint lõi cho chắc chắn, đơn giản và dễ kiểm chứng hơn.
import base from '../../eslint.config.mjs'

export default [
    ...base,
    {
        files: ['src/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['../*/*', '!../*/index'],
                            message:
                                'Chỉ được import module domain khác qua index.ts (barrel), không import thẳng file nội bộ (controller/service/repository/dto/events).',
                        },
                    ],
                },
            ],
        },
    },
]
